import { createClient } from "@/lib/supabase";

export async function uploadImageToSupabase(file: File | Blob): Promise<string> {
  const supabase = createClient();

  const ext = file instanceof File ? file.name.split(".").pop() : "png";
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage
    .from("journal_images")
    .upload(fileName, file, { contentType: file.type || "image/png" });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage
    .from("journal_images")
    .getPublicUrl(fileName);

  return data.publicUrl;
}
