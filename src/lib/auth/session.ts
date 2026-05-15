import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getProfile, type Profile } from "@/lib/auth/getProfile";
import { roleForRedirect } from "@/lib/auth/redirects";

type Role = "admin" | "client";

export async function verifySession(
  requiredRole: Role,
): Promise<{ user: { id: string; email?: string }; profile: Profile }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getProfile(user.id);

  if (!profile) {
    redirect("/login");
  }

  if (profile.role !== requiredRole) {
    redirect(roleForRedirect(profile.role));
  }

  return { user, profile };
}
