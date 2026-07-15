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

import { GET, POST } from "@/app/api/leads/webhook/route";

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
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("POST /api/leads/webhook — fail closed", () => {
  // The production regression: an unsigned POST with no secrets set was ingested,
  // forwarded to the partner and fired a real SMS.
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

  it("accepts a valid Meta signature with NO Make token present (either-path)", async () => {
    vi.stubEnv("META_APP_SECRET", "app-secret");
    vi.stubEnv("MAKE_INGEST_TOKEN", "make-token");
    const res = await POST(postRequest(BODY, { "x-hub-signature-256": sign(BODY, "app-secret") }));
    expect(res.status).toBe(200);
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
});
