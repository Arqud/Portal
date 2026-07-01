"use server";

import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// Persists the chosen theme: always to the cookie (drives no-flash SSR), and
// best-effort to profiles.theme for cross-device sync. Never throws to the client
// — if the profiles.theme column doesn't exist yet, the cookie still works.
export async function saveThemePreference(theme: "light" | "dark") {
  const safe = theme === "light" ? "light" : "dark";
  const jar = await cookies();
  jar.set("theme", safe, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const admin = createSupabaseAdminClient();
      await admin.from("profiles").update({ theme: safe }).eq("id", user.id);
    }
  } catch {
    /* column may not exist yet; cookie is already set */
  }
}
