import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHmac } from "node:crypto";
import type { NextRequest } from "next/server";

// The route reaches for Supabase/forwarding/email the moment a request is
// authorised. None of that is under test here — these tests are about the
// auth gate — so the collaborators are stubbed and we assert on whether the
// request got PAST the gate at all.
const insertMock = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => ({ from: insertMock }),
}));
vi.mock("@/lib/leads/notify", () => ({ sendLeadNotification: vi.fn() }));
vi.mock("@/lib/settings/query", () => ({ getSetting: vi.fn().mockResolvedValue(null) }));
// Keep the REAL signBody + buildForwardPayload (Path A auth depends on signBody);
// stub only the network send so the authorized lead-bearing test can assert the
// forward was attempted without hitting the partner endpoint.
vi.mock("@/lib/leads/forward", async (importActual) => ({
  ...(await importActual<typeof import("@/lib/leads/forward")>()),
  sendSignedForward: vi.fn().mockResolvedValue(true),
}));

import { GET, POST } from "@/app/api/leads/webhook/route";
import { sendSignedForward } from "@/lib/leads/forward";
import { sendLeadNotification } from "@/lib/leads/notify";
import { getSetting } from "@/lib/settings/query";

function sign(body: string, secret: string): string {
  return `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
}

// An empty entry list is a well-formed Meta delivery that performs no ingestion,
// which keeps these tests on the auth gate and off the insert path.
const BODY = JSON.stringify({ entry: [] });

function postRequest(body: string, headers: Record<string, string> = {}): NextRequest {
  return new Request("https://arno.arqudportal.co.za/api/leads/webhook", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body,
  }) as unknown as NextRequest;
}

function getRequest(params: Record<string, string>): NextRequest {
  const url = new URL("https://arno.arqudportal.co.za/api/leads/webhook");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new Request(url) as unknown as NextRequest;
}

beforeEach(() => {
  insertMock.mockReset();
  vi.mocked(getSetting).mockResolvedValue(null);
  vi.mocked(sendSignedForward).mockClear().mockResolvedValue(true);
  vi.mocked(sendLeadNotification).mockClear();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("POST /api/leads/webhook — fail closed", () => {
  // The VULNERABILITY (what a lead-BEARING unsigned POST would have done pre-fix):
  // with no secret configured, verification was skipped, so the payload would have
  // been ingested, forwarded and fired a real SMS. What was actually OBSERVED in
  // production was narrower — one empty-entry probe (`{"entry":[]}`) returned 200 and
  // by construction created no row, forward or SMS. These gate tests assert the 401;
  // the lead-bearing effects are proven under "lead-bearing effects" below.
  it("401s an unsigned request when BOTH secrets are unset", async () => {
    vi.stubEnv("META_APP_SECRET", "");
    vi.stubEnv("MAKE_INGEST_TOKEN", "");
    const res = await POST(postRequest(BODY));
    expect(res.status).toBe(401);
  });

  it("never touches the database on an unauthenticated request", async () => {
    vi.stubEnv("META_APP_SECRET", "");
    vi.stubEnv("MAKE_INGEST_TOKEN", "");
    await POST(postRequest(BODY));
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("401s an unsigned request when both secrets are set", async () => {
    vi.stubEnv("META_APP_SECRET", "app-secret");
    vi.stubEnv("MAKE_INGEST_TOKEN", "make-token");
    const res = await POST(postRequest(BODY));
    expect(res.status).toBe(401);
  });
});

describe("POST /api/leads/webhook — Path A (Meta signature)", () => {
  it("processes a request with a valid Meta signature", async () => {
    vi.stubEnv("META_APP_SECRET", "app-secret");
    vi.stubEnv("MAKE_INGEST_TOKEN", "make-token");
    const res = await POST(postRequest(BODY, { "x-hub-signature-256": sign(BODY, "app-secret") }));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
  });

  it("accepts a valid Meta signature with MAKE_INGEST_TOKEN unset (Path A truly independent)", async () => {
    vi.stubEnv("META_APP_SECRET", "app-secret");
    // Genuinely delete the var (not empty-string) so Path A is proven with no Make token present.
    const saved = process.env.MAKE_INGEST_TOKEN;
    delete process.env.MAKE_INGEST_TOKEN;
    try {
      const res = await POST(postRequest(BODY, { "x-hub-signature-256": sign(BODY, "app-secret") }));
      expect(res.status).toBe(200);
    } finally {
      if (saved !== undefined) process.env.MAKE_INGEST_TOKEN = saved;
    }
  });

  it("401s an invalid Meta signature", async () => {
    vi.stubEnv("META_APP_SECRET", "app-secret");
    vi.stubEnv("MAKE_INGEST_TOKEN", "make-token");
    const res = await POST(postRequest(BODY, { "x-hub-signature-256": sign(BODY, "wrong-secret") }));
    expect(res.status).toBe(401);
  });
});

describe("POST /api/leads/webhook — Path B (Make token)", () => {
  it("processes a request with the correct Make token", async () => {
    vi.stubEnv("META_APP_SECRET", "app-secret");
    vi.stubEnv("MAKE_INGEST_TOKEN", "make-token");
    const res = await POST(postRequest(BODY, { "x-arqud-ingest-token": "make-token" }));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
  });

  it("401s a wrong Make token", async () => {
    vi.stubEnv("META_APP_SECRET", "app-secret");
    vi.stubEnv("MAKE_INGEST_TOKEN", "make-token");
    const res = await POST(postRequest(BODY, { "x-arqud-ingest-token": "wrong-token" }));
    expect(res.status).toBe(401);
  });
});

describe("POST /api/leads/webhook — authenticated behaviour is unchanged", () => {
  it("still 400s malformed JSON once authenticated", async () => {
    vi.stubEnv("META_APP_SECRET", "");
    vi.stubEnv("MAKE_INGEST_TOKEN", "make-token");
    const res = await POST(postRequest("not json", { "x-arqud-ingest-token": "make-token" }));
    expect(res.status).toBe(400);
  });

  // Auth must be decided before the body is parsed — an unauthenticated caller
  // should not be able to tell valid JSON from invalid by the status code.
  it("401s malformed JSON when unauthenticated (auth precedes parsing)", async () => {
    vi.stubEnv("META_APP_SECRET", "");
    vi.stubEnv("MAKE_INGEST_TOKEN", "make-token");
    const res = await POST(postRequest("not json"));
    expect(res.status).toBe(401);
  });
});

describe("GET /api/leads/webhook — Meta subscription handshake", () => {
  it("echoes hub.challenge for the correct verify token", async () => {
    vi.stubEnv("META_WEBHOOK_VERIFY_TOKEN", "verify-me");
    const res = await GET(
      getRequest({ "hub.mode": "subscribe", "hub.verify_token": "verify-me", "hub.challenge": "challenge-123" }),
    );
    expect(res.status).toBe(200);
    await expect(res.text()).resolves.toBe("challenge-123");
  });

  it("403s a wrong verify token", async () => {
    vi.stubEnv("META_WEBHOOK_VERIFY_TOKEN", "verify-me");
    const res = await GET(
      getRequest({ "hub.mode": "subscribe", "hub.verify_token": "nope", "hub.challenge": "challenge-123" }),
    );
    expect(res.status).toBe(403);
  });

  it("403s a wrong hub.mode", async () => {
    vi.stubEnv("META_WEBHOOK_VERIFY_TOKEN", "verify-me");
    const res = await GET(
      getRequest({ "hub.mode": "unsubscribe", "hub.verify_token": "verify-me", "hub.challenge": "c" }),
    );
    expect(res.status).toBe(403);
  });

  // Duan's requested case: if the verify token is UNSET, the handshake must not open.
  it("403s a subscribe handshake when META_WEBHOOK_VERIFY_TOKEN is unset", async () => {
    const saved = process.env.META_WEBHOOK_VERIFY_TOKEN;
    delete process.env.META_WEBHOOK_VERIFY_TOKEN; // truly unset, not empty-string
    try {
      const res = await GET(
        getRequest({ "hub.mode": "subscribe", "hub.verify_token": "anything", "hub.challenge": "c" }),
      );
      expect(res.status).toBe(403);
    } finally {
      if (saved !== undefined) process.env.META_WEBHOOK_VERIFY_TOKEN = saved;
    }
  });

  // The specific exploit the non-empty guard closes: a BLANK env matching a BLANK
  // hub.verify_token. Must fail closed.
  it("403s blank env + blank hub.verify_token (blank must never match blank)", async () => {
    vi.stubEnv("META_WEBHOOK_VERIFY_TOKEN", "");
    const res = await GET(
      getRequest({ "hub.mode": "subscribe", "hub.verify_token": "", "hub.challenge": "c" }),
    );
    expect(res.status).toBe(403);
  });

  it("403s blank env + omitted hub.verify_token", async () => {
    vi.stubEnv("META_WEBHOOK_VERIFY_TOKEN", "");
    const res = await GET(getRequest({ "hub.mode": "subscribe", "hub.challenge": "c" }));
    expect(res.status).toBe(403);
  });
});

// A single realistic Meta leadgen delivery (one entry, one change) carrying inline
// field_data, so ingestion runs WITHOUT needing a Graph token.
const LEAD_BODY = JSON.stringify({
  entry: [
    {
      changes: [
        {
          value: {
            leadgen_id: "lead-meta-1",
            page_id: "1147234435130456", // We Wash FB page
            campaign_name: "We Wash — Auto Detailing Complete R599",
            field_data: [
              { name: "full_name", values: ["Test Person"] },
              { name: "phone_number", values: ["+27820000000"] },
            ],
          },
        },
      ],
    },
  ],
});

// Chainable Supabase stub: no existing lead, one client, insert returns an id.
// Returns a `captured` handle so tests can assert exactly what was written.
function installAdminStub() {
  const captured: {
    inserted?: { table: string; row: Record<string, unknown> };
    updated?: { table: string; row: Record<string, unknown> };
  } = {};
  insertMock.mockImplementation((table: string) => {
    const b: Record<string, unknown> = {};
    const self = () => b;
    Object.assign(b, {
      select: self,
      eq: self,
      not: self,
      limit: self,
      insert: (row: Record<string, unknown>) => {
        captured.inserted = { table, row };
        (b as { __insert?: boolean }).__insert = true;
        return b;
      },
      update: (row: Record<string, unknown>) => {
        captured.updated = { table, row };
        return b;
      },
      maybeSingle: async () =>
        table === "clients" ? { data: { id: "client-1" } } : { data: null },
      single: async () =>
        (b as { __insert?: boolean }).__insert
          ? { data: { id: "lead-1" }, error: null }
          : { data: { meta_access_token: null }, error: null },
    });
    return b;
  });
  return captured;
}

describe("POST /api/leads/webhook — lead-bearing effects", () => {
  // Duan's requested proof #1: an UNAUTHENTICATED lead-bearing request must have
  // zero DB, forward and notification effects — not merely return 401.
  it("unauthenticated lead-bearing request writes nothing, forwards nothing, notifies nobody", async () => {
    vi.stubEnv("META_APP_SECRET", "");
    vi.stubEnv("MAKE_INGEST_TOKEN", "make-token");
    installAdminStub(); // armed, but must never be reached
    const res = await POST(postRequest(LEAD_BODY)); // no auth header
    expect(res.status).toBe(401);
    expect(insertMock).not.toHaveBeenCalled(); // admin.from() never reached
    expect(vi.mocked(sendSignedForward)).not.toHaveBeenCalled();
    expect(vi.mocked(sendLeadNotification)).not.toHaveBeenCalled();
  });

  // Duan's requested proof #2: an AUTHORIZED realistic request DOES insert, forward
  // and notify (all side effects mocked). Doubles as the normal-WASH-lead control for
  // the franchise gate below: a wash lead STILL forwards.
  it("authorized lead-bearing request inserts, forwards and notifies (effects mocked)", async () => {
    vi.stubEnv("META_APP_SECRET", "");
    vi.stubEnv("MAKE_INGEST_TOKEN", "make-token");
    vi.mocked(getSetting).mockResolvedValue("https://fwd.example"); // enable forward path
    const captured = installAdminStub();
    const res = await POST(postRequest(LEAD_BODY, { "x-arqud-ingest-token": "make-token" }));
    expect(res.status).toBe(200);
    expect(captured.inserted?.table).toBe("leads");
    expect(captured.inserted?.row.meta_lead_id).toBe("lead-meta-1");
    expect(captured.inserted?.row.phone).toBe("+27820000000");
    expect(vi.mocked(sendSignedForward)).toHaveBeenCalledTimes(1);
    expect(captured.updated?.row).toHaveProperty("forwarded_at"); // stamped on 2xx forward
    expect(vi.mocked(sendLeadNotification)).toHaveBeenCalledTimes(1);
  });
});

// A franchise-recruitment lead delivered on the Sparkling page, with "Franchise" in the
// campaign name (the interim name safety-net signal, before the franchise form id exists).
const FRANCHISE_LEAD_BODY = JSON.stringify({
  entry: [
    {
      changes: [
        {
          value: {
            leadgen_id: "lead-franchise-1",
            page_id: "459272044104015", // Sparkling FB page
            campaign_name: "Sparkling Franchise — Rivonia Investor",
            field_data: [
              { name: "full_name", values: ["Big Investor"] },
              { name: "phone_number", values: ["+27831112222"] },
            ],
          },
        },
      ],
    },
  ],
});

describe("POST /api/leads/webhook — FRANCHISE gate (never forward franchise leads)", () => {
  it("ingests + notifies a franchise lead but does NOT forward it to the wash SMS endpoint", async () => {
    vi.stubEnv("META_APP_SECRET", "");
    vi.stubEnv("MAKE_INGEST_TOKEN", "make-token");
    vi.mocked(getSetting).mockResolvedValue("https://fwd.example"); // forward IS enabled…
    const captured = installAdminStub();
    const res = await POST(postRequest(FRANCHISE_LEAD_BODY, { "x-arqud-ingest-token": "make-token" }));
    expect(res.status).toBe(200);
    // CRM insert still happens — the lead is not lost.
    expect(captured.inserted?.table).toBe("leads");
    expect(captured.inserted?.row.meta_lead_id).toBe("lead-franchise-1");
    // Notification email still fires (client still hears about the franchise lead).
    expect(vi.mocked(sendLeadNotification)).toHaveBeenCalledTimes(1);
    // …but the wash SMS forward is SKIPPED, and forwarded_at is therefore never stamped.
    expect(vi.mocked(sendSignedForward)).not.toHaveBeenCalled();
    expect(captured.updated).toBeUndefined();
  });
});

// A franchise lead carrying the qualifier questions the page reads (capital / timeline
// / funds / area), to prove the raw field_data is captured into form_answers on insert.
const FRANCHISE_QUALIFIER_BODY = JSON.stringify({
  entry: [
    {
      changes: [
        {
          value: {
            leadgen_id: "lead-franchise-q1",
            page_id: "459272044104015",
            campaign_name: "Sparkling Franchise — Rivonia Investor",
            field_data: [
              { name: "full_name", values: ["Big Investor"] },
              { name: "phone_number", values: ["+27831112222"] },
              { name: "how_much_capital_can_you_invest", values: ["R1.75m – R2m"] },
              { name: "when_are_you_looking_to_start", values: ["In 3 months"] },
              { name: "which_area_are_you_interested_in", values: ["Rivonia"] },
            ],
          },
        },
      ],
    },
  ],
});

// A deliberately imperfect payload: field_data present but one entry has no values.
// Capture must not throw — the lead must still ingest.
const MALFORMED_FIELD_DATA_BODY = JSON.stringify({
  entry: [
    {
      changes: [
        {
          value: {
            leadgen_id: "lead-malformed-1",
            page_id: "1147234435130456",
            campaign_name: "We Wash — R599",
            field_data: [
              { name: "full_name", values: ["No Values Person"] },
              { name: "phone_number" }, // no `values` key at all
            ],
          },
        },
      ],
    },
  ],
});

describe("POST /api/leads/webhook — form_answers capture", () => {
  it("stores the raw field_data as a { questionName: value } map on the inserted lead", async () => {
    vi.stubEnv("META_APP_SECRET", "");
    vi.stubEnv("MAKE_INGEST_TOKEN", "make-token");
    const captured = installAdminStub();
    const res = await POST(postRequest(FRANCHISE_QUALIFIER_BODY, { "x-arqud-ingest-token": "make-token" }));
    expect(res.status).toBe(200);
    expect(captured.inserted?.row.form_answers).toMatchObject({
      how_much_capital_can_you_invest: "R1.75m – R2m",
      when_are_you_looking_to_start: "In 3 months",
      which_area_are_you_interested_in: "Rivonia",
    });
  });

  it("does not throw on a malformed field_data payload — the lead still ingests", async () => {
    vi.stubEnv("META_APP_SECRET", "");
    vi.stubEnv("MAKE_INGEST_TOKEN", "make-token");
    const captured = installAdminStub();
    const res = await POST(postRequest(MALFORMED_FIELD_DATA_BODY, { "x-arqud-ingest-token": "make-token" }));
    expect(res.status).toBe(200);
    expect(captured.inserted?.table).toBe("leads");
    expect(captured.inserted?.row.meta_lead_id).toBe("lead-malformed-1");
    // The good field is captured; the values-less field is stored as an empty string.
    expect(captured.inserted?.row.form_answers).toMatchObject({ full_name: "No Values Person", phone_number: "" });
  });
});
