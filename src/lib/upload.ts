import { supabase } from "@/lib/supabase";

export async function uploadProductImages(files: File[], folder = "products") {
  const urls: string[] = [];
  for (const file of files) {
    if (!file.type.startsWith("image/")) {
      throw new Error(`“${file.name}” is not an image`);
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new Error(`“${file.name}” is larger than 5 MB`);
    }
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${folder}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });
    if (error) throw error;
    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    urls.push(data.publicUrl);
  }
  return urls;
}

export async function uploadCategoryImage(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error(`“${file.name}” is not an image`);
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error(`“${file.name}” is larger than 5 MB`);
  }
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${crypto.randomUUID()}.${ext}`;

  let { error } = await supabase.storage.from("category-images").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  });

  if (error) {
    // Fallback if category-images bucket is not created yet
    const fallback = `categories/${path}`;
    const retry = await supabase.storage.from("product-images").upload(fallback, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });
    if (retry.error) throw retry.error;
    return supabase.storage.from("product-images").getPublicUrl(fallback).data.publicUrl;
  }

  return supabase.storage.from("category-images").getPublicUrl(path).data.publicUrl;
}
