export type Brand = "arqud" | "wewash" | "sparkling";

export interface BrandMeta {
  key: Brand;
  name: string;
  tagline: string;
  themeColor: string;
  iconDir: string; // absolute public path, e.g. "/brand/arqud"
}

export const BRANDS: Record<Brand, BrandMeta> = {
  arqud: { key: "arqud", name: "ARQUD Portal", tagline: "Agency command center", themeColor: "#0b0b0c", iconDir: "/brand/arqud" },
  wewash: { key: "wewash", name: "We Wash Cars", tagline: "Premium mobile valet", themeColor: "#0b0b0c", iconDir: "/brand/wewash" },
  sparkling: { key: "sparkling", name: "Sparkling Auto Care Centres", tagline: "Premium auto detailing", themeColor: "#0b0b0c", iconDir: "/brand/sparkling" },
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
