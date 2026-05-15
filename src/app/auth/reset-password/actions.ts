"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { roleForRedirect } from "@/lib/auth/redirects";
import { getProfile } from "@/lib/auth/getProfile";

export async function updatePassword(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password !== confirm) redirect("/auth/reset-password?error=mismatch");
  if (password.length < 8) redirect("/auth/reset-password?error=too_short");

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.updateUser({ password });

  if (error || !data.user) redirect("/auth/reset-password?error=failed");

  const profile = await getProfile(data.user!.id);
  revalidatePath("/", "layout");
  redirect(roleForRedirect(profile?.role ?? null));
}
