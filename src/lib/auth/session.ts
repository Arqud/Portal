import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { roleForRedirect } from "./redirects";

export type Profile = {
  id: string;
  role: "admin" | "client";
  full_name: string | null;
  client_id: string | null;
  // When set ("We Wash" | "Sparkling"), this is a brand-scoped staff login:
  // leads are filtered to that brand and the portal is locked to the Leads page.
  brand: string | null;
};

export async function verifySession(expectedRole: "admin" | "client") {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, full_name, client_id, brand")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  if (profile.role !== expectedRole) {
    redirect(roleForRedirect(profile.role));
  }

  return { user, profile: profile as Profile };
}

export async function getSessionProfile(): Promise<Profile | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, full_name, client_id, brand")
    .eq("id", user.id)
    .single();

  return (profile as Profile) ?? null;
}
