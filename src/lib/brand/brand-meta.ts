export type Brand = "arqud" | "wewash" | "sparkling" | "neutral";

export interface BrandMeta {
  key: Brand;
  name: string;
  tagline: string;
  description: string; // link-preview / meta description
  themeColor: string;
  iconDir: string; // absolute public path, e.g. "/brand/arqud"
}

export const BRANDS: Record<Brand, BrandMeta> = {
  arqud: { key: "arqud", name: "ARQUD Portal", tagline: "Agency command center", description: "Agency dashboard and client portal.", themeColor: "#0b0b0c", iconDir: "/brand/arqud" },
  wewash: { key: "wewash", name: "We Wash Cars", tagline: "Premium mobile valet", description: "We Wash Cars — leads & bookings dashboard.", themeColor: "#0b0b0c", iconDir: "/brand/wewash" },
  sparkling: { key: "sparkling", name: "Sparkling Auto Care Centres", tagline: "Premium auto detailing", description: "Sparkling Auto Care — leads & bookings dashboard.", themeColor: "#0b0b0c", iconDir: "/brand/sparkling" },
  // Brand-agnostic identity for a client whose portal serves MULTIPLE brands
  // (Arno = We Wash + Sparkling): a plain "Client Portal" card with no sub-brand
  // and — crucially — no ARQUD, so the agency tool is never exposed on his link.
  neutral: { key: "neutral", name: "Client Portal", tagline: "Leads & campaign dashboard", description: "Leads & campaign dashboard.", themeColor: "#0b0b0c", iconDir: "/brand/neutral" },
};

// admin -> ARQUD; brand-scoped staff -> their brand; a client with no brand
// (Arno / Sparkling Investment Group) -> Sparkling. Called only for signed-in
// users; logged-out surfaces use the ARQUD root default.
export function resolveBrand(input: { role?: string | null; brand?: string | null }): Brand {
  if (input.role === "admin") return "arqud";
  const b = (input.brand ?? "").toLowerCase();
  if (b.includes("we wash") || b.includes("wewash")) return "wewash";
  if (b.includes("sparkling")) return "sparkling";
  return "sparkling"; // Arno: client, no brand
}

// Anonymous surfaces (the login page, and link-preview crawlers like WhatsApp)
// have NO session, so brand can't come from the user — it's resolved from the
// request HOST instead. A brand subdomain maps to its brand; the apex + anything
// else falls back to ARQUD. Arno's portal serves BOTH his brands, so his `arno.`
// subdomain wears the neutral "Client Portal" identity (never ARQUD).
export function resolveBrandFromHost(host: string | null | undefined): Brand {
  const sub = (host ?? "").toLowerCase().split(":")[0].split(".")[0];
  if (sub === "arno") return "neutral";
  if (sub === "wewash" || sub === "wewashcars") return "wewash";
  if (sub === "sparkling") return "sparkling";
  return "arqud";
}
