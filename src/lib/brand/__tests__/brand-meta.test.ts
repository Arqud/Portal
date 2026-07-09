import { describe, it, expect } from "vitest";
import { resolveBrand, resolveBrandFromHost, BRANDS } from "../brand-meta";

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
    for (const b of ["arqud", "wewash", "sparkling", "neutral"] as const) {
      const m = BRANDS[b];
      expect(m.name).toBeTruthy();
      expect(m.description).toBeTruthy();
      expect(m.iconDir).toMatch(/^\/brand\//);
      expect(m.themeColor).toMatch(/^#/);
    }
  });
});

describe("resolveBrandFromHost", () => {
  it("arno subdomain -> neutral (never ARQUD)", () => {
    expect(resolveBrandFromHost("arno.arqudportal.co.za")).toBe("neutral");
  });
  it("apex -> arqud", () => {
    expect(resolveBrandFromHost("arqudportal.co.za")).toBe("arqud");
  });
  it("www -> arqud", () => {
    expect(resolveBrandFromHost("www.arqudportal.co.za")).toBe("arqud");
  });
  it("wewash subdomain -> wewash", () => {
    expect(resolveBrandFromHost("wewash.arqudportal.co.za")).toBe("wewash");
  });
  it("sparkling subdomain -> sparkling", () => {
    expect(resolveBrandFromHost("sparkling.arqudportal.co.za")).toBe("sparkling");
  });
  it("is case-insensitive and strips the port", () => {
    expect(resolveBrandFromHost("ARNO.arqudportal.co.za:443")).toBe("neutral");
  });
  it("localhost -> arqud", () => {
    expect(resolveBrandFromHost("localhost:3000")).toBe("arqud");
  });
  it("missing host -> arqud", () => {
    expect(resolveBrandFromHost(undefined)).toBe("arqud");
  });
});
