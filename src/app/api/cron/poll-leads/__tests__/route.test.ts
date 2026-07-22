import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

// Poll cron reaches for Supabase, the Graph API (fetch), the forward endpoint and
// email. All are stubbed — these tests assert the FRANCHISE gate: a franchise lead
// ingests + notifies but is never forwarded to the wash SMS endpoint, while a normal
// wash lead still forwards.
const fromMock = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => ({ from: fromMock }),
}));
vi.mock("@/lib/leads/notify", () => ({ sendLeadNotification: vi.fn() }));
vi.mock("@/lib/settings/query", () => ({ getSetting: vi.fn() }));
// Keep the real buildForwardPayload; stub only the network send.
vi.mock("@/lib/leads/forward", async (importActual) => ({
  ...(await importActual<typeof import("@/lib/leads/forward")>()),
  sendSignedForward: vi.fn().mockResolvedValue(true),
}));

import { GET } from "@/app/api/cron/poll-leads/route";
import { sendSignedForward } from "@/lib/leads/forward";
import { sendLeadNotification } from "@/lib/leads/notify";
import { getSetting } from "@/lib/settings/query";

const WE_WASH_FORM = "1445058691003630";
const SPARKLING_FORM = "1713965523197151";
const POLL_KEY = "arqud_poll_7Hn3Kp9Wx2Qz";

function getRequest(): NextRequest {
  const url = new URL("https://arno.arqudportal.co.za/api/cron/poll-leads");
  url.searchParams.set("key", POLL_KEY);
  return new Request(url) as unknown as NextRequest;
}

// Supabase stub: one Meta client (with token), no existing lead, insert returns an id.
function installAdminStub() {
  const captured: { inserted: Record<string, unknown>[]; updated: Record<string, unknown>[] } = {
    inserted: [],
    updated: [],
  };
  fromMock.mockImplementation((table: string) => {
    const b: Record<string, unknown> = {};
    const self = () => b;
    Object.assign(b, {
      select: self,
      eq: self,
      not: self,
      limit: self,
      insert: (row: Record<string, unknown>) => {
        captured.inserted.push(row);
        (b as { __insert?: boolean }).__insert = true;
        return b;
      },
      update: (row: Record<string, unknown>) => {
        captured.updated.push(row);
        return b;
      },
      maybeSingle: async () =>
        table === "clients"
          ? { data: { id: "client-1", meta_access_token: "graph-token" } }
          : { data: null }, // leads existing-check → not found
      single: async () =>
        (b as { __insert?: boolean }).__insert
          ? { data: { id: "lead-row-1" }, error: null }
          : { data: null, error: null },
    });
    return b;
  });
  return captured;
}

// Graph fetch stub: returns `lead` for the form whose id is in the URL, empty otherwise,
// so exactly one lead is ingested per run (no cross-form dedup noise).
function installFetchStub(formId: string, lead: Record<string, unknown>) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL) => {
      const urlStr = String(input);
      const data = urlStr.includes(`/${formId}/leads`) ? [lead] : [];
      return { json: async () => ({ data }) } as unknown as Response;
    }),
  );
}

beforeEach(() => {
  fromMock.mockReset();
  vi.mocked(getSetting).mockResolvedValue("https://fwd.example"); // forward enabled
  vi.mocked(sendSignedForward).mockClear().mockResolvedValue(true);
  vi.mocked(sendLeadNotification).mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("GET /api/cron/poll-leads — normal wash lead still forwards", () => {
  it("forwards a normal We Wash lead and stamps forwarded_at", async () => {
    const captured = installAdminStub();
    installFetchStub(WE_WASH_FORM, {
      id: "meta-wash-1",
      campaign_name: "We Wash — Auto Detailing Complete R599",
      ad_name: "WW R599",
      form_id: WE_WASH_FORM,
      field_data: [
        { name: "full_name", values: ["Wash Customer"] },
        { name: "phone_number", values: ["+27820001111"] },
      ],
    });
    const res = await GET(getRequest());
    expect(res.status).toBe(200);
    expect(captured.inserted).toHaveLength(1);
    expect(captured.inserted[0].meta_lead_id).toBe("meta-wash-1");
    expect(vi.mocked(sendSignedForward)).toHaveBeenCalledTimes(1);
    expect(captured.updated.some((u) => "forwarded_at" in u)).toBe(true);
    expect(vi.mocked(sendLeadNotification)).toHaveBeenCalledTimes(1);
  });
});

describe("GET /api/cron/poll-leads — form_answers capture", () => {
  it("stores the raw field_data as a { questionName: value } map on the inserted lead", async () => {
    const captured = installAdminStub();
    installFetchStub(SPARKLING_FORM, {
      id: "meta-franchise-q1",
      campaign_name: "Sparkling Franchise — Rivonia Investor",
      ad_name: "Franchise 46s",
      form_id: SPARKLING_FORM,
      field_data: [
        { name: "full_name", values: ["Big Investor"] },
        { name: "phone_number", values: ["+27831112222"] },
        { name: "how_much_capital_can_you_invest", values: ["R1.75m – R2m"] },
        { name: "which_area_are_you_interested_in", values: ["Rivonia"] },
      ],
    });
    const res = await GET(getRequest());
    expect(res.status).toBe(200);
    expect(captured.inserted).toHaveLength(1);
    expect(captured.inserted[0].form_answers).toMatchObject({
      how_much_capital_can_you_invest: "R1.75m – R2m",
      which_area_are_you_interested_in: "Rivonia",
    });
  });
});

describe("GET /api/cron/poll-leads — FRANCHISE gate", () => {
  it("ingests + notifies a franchise lead but does NOT forward it", async () => {
    const captured = installAdminStub();
    installFetchStub(SPARKLING_FORM, {
      id: "meta-franchise-1",
      campaign_name: "Sparkling Franchise — Rivonia Investor",
      ad_name: "Franchise 46s",
      form_id: SPARKLING_FORM,
      field_data: [
        { name: "full_name", values: ["Big Investor"] },
        { name: "phone_number", values: ["+27831112222"] },
      ],
    });
    const res = await GET(getRequest());
    expect(res.status).toBe(200);
    // CRM insert + notification still happen.
    expect(captured.inserted).toHaveLength(1);
    expect(captured.inserted[0].meta_lead_id).toBe("meta-franchise-1");
    expect(vi.mocked(sendLeadNotification)).toHaveBeenCalledTimes(1);
    // …but the wash SMS forward is skipped, so forwarded_at is never stamped.
    expect(vi.mocked(sendSignedForward)).not.toHaveBeenCalled();
    expect(captured.updated).toHaveLength(0);
  });
});
