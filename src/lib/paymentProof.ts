import { supabase } from "@/lib/supabase";

const BUCKET = "payment-proofs";
const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

export function paymentProofStoragePath(userId: string, orderId: string, file: File) {
  const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  return `${userId}/${orderId}/${Date.now()}.${ext}`;
}

export async function uploadPaymentProof(userId: string, orderId: string, file: File) {
  if (!ALLOWED.includes(file.type) && !file.type.startsWith("image/")) {
    throw new Error("Please upload a screenshot (JPG or PNG)");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Image is too large (max 8 MB)");
  }

  const path = paymentProofStoragePath(userId, orderId, file);
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || "image/jpeg",
  });
  if (error) throw error;
  return path;
}

export async function getPaymentProofUrl(path: string) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}
