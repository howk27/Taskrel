import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import { confirmationMatches, QUOTE_LOGOS_BUCKET } from "@/lib/account/delete-account";
import { DOCUMENTS_BUCKET } from "@/lib/documents/archive-document";

// Uses the Supabase admin API + Stripe; needs the Node runtime.
export const runtime = "nodejs";
export const maxDuration = 30;

const LIST_PAGE = 100;

/**
 * Recursively lists every object path under a prefix in a Storage bucket.
 * Supabase `list()` is one level deep and returns synthetic folder entries
 * (no `id`), so we walk into those. The admin (service-role) client bypasses
 * RLS, so this sees all of the contractor's objects.
 */
async function listAllObjectPaths(
  admin: SupabaseClient,
  bucket: string,
  prefix: string,
): Promise<string[]> {
  const files: string[] = [];
  const dirs = [prefix];

  while (dirs.length > 0) {
    const dir = dirs.pop() as string;
    let offset = 0;
    for (;;) {
      const { data, error } = await admin.storage
        .from(bucket)
        .list(dir, { limit: LIST_PAGE, offset });
      if (error) throw new Error(`list ${bucket}/${dir}: ${error.message}`);
      if (!data || data.length === 0) break;

      for (const entry of data) {
        const path = `${dir}/${entry.name}`;
        // Files have an id + metadata; folder placeholders do not.
        if (entry.id === null || entry.id === undefined) {
          dirs.push(path);
        } else {
          files.push(path);
        }
      }

      if (data.length < LIST_PAGE) break;
      offset += LIST_PAGE;
    }
  }

  return files;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  if (!confirmationMatches(body?.confirmEmail, user.email ?? "")) {
    return NextResponse.json(
      { error: "Type your account email exactly to confirm deletion." },
      { status: 400 },
    );
  }

  // contractor.id scopes the contractor's Storage folders.
  const { data: contractor } = await supabase
    .from("contractors")
    .select("id, stripe_customer_id")
    .eq("user_id", user.id)
    .single();

  let admin: SupabaseClient;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json(
      { error: "Account deletion is not configured. Contact support@taskrel.com." },
      { status: 500 },
    );
  }

  // 1) Purge Storage objects FIRST, while the contractor folder still maps to
  // this account. DB cascade does NOT remove Storage objects, so this is the
  // only place the archived client-PII PDFs get deleted. If it fails we abort
  // BEFORE deleting the auth user, so PII is never orphaned with no owner.
  if (contractor?.id) {
    try {
      for (const bucket of [DOCUMENTS_BUCKET, QUOTE_LOGOS_BUCKET]) {
        const paths = await listAllObjectPaths(admin, bucket, contractor.id);
        if (paths.length > 0) {
          const { error } = await admin.storage.from(bucket).remove(paths);
          if (error) throw new Error(`remove ${bucket}: ${error.message}`);
        }
      }
    } catch (err) {
      console.error("Account deletion: storage purge failed", {
        message: err instanceof Error ? err.message : "unknown",
      });
      return NextResponse.json(
        {
          error:
            "Could not delete your stored documents. Nothing was removed — please try again or contact support@taskrel.com.",
        },
        { status: 500 },
      );
    }
  }

  // 2) Best-effort: cancel any active Stripe subscription so a deleted account
  // is not billed. Never block deletion on a Stripe failure.
  const stripe = getStripe();
  if (stripe && contractor?.stripe_customer_id) {
    try {
      const subs = await stripe.subscriptions.list({
        customer: contractor.stripe_customer_id,
        status: "active",
        limit: 100,
      });
      for (const sub of subs.data) {
        await stripe.subscriptions.cancel(sub.id);
      }
    } catch (err) {
      console.error("Account deletion: Stripe cancel failed (continuing)", {
        message: err instanceof Error ? err.message : "unknown",
      });
    }
  }

  // 3) Delete the auth user → cascades every DB row owned by this account
  // (contractor + clients, quotes, invoices, jobs, pricing, documents) via the
  // existing ON DELETE CASCADE foreign keys.
  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) {
    console.error("Account deletion: auth user delete failed", {
      message: deleteError.message,
    });
    return NextResponse.json(
      { error: "Could not finish deleting your account. Contact support@taskrel.com." },
      { status: 500 },
    );
  }

  // 4) Clear the now-orphaned session cookies. Best-effort.
  await supabase.auth.signOut().catch(() => {});

  return NextResponse.json({ ok: true });
}
