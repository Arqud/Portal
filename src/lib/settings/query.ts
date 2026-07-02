import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// Resilient: before the app_settings migration runs (or when the key is
// missing) this returns null so callers can show a friendly prompt.
export async function getSetting(key: string): Promise<string | null> {
  try {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.from("app_settings").select("value").eq("key", key).maybeSingle();
    if (error) return null;
    return data?.value ?? null;
  } catch {
    return null;
  }
}
