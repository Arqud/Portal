"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { businessKey, type BusinessKey } from "@/lib/business/persist";
import { ACTIVE_BUSINESS_COOKIE } from "@/lib/business/active";

// Set which business workspace the admin is "in". Purely a view preference — it
// re-themes and re-scopes the admin chrome, but the books stay one company and
// every document's business is still derived server-side from its client (the
// wall). revalidatePath re-renders the admin layout tree with the new cookie.
export async function setActiveBusiness(key: BusinessKey): Promise<void> {
  const value = businessKey(key);
  (await cookies()).set(ACTIVE_BUSINESS_COOKIE, value, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  revalidatePath("/admin", "layout");
}
