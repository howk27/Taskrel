import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { DOCUMENTS_BUCKET } from "@/lib/documents/archive-document";

const SIGNED_URL_EXPIRY_SECONDS = 3600;

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: contractor } = await supabase
    .from("contractors")
    .select("id")
    .eq("user_id", user.id)
    .single();
  if (!contractor) return NextResponse.json({ error: "Contractor not found" }, { status: 404 });

  const { data: doc } = await supabase
    .from("documents")
    .select("storage_path, file_name")
    .eq("contractor_id", contractor.id)
    .eq("entity_type", "quote")
    .eq("entity_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!doc) return NextResponse.json({ error: "No archived document found" }, { status: 404 });

  const { data: signed, error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(doc.storage_path, SIGNED_URL_EXPIRY_SECONDS, {
      download: doc.file_name,
    });

  if (error || !signed?.signedUrl) {
    return NextResponse.json({ error: "Could not generate download link" }, { status: 500 });
  }

  return NextResponse.redirect(signed.signedUrl);
}
