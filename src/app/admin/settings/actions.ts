"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return { supabase, userId: user.id };
}

export async function updateProfile(formData: FormData) {
  const { userId } = await requireAdmin();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const admin = createSupabaseAdminClient();
  await admin.from("profiles").update({ full_name: fullName }).eq("id", userId);
  revalidatePath("/admin/settings");
}

export async function updatePassword(formData: FormData) {
  const { supabase } = await requireAdmin();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password !== confirm) throw new Error("Passwords do not match.");
  if (password.length < 8) throw new Error("Password must be at least 8 characters.");
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw new Error(error.message);
}

export async function uploadAvatar(formData: FormData) {
  const { userId } = await requireAdmin();
  const file = formData.get("file") as File | null;
  if (!file) throw new Error("No file provided");

  const admin = createSupabaseAdminClient();
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${userId}/avatar.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadErr } = await admin.storage
    .from("avatars")
    .upload(path, buffer, { contentType: file.type, upsert: true });

  if (uploadErr) throw new Error(uploadErr.message);

  const { data: { publicUrl } } = admin.storage.from("avatars").getPublicUrl(path);

  await admin.from("profiles").update({ avatar_url: `${publicUrl}?t=${Date.now()}` }).eq("id", userId);
  revalidatePath("/admin/settings");
  revalidatePath("/", "layout");
}
