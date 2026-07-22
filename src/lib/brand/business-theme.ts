// Business-level document identity for the two businesses that share the one
// legal entity (ARQUD (PTY) LTD). One ledger, two customer-facing identities.
//
// ARQUD  = digital-marketing agency (existing; values here are byte-identical to
//          the previously-hardcoded invoice/quote PDF constants — DO NOT change
//          them without intending to change every live ARQUD document).
// SA Equipment = machinery dealer, trading as "ARQUD (PTY) LTD t/a SA Equipment".
//
// Consumed by the invoice/quote PDF renderers. A document defaults to ARQUD when
// no (or an unknown) business is supplied, so existing behaviour is preserved.

export type BusinessKey = "arqud" | "sa_equipment";

export interface BusinessPalette {
  dark: string;
  navy: string;
  gold: string;
  goldLight: string;
  goldDim: string;
  bg: string;
  bgAlt: string;
  border: string;
  text: string;
  textMid: string;
  textDim: string;
  /** rgb triplet of the accent, used for rgba() tints (matches `gold`). */
  accentRGB: string;
  /** rgb triplet of the paper/light tone, used for rgba() tints (matches `bg`). */
  paperRGB: string;
}

export interface BusinessDocTheme {
  key: BusinessKey;
  /** Header brand name. */
  brandName: string;
  /** Header tagline under the brand name. */
  brandTag: string;
  /** "Billed From" / "From" party name. */
  billedFromName: string;
  /** Footer legal line (Companies Act 71 of 2008 s32(4)). */
  legalFooter: string;
  palette: BusinessPalette;
}

const ARQUD: BusinessDocTheme = {
  key: "arqud",
  brandName: "ARQUD",
  brandTag: "DIGITAL MARKETING AGENCY",
  billedFromName: "ARQUD (PTY) LTD",
  legalFooter: "Morne@arqud.com · ARQUD (PTY) LTD · Reg: 2025/074398/07",
  palette: {
    dark: "#0D0D12",
    navy: "#111520",
    gold: "#C8A96E",
    goldLight: "#E2C98A",
    goldDim: "#9A8058",
    bg: "#FDFBF8",
    bgAlt: "#F7F3EE",
    border: "#E4DDD0",
    text: "#1A1814",
    textMid: "#5A5650",
    textDim: "#9A9590",
    accentRGB: "200,169,110", // = #C8A96E
    paperRGB: "253,251,248", // = #FDFBF8
  },
};

const SA_EQUIPMENT: BusinessDocTheme = {
  key: "sa_equipment",
  brandName: "SA EQUIPMENT",
  brandTag: "MACHINERY DEALER · SOUTH AFRICA",
  billedFromName: "ARQUD (PTY) LTD t/a SA Equipment",
  legalFooter: "ARQUD (PTY) LTD · Reg. 2025/074398/07 · trading as SA Equipment",
  palette: {
    dark: "#0E1116",
    navy: "#171B21",
    gold: "#F5B301",
    goldLight: "#F7C63C",
    goldDim: "#8A6410",
    bg: "#FFFFFF",
    bgAlt: "#F5F7F8",
    border: "#E2E6EA",
    text: "#161A1F",
    textMid: "#4A5560",
    textDim: "#98A0AA",
    accentRGB: "245,179,1", // = #F5B301
    paperRGB: "255,255,255", // = #FFFFFF
  },
};

export const BUSINESS_THEME: Record<BusinessKey, BusinessDocTheme> = {
  arqud: ARQUD,
  sa_equipment: SA_EQUIPMENT,
};

/** Resolve a business theme, defaulting to ARQUD for null/undefined/unknown. */
export function getBusinessTheme(business?: string | null): BusinessDocTheme {
  if (business && Object.prototype.hasOwnProperty.call(BUSINESS_THEME, business)) {
    return BUSINESS_THEME[business as BusinessKey];
  }
  return ARQUD;
}

/**
 * Invoice document title. Only "Tax Invoice" when a VAT number is present
 * (i.e. the entity is VAT-registered) — otherwise a plain "Invoice", never a
 * VAT line. Applies to both businesses (one entity, one VAT status).
 */
export function invoiceTitle(vatNumber?: string | null): string {
  return vatNumber ? "Tax Invoice" : "Invoice";
}
