import { afterEach, describe, expect, it, vi } from "vitest";
import { createHmac } from "node:crypto";
import { authorizeIngest, verifyMetaSignature } from "@/lib/leads/auth";

// Sign independently of the app's own helper, so a bug in signBody can never make
// these tests pass by agreeing with itself.
function sign(body: string, secret: string): string {
  return `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
}

const BODY = JSON.stringify({ entry: [{ changes: [{ value: { leadgen_id: "1" } }] }] });

function headers(h: Record<string, string> = {}): Headers {
  return new Headers(h);
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("verifyMetaSignature", () => {
  it("accepts a signature computed over the exact raw body", async () => {
    expect(await verifyMetaSignature(BODY, sign(BODY, "app-secret"), "app-secret")).toBe(true);
  });

  it("rejects a signature for a different body (tamper)", async () => {
    const forOtherBody = sign(JSON.stringify({ entry: [] }), "app-secret");
    expect(await verifyMetaSignature(BODY, forOtherBody, "app-secret")).toBe(false);
  });

  it("rejects a signature made with the wrong secret", async () => {
    expect(await verifyMetaSignature(BODY, sign(BODY, "other-secret"), "app-secret")).toBe(false);
  });

  it("rejects when the secret is empty — an unset secret verifies nothing", async () => {
    expect(await verifyMetaSignature(BODY, sign(BODY, ""), "")).toBe(false);
  });

  it("rejects an absent or malformed signature", async () => {
    expect(await verifyMetaSignature(BODY, "", "app-secret")).toBe(false);
    expect(await verifyMetaSignature(BODY, "sha256=not-hex", "app-secret")).toBe(false);
    expect(await verifyMetaSignature(BODY, "garbage", "app-secret")).toBe(false);
  });
});

describe("authorizeIngest — fail closed", () => {
  // The regression that matters most: before this fix an unsigned POST with no
  // secrets configured was processed as if authenticated.
  it("rejects an unsigned request when BOTH secrets are unset", async () => {
    vi.stubEnv("META_APP_SECRET", "");
    vi.stubEnv("MAKE_INGEST_TOKEN", "");
    expect(await authorizeIngest(BODY, headers())).toBe(false);
  });

  it("rejects an unsigned request when both secrets ARE set", async () => {
    vi.stubEnv("META_APP_SECRET", "app-secret");
    vi.stubEnv("MAKE_INGEST_TOKEN", "make-token");
    expect(await authorizeIngest(BODY, headers())).toBe(false);
  });

  it("rejects a request presenting a token when no token is configured", async () => {
    vi.stubEnv("META_APP_SECRET", "");
    vi.stubEnv("MAKE_INGEST_TOKEN", "");
    expect(await authorizeIngest(BODY, headers({ "x-arqud-ingest-token": "anything" }))).toBe(false);
  });

  it("rejects a signed request when no app secret is configured", async () => {
    vi.stubEnv("META_APP_SECRET", "");
    vi.stubEnv("MAKE_INGEST_TOKEN", "");
    const h = headers({ "x-hub-signature-256": sign(BODY, "app-secret") });
    expect(await authorizeIngest(BODY, h)).toBe(false);
  });
});

describe("authorizeIngest — Path A (Meta native signature)", () => {
  it("accepts a valid Meta signature", async () => {
    vi.stubEnv("META_APP_SECRET", "app-secret");
    vi.stubEnv("MAKE_INGEST_TOKEN", "make-token");
    const h = headers({ "x-hub-signature-256": sign(BODY, "app-secret") });
    expect(await authorizeIngest(BODY, h)).toBe(true);
  });

  it("accepts a valid Meta signature even with NO Make token present (either-path)", async () => {
    vi.stubEnv("META_APP_SECRET", "app-secret");
    vi.stubEnv("MAKE_INGEST_TOKEN", "make-token");
    const h = headers({ "x-hub-signature-256": sign(BODY, "app-secret") });
    expect(h.get("x-arqud-ingest-token")).toBeNull();
    expect(await authorizeIngest(BODY, h)).toBe(true);
  });

  it("rejects an invalid Meta signature", async () => {
    vi.stubEnv("META_APP_SECRET", "app-secret");
    vi.stubEnv("MAKE_INGEST_TOKEN", "make-token");
    const h = headers({ "x-hub-signature-256": sign(BODY, "wrong-secret") });
    expect(await authorizeIngest(BODY, h)).toBe(false);
  });

  it("rejects a valid signature over a DIFFERENT body (replay onto tampered payload)", async () => {
    vi.stubEnv("META_APP_SECRET", "app-secret");
    vi.stubEnv("MAKE_INGEST_TOKEN", "");
    const h = headers({ "x-hub-signature-256": sign('{"entry":[]}', "app-secret") });
    expect(await authorizeIngest(BODY, h)).toBe(false);
  });
});

describe("authorizeIngest — Path B (trusted forwarder token)", () => {
  it("accepts the correct Make token with no signature present", async () => {
    vi.stubEnv("META_APP_SECRET", "app-secret");
    vi.stubEnv("MAKE_INGEST_TOKEN", "make-token");
    const h = headers({ "x-arqud-ingest-token": "make-token" });
    expect(await authorizeIngest(BODY, h)).toBe(true);
  });

  it("rejects a wrong Make token", async () => {
    vi.stubEnv("META_APP_SECRET", "app-secret");
    vi.stubEnv("MAKE_INGEST_TOKEN", "make-token");
    const h = headers({ "x-arqud-ingest-token": "wrong-token" });
    expect(await authorizeIngest(BODY, h)).toBe(false);
  });

  it("rejects a token that is a prefix of the real one (no partial credit)", async () => {
    vi.stubEnv("META_APP_SECRET", "");
    vi.stubEnv("MAKE_INGEST_TOKEN", "make-token");
    expect(await authorizeIngest(BODY, headers({ "x-arqud-ingest-token": "make-tok" }))).toBe(false);
    expect(await authorizeIngest(BODY, headers({ "x-arqud-ingest-token": "make-token-extra" }))).toBe(false);
  });

  it("works when only the Make token is configured (Make-only deployment)", async () => {
    vi.stubEnv("META_APP_SECRET", "");
    vi.stubEnv("MAKE_INGEST_TOKEN", "make-token");
    expect(await authorizeIngest(BODY, headers({ "x-arqud-ingest-token": "make-token" }))).toBe(true);
  });

  it("accepts a bad signature alongside a good token — either path suffices", async () => {
    vi.stubEnv("META_APP_SECRET", "app-secret");
    vi.stubEnv("MAKE_INGEST_TOKEN", "make-token");
    const h = headers({
      "x-hub-signature-256": sign(BODY, "wrong-secret"),
      "x-arqud-ingest-token": "make-token",
    });
    expect(await authorizeIngest(BODY, h)).toBe(true);
  });
});
