import { createClient } from "@/lib/supabase";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB

export async function uploadImageToSupabase(file: File | Blob): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Solo se permiten archivos de imagen.");
  }
  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error("La imagen no puede superar 10 MB.");
  }

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
