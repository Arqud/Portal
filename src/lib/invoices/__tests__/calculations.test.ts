import { describe, expect, it } from "vitest";
import { calcSubtotal, calcVat, calcTotal, calcLineAmount } from "@/lib/invoices/calculations";

const items = [
  { amount: 9000 },
  { amount: 1000 },
];

describe("calcSubtotal", () => {
  it("sums all line item amounts", () => {
    expect(calcSubtotal(items)).toBe(10000);
  });
  it("returns 0 for empty items", () => {
    expect(calcSubtotal([])).toBe(0);
  });
});

describe("calcVat", () => {
  it("calculates 15% VAT on subtotal", () => {
    expect(calcVat(10000, 15)).toBe(1500);
  });
  it("rounds to 2 decimal places", () => {
    expect(calcVat(100.01, 15)).toBe(15);
  });
});

describe("calcTotal", () => {
  it("adds subtotal and vat", () => {
    expect(calcTotal(10000, 1500)).toBe(11500);
  });
});

describe("calcLineAmount", () => {
  it("multiplies rate by quantity", () => {
    expect(calcLineAmount(9000, 1)).toBe(9000);
    expect(calcLineAmount(500, 2)).toBe(1000);
  });
});
