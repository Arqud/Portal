"use server";

import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function saveSetting(key: string, value: string): Promise<{ ok: boolean; error?: string }> {
  await verifySession("admin");
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("app_settings")
    .upsert({ key, value: value.trim(), updated_at: new Date().toISOString() });
  if (error) {
    // Most likely: table not created yet — surface a friendly hint.
    return { ok: false, error: "Couldn't save — run the app_settings setup SQL in Supabase, then try again." };
  }
  revalidatePath("/admin/settings");
  revalidatePath("/admin/calendar");
  revalidatePath("/admin/overview");
  return { ok: true };
}
