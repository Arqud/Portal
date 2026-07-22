import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
import type { LeadRow } from "@/lib/leads/forward";

// Backfill cron retries any recent textable lead whose forward failed (forwarded_at
// null). A franchise lead is (correctly) never forwarded at the webhook, so it lands
// in THIS retry set — the gate must skip it here too, or it would text a franchise
// investor the wash SMS ~24h later. Supabase + the network send are stubbed.
const fromMock = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => ({ from: fromMock }),
}));
vi.mock("@/lib/settings/query", () => ({ getSetting: vi.fn() }));
vi.mock("@/lib/leads/forward", async (importActual) => ({
  ...(await importActual<typeof import("@/lib/leads/forward")>()),
  sendSignedForward: vi.fn().mockResolvedValue(true),
}));

import { GET } from "@/app/api/cron/forward-backfill/route";
import { sendSignedForward } from "@/lib/leads/forward";
import { getSetting } from "@/lib/settings/query";

const CRON_SECRET = "cron-secret";

function getRequest(): NextRequest {
  return new Request("https://arno.arqudportal.co.za/api/cron/forward-backfill", {
    headers: { authorization: `Bearer ${CRON_SECRET}` },
  }) as unknown as NextRequest;
}

// A complete LeadRow with sensible defaults; override per test.
function leadRow(overrides: Partial<LeadRow>): LeadRow {
  return {
    id: "row-1",
    full_name: "Someone",
    phone: "+27820001111",
    branch: null,
    meta_campaign_name: "We Wash — Leads",
    meta_ad_name: null,
    preferred_time: null,
    meta_lead_id: null,
    meta_ad_id: null,
    meta_campaign_id: null,
    meta_adset_id: null,
    meta_form_id: null,
    meta_form_version: null,
    ...overrides,
  };
}

// Supabase stub: the select chain resolves to `leads`; update captures the row.
function installAdminStub(leads: LeadRow[]) {
  const captured: { updated: Record<string, unknown>[] } = { updated: [] };
  fromMock.mockImplementation(() => {
    const b: Record<string, unknown> = {};
    const self = () => b;
    Object.assign(b, {
      select: self,
      is: self,
      not: self,
      gte: self,
      order: self,
      limit: async () => ({ data: leads }),
      update: (row: Record<string, unknown>) => {
        captured.updated.push(row);
        return b;
      },
      eq: async () => ({ data: null, error: null }),
    });
    return b;
  });
  return captured;
}

beforeEach(() => {
  fromMock.mockReset();
  vi.stubEnv("CRON_SECRET", CRON_SECRET);
  vi.mocked(getSetting).mockResolvedValue("https://fwd.example");
  vi.mocked(sendSignedForward).mockClear().mockResolvedValue(true);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("GET /api/cron/forward-backfill — normal wash lead still forwards", () => {
  it("forwards a normal wash row and stamps forwarded_at", async () => {
    const captured = installAdminStub([leadRow({ id: "wash-row", meta_campaign_name: "We Wash — Leads" })]);
    const res = await GET(getRequest());
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ ok: true, considered: 1, forwarded: 1 });
    expect(vi.mocked(sendSignedForward)).toHaveBeenCalledTimes(1);
    expect(captured.updated.some((u) => "forwarded_at" in u)).toBe(true);
  });
});

describe("GET /api/cron/forward-backfill — FRANCHISE gate", () => {
  it("skips a franchise row: never forwards it, never stamps forwarded_at", async () => {
    const captured = installAdminStub([
      leadRow({ id: "franchise-row", meta_campaign_name: "Sparkling Franchise — Rivonia Investor" }),
    ]);
    const res = await GET(getRequest());
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ ok: true, considered: 1, forwarded: 0 });
    expect(vi.mocked(sendSignedForward)).not.toHaveBeenCalled();
    expect(captured.updated).toHaveLength(0);
  });

  it("forwards the wash row but skips the franchise row in a mixed batch", async () => {
    installAdminStub([
      leadRow({ id: "wash-row", meta_campaign_name: "We Wash — Leads" }),
      leadRow({ id: "franchise-row", meta_ad_name: "Franchise investor 46s" }),
    ]);
    const res = await GET(getRequest());
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ ok: true, considered: 2, forwarded: 1 });
    expect(vi.mocked(sendSignedForward)).toHaveBeenCalledTimes(1);
  });
});
