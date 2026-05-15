import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { roleForRedirect } from "@/lib/auth/redirects";
import { getProfile } from "@/lib/auth/getProfile";

export default async function RootPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getProfile(user.id);
  redirect(roleForRedirect(profile?.role ?? null));
}
