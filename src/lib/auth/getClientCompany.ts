import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getClientCompany(clientId: string | null): Promise<string | null> {
  if (!clientId) return null;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("clients")
    .select("company")
    .eq("id", clientId)
    .single();
  return data?.company ?? null;
}
