import { describe, it, expect } from "vitest";
import { resolveBrand, BRANDS } from "../brand-meta";

describe("resolveBrand", () => {
  it("admin -> arqud", () => {
    expect(resolveBrand({ role: "admin", brand: null })).toBe("arqud");
  });
  it("We Wash staff -> wewash", () => {
    expect(resolveBrand({ role: "client", brand: "We Wash" })).toBe("wewash");
  });
  it("Sparkling staff -> sparkling", () => {
    expect(resolveBrand({ role: "client", brand: "Sparkling" })).toBe("sparkling");
  });
  it("client with no brand (Arno) -> sparkling", () => {
    expect(resolveBrand({ role: "client", brand: null })).toBe("sparkling");
  });
  it("every brand has a complete meta entry", () => {
    for (const b of ["arqud", "wewash", "sparkling"] as const) {
      const m = BRANDS[b];
      expect(m.name).toBeTruthy();
      expect(m.iconDir).toMatch(/^\/brand\//);
      expect(m.themeColor).toMatch(/^#/);
    }
  });
});
