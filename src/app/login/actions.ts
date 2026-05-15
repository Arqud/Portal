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

  let supabase;
  try {
    supabase = await createSupabaseServerClient();
  } catch {
    redirect("/login?error=server_error");
  }

  const { data, error } = await supabase!.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    // Auth failed — wrong password or unconfirmed email
    redirect(
      `/login?error=invalid_credentials${next ? `&next=${encodeURIComponent(next)}` : ""}`,
    );
  }

  // Auth succeeded — look up role via admin client (bypasses RLS)
  const admin = createSupabaseAdminClient();
  const { data: profileData, error: profileError } = await admin
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();

  if (profileError || !profileData) {
    // Profile missing — show a specific error so we can diagnose
    redirect("/login?error=no_profile");
  }

  revalidatePath("/", "layout");
  redirect(next || roleForRedirect(profileData.role));
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
