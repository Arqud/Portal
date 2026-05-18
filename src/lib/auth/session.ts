import { cache } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { type Profile } from "@/lib/auth/getProfile";
import { roleForRedirect } from "@/lib/auth/redirects";

type Role = "admin" | "client";

// Cache per-request so multiple verifySession calls on the same page only hit DB once
const getSessionOnce = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, profile: null };

  const admin = createSupabaseAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role, full_name, client_id")
    .eq("id", user.id)
    .single();

  return { user, profile: profile as Profile | null };
});

export async function verifySession(
  requiredRole: Role,
): Promise<{ user: { id: string; email?: string }; profile: Profile }> {
  const { user, profile } = await getSessionOnce();

  if (!user) redirect("/login");
  if (!profile) redirect("/login");
  if (profile.role !== requiredRole) redirect(roleForRedirect(profile.role));

  return { user, profile };
}
