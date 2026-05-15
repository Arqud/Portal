"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { roleForRedirect } from "@/lib/auth/redirects";

export async function signInWithPassword(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "");

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    redirect(
      `/login?error=invalid_credentials${next ? `&next=${encodeURIComponent(next)}` : ""}`,
    );
  }

  // Use admin client to bypass RLS for the initial profile lookup
  const admin = createSupabaseAdminClient();
  const { data: profileData } = await admin
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();

  revalidatePath("/", "layout");
  redirect(next || roleForRedirect(profileData?.role ?? null));
}

export async function sendMagicLink(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const next = String(formData.get("next") ?? "");

  const supabase = await createSupabaseServerClient();
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "https://arqudportal.co.za";
  const redirectTo = `${origin}/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ""}`;

  await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } });

  redirect(`/login?magic=sent&email=${encodeURIComponent(email)}`);
}
