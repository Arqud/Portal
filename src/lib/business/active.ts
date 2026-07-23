import { cookies } from "next/headers";
import { businessKey, type BusinessKey } from "./persist";

// The admin's ACTIVE workspace — which of the two businesses the back office is
// currently "in". This is a display/scoping preference only (a cookie); it never
// widens access. The customer-facing wall (business derived from the client on
// writes) and RLS on reads are what actually keep the two businesses apart.
export const ACTIVE_BUSINESS_COOKIE = "active_business";

/** The admin's currently-active workspace. Defaults to ARQUD (no cookie). Server-only. */
export async function getActiveBusiness(): Promise<BusinessKey> {
  const value = (await cookies()).get(ACTIVE_BUSINESS_COOKIE)?.value;
  return businessKey(value);
}
