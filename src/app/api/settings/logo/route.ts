import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const bucketName = "quote-logos";
const allowedTypes = new Map([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
]);
const maxLogoBytes = 2 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: contractor } = await supabase
    .from("contractors")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!contractor) return NextResponse.json({ error: "Contractor not found" }, { status: 404 });

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Choose a logo image to upload." }, { status: 400 });
  }

  const extension = allowedTypes.get(file.type);
  if (!extension) {
    return NextResponse.json({ error: "Logo must be a PNG, JPG, WebP, or GIF." }, { status: 400 });
  }

  if (file.size > maxLogoBytes) {
    return NextResponse.json({ error: "Logo must be 2MB or smaller." }, { status: 400 });
  }

  const path = `${contractor.id}/quote-logo-${Date.now()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from(bucketName)
    .upload(path, file, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: publicUrl } = supabase.storage.from(bucketName).getPublicUrl(path);
  const logoUrl = publicUrl.publicUrl;

  const { error: updateError } = await supabase
    .from("contractors")
    .update({ logo_url: logoUrl })
    .eq("id", contractor.id);

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  revalidatePath("/settings");
  revalidatePath("/quotes");
  return NextResponse.json({ logo_url: logoUrl });
}
