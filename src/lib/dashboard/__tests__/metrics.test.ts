import { describe, expect, it } from "vitest";
import { outstandingTotal, collectedInMonth, revenueByMonth, cashflow, pipeline, leadStats } from "@/lib/dashboard/metrics";

const ref = new Date("2026-06-15T00:00:00");

describe("outstandingTotal", () => {
  it("sums pending and overdue only", () => {
    expect(
      outstandingTotal([
        { amount: 100, status: "pending", issue_date: "2026-06-01" },
        { amount: 50, status: "overdue", issue_date: "2026-05-01" },
        { amount: 999, status: "paid", issue_date: "2026-06-01" },
        { amount: 7, status: "draft", issue_date: "2026-06-01" },
      ])
    ).toBe(150);
  });
});

describe("collectedInMonth", () => {
  it("sums paid invoices paid in the ref month", () => {
    expect(
      collectedInMonth(
        [
          { amount: 200, status: "paid", issue_date: "2026-04-01", paid_at: "2026-06-03" },
          { amount: 80, status: "paid", issue_date: "2026-06-01", paid_at: "2026-05-30" },
          { amount: 10, status: "pending", issue_date: "2026-06-01" },
        ],
        ref
      )
    ).toBe(200);
  });
});

describe("revenueByMonth", () => {
  it("returns N months ending at ref with labels", () => {
    const r = revenueByMonth([{ amount: 300, status: "paid", issue_date: "2026-06-10", paid_at: "2026-06-10" }], ref, 3);
    expect(r).toHaveLength(3);
    expect(r[2].label).toBe("Jun");
    expect(r[2].invoiced).toBe(300);
    expect(r[2].collected).toBe(300);
  });
});

describe("cashflow", () => {
  it("splits signed amounts into income/expenses and computes margin", () => {
    const c = cashflow(
      [
        { amount: 1000, date: "2026-06-02" },
        { amount: -300, date: "2026-06-05" },
        { amount: 50, date: "2026-05-01" },
      ],
      ref
    );
    expect(c.income).toBe(1000);
    expect(c.expenses).toBe(300);
    expect(c.net).toBe(700);
    expect(c.marginPct).toBe(70);
  });
});

describe("pipeline", () => {
  it("totals non-rejected quotes and returns top deals", () => {
    const p = pipeline([
      { quote_number: "Q1", total: 100, status: "sent" },
      { quote_number: "Q2", total: 900, status: "accepted" },
      { quote_number: "Q3", total: 5, status: "rejected" },
    ]);
    expect(p.open).toBe(1000);
    expect(p.deals[0].quote_number).toBe("Q2");
  });
});

describe("leadStats", () => {
  it("counts leads in month and last 7 days", () => {
    const s = leadStats(
      [
        { created_at: "2026-06-14T10:00:00" },
        { created_at: "2026-06-01T10:00:00" },
        { created_at: "2026-05-30T10:00:00" },
      ],
      ref
    );
    expect(s.month).toBe(2);
    expect(s.week).toBe(1);
  });
});
