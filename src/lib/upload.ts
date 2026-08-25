import { supabase } from "@/lib/supabase";

export async function uploadAvatar(file: File, userId: string) {
  const mime = file.type || "image/jpeg";
  if (!mime.startsWith("image/") && !/\.(jpe?g|png|webp|gif|heic|heif)$/i.test(file.name)) {
    throw new Error(`“${file.name}” is not an image`);
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error(`File is larger than 5 MB`);
  }
  const ext =
    file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") ||
    mime.split("/")[1]?.replace("jpeg", "jpg") ||
    "jpg";
  const path = `${userId}/avatar.${ext}`;
  const { error } = await supabase.storage.from("avatars").upload(path, file, {
    cacheControl: "3600",
    upsert: true,
    contentType: mime.startsWith("image/") ? mime : "image/jpeg",
  });
  if (error) throw error;
  return `${supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl}?v=${Date.now()}`;
}

export async function uploadChatbotFile(file: File, folder: string) {
  if (file.size > 10 * 1024 * 1024) {
    throw new Error(`File is larger than 10 MB`);
  }
  const safe = file.name.replace(/[^\w.\-() ]+/g, "_").slice(0, 120);
  const path = `${folder}/${crypto.randomUUID()}-${safe}`;
  const { error } = await supabase.storage.from("chatbot-files").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || "application/octet-stream",
  });
  if (error) throw error;
  const url = supabase.storage.from("chatbot-files").getPublicUrl(path).data.publicUrl;
  return { url, name: file.name, mime: file.type || "application/octet-stream" };
}

export async function uploadChatFile(file: File, userId: string) {
  if (file.size > 15 * 1024 * 1024) {
    throw new Error(`File is larger than 15 MB`);
  }
  const safe = file.name.replace(/[^\w.\-() ]+/g, "_").slice(0, 120);
  const path = `${userId}/${crypto.randomUUID()}-${safe}`;
  const { error } = await supabase.storage.from("seller-chat-files").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || "application/octet-stream",
  });
  if (error) throw error;
  const url = supabase.storage.from("seller-chat-files").getPublicUrl(path).data.publicUrl;
  return { url, name: file.name, mime: file.type || "application/octet-stream" };
}

function isLikelyImage(file: File) {
  const mime = file.type || "";
  if (mime.startsWith("image/")) return true;
  // iOS / some Android cameras send empty MIME
  return /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(file.name) || mime === "";
}

export async function uploadProductImages(files: File[], folder = "products") {
  const urls: string[] = [];
  for (const file of files) {
    if (!isLikelyImage(file)) {
      throw new Error(`“${file.name || "file"}” is not an image`);
    }
    if (file.size > 8 * 1024 * 1024) {
      throw new Error(`“${file.name || "file"}” is larger than 8 MB`);
    }
    const mime = file.type.startsWith("image/") ? file.type : "image/jpeg";
    const ext =
      file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") ||
      mime.split("/")[1]?.replace("jpeg", "jpg") ||
      "jpg";
    const path = `${folder}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: mime,
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
