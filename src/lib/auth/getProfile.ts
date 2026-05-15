import { createSupabaseServerClient } from "@/lib/supabase/server";

export type Profile = {
  role: "admin" | "client";
  full_name: string | null;
  client_id: string | null;
};

export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("profiles")
    .select("role, full_name, client_id")
    .eq("id", userId)
    .single();
  return data ?? null;
}
