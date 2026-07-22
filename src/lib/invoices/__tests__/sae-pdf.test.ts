import { describe, expect, it } from "vitest";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { SaeInvoicePDF } from "@/lib/invoices/sae-invoice-pdf";
import { SaeQuotePDF } from "@/lib/invoices/sae-quote-pdf";

/* eslint-disable @typescript-eslint/no-explicit-any */
const client = { company: "Highveld Contracting (Pty) Ltd", name: "J. Botha", email: "a@h.co.za", contact_person: "Johan", address: "Plot 14, MP" };
const invoice: any = {
  invoice_number: "INV-2026-042", issue_date: "2026-07-22", due_date: "2026-08-05", terms: "On receipt",
  amount: 434000, subtotal: 434000, vat_rate: 0, vat_amount: 0, notes: null, client,
  line_items: [{ description: "Mahindra 575 DI", detail: "New", rate: 385000, amount: 385000, sort_order: 0 }],
};
const quote: any = {
  quote_number: "QUO-2026-001", issue_date: "2026-07-22", status: "sent", total: 997500, notes: null, client,
  line_items: [{ description: "SANY SY75C", detail: "New", rate: 985000, amount: 985000, sort_order: 0 }],
};

describe("SA Equipment PDF documents render", () => {
  it("renders a valid invoice PDF", async () => {
    const buf = await renderToBuffer(createElement(SaeInvoicePDF, { invoice }) as any);
    expect(buf.length).toBeGreaterThan(1000);
    expect(buf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
  }, 30000);

  it("renders a valid quote PDF", async () => {
    const buf = await renderToBuffer(createElement(SaeQuotePDF, { quote }) as any);
    expect(buf.length).toBeGreaterThan(1000);
    expect(buf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
  }, 30000);
});
