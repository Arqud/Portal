import { describe, expect, it } from "vitest";
import {
  BUSINESS_THEME,
  getBusinessTheme,
  invoiceTitle,
} from "@/lib/brand/business-theme";

function hexToRgb(hex: string): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `${r},${g},${b}`;
}

describe("getBusinessTheme", () => {
  it("resolves the ARQUD theme", () => {
    expect(getBusinessTheme("arqud").brandName).toBe("ARQUD");
  });

  it("resolves the SA Equipment theme", () => {
    const t = getBusinessTheme("sa_equipment");
    expect(t.brandName).toBe("SA EQUIPMENT");
    expect(t.brandTag).toBe("MACHINERY DEALER · SOUTH AFRICA");
    expect(t.billedFromName).toBe("ARQUD (PTY) LTD t/a SA Equipment");
  });

  it("defaults to ARQUD for undefined / null / empty / unknown", () => {
    expect(getBusinessTheme(undefined).key).toBe("arqud");
    expect(getBusinessTheme(null).key).toBe("arqud");
    expect(getBusinessTheme("").key).toBe("arqud");
    expect(getBusinessTheme("nope").key).toBe("arqud");
  });
});

describe("legal footers (Companies Act s32(4))", () => {
  it("ARQUD footer is unchanged (guards live agency documents)", () => {
    expect(BUSINESS_THEME.arqud.legalFooter).toBe(
      "Morne@arqud.com · ARQUD (PTY) LTD · Reg: 2025/074398/07",
    );
  });

  it("SA Equipment carries the trading-as footer", () => {
    expect(BUSINESS_THEME.sa_equipment.legalFooter).toBe(
      "ARQUD (PTY) LTD · Reg. 2025/074398/07 · trading as SA Equipment",
    );
  });
});

describe("ARQUD palette is byte-identical to the original hardcoded constants", () => {
  // If any of these change, every live ARQUD invoice/quote changes too.
  const p = BUSINESS_THEME.arqud.palette;
  it("keeps the original hex values", () => {
    expect(p.dark).toBe("#0D0D12");
    expect(p.navy).toBe("#111520");
    expect(p.gold).toBe("#C8A96E");
    expect(p.goldLight).toBe("#E2C98A");
    expect(p.goldDim).toBe("#9A8058");
    expect(p.bg).toBe("#FDFBF8");
    expect(p.bgAlt).toBe("#F7F3EE");
    expect(p.border).toBe("#E4DDD0");
    expect(p.text).toBe("#1A1814");
    expect(p.textMid).toBe("#5A5650");
    expect(p.textDim).toBe("#9A9590");
  });
  it("keeps the original rgba tint triplets", () => {
    expect(p.accentRGB).toBe("200,169,110");
    expect(p.paperRGB).toBe("253,251,248");
  });
});

describe("accent / paper rgb triplets match their hex (both businesses)", () => {
  for (const key of ["arqud", "sa_equipment"] as const) {
    it(`${key}: accentRGB == rgb(gold), paperRGB == rgb(bg)`, () => {
      const p = BUSINESS_THEME[key].palette;
      expect(p.accentRGB).toBe(hexToRgb(p.gold));
      expect(p.paperRGB).toBe(hexToRgb(p.bg));
    });
  }
});

describe("invoiceTitle (no VAT unless registered)", () => {
  it("is a plain Invoice with no VAT number", () => {
    expect(invoiceTitle(undefined)).toBe("Invoice");
    expect(invoiceTitle(null)).toBe("Invoice");
    expect(invoiceTitle("")).toBe("Invoice");
  });
  it("becomes a Tax Invoice only when a VAT number is present", () => {
    expect(invoiceTitle("4123456789")).toBe("Tax Invoice");
  });
});
