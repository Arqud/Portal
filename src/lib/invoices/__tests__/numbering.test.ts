import { describe, expect, it } from "vitest";
import { formatDocumentNumber } from "@/lib/invoices/numbering";

describe("formatDocumentNumber", () => {
  it("formats invoice number correctly", () => {
    expect(formatDocumentNumber("invoice", 2026, 3)).toBe("INV-2026-003");
  });
  it("formats quote number correctly", () => {
    expect(formatDocumentNumber("quote", 2026, 1)).toBe("QTE-2026-001");
  });
  it("pads to 3 digits", () => {
    expect(formatDocumentNumber("invoice", 2026, 10)).toBe("INV-2026-010");
    expect(formatDocumentNumber("invoice", 2026, 100)).toBe("INV-2026-100");
  });
});
