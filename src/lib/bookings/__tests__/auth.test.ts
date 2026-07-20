import { afterEach, describe, expect, it, vi } from "vitest";
import { authorizeOutcomes, OUTCOMES_TOKEN_HEADER } from "@/lib/bookings/auth";

function headers(h: Record<string, string> = {}): Headers {
  return new Headers(h);
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("authorizeOutcomes — fail closed", () => {
  it("rejects every request when the token env var is unset/empty", async () => {
    vi.stubEnv("BOOKING_OUTCOMES_TOKEN", "");
    expect(await authorizeOutcomes(headers())).toBe(false);
    expect(await authorizeOutcomes(headers({ [OUTCOMES_TOKEN_HEADER]: "anything" }))).toBe(false);
    // The empty-env/empty-header pair must NOT match — blank equals blank is not auth.
    expect(await authorizeOutcomes(headers({ [OUTCOMES_TOKEN_HEADER]: "" }))).toBe(false);
  });

  it("rejects a request presenting no token when one IS configured", async () => {
    vi.stubEnv("BOOKING_OUTCOMES_TOKEN", "outcomes-token");
    expect(await authorizeOutcomes(headers())).toBe(false);
  });

  it("rejects a wrong token", async () => {
    vi.stubEnv("BOOKING_OUTCOMES_TOKEN", "outcomes-token");
    expect(await authorizeOutcomes(headers({ [OUTCOMES_TOKEN_HEADER]: "wrong-token" }))).toBe(false);
  });

  it("rejects a token that is a prefix of the real one (no partial credit)", async () => {
    vi.stubEnv("BOOKING_OUTCOMES_TOKEN", "outcomes-token");
    expect(await authorizeOutcomes(headers({ [OUTCOMES_TOKEN_HEADER]: "outcomes-tok" }))).toBe(false);
    expect(await authorizeOutcomes(headers({ [OUTCOMES_TOKEN_HEADER]: "outcomes-token-extra" }))).toBe(false);
  });

  it("rejects the ingest token header — the two endpoints do not share credentials", async () => {
    vi.stubEnv("BOOKING_OUTCOMES_TOKEN", "outcomes-token");
    vi.stubEnv("MAKE_INGEST_TOKEN", "make-token");
    expect(await authorizeOutcomes(headers({ "x-arqud-ingest-token": "make-token" }))).toBe(false);
  });
});

describe("authorizeOutcomes — accepts the configured token", () => {
  it("accepts an exact match", async () => {
    vi.stubEnv("BOOKING_OUTCOMES_TOKEN", "outcomes-token");
    expect(await authorizeOutcomes(headers({ [OUTCOMES_TOKEN_HEADER]: "outcomes-token" }))).toBe(true);
  });

  it("matches the header case-insensitively (HTTP header semantics)", async () => {
    vi.stubEnv("BOOKING_OUTCOMES_TOKEN", "outcomes-token");
    expect(await authorizeOutcomes(headers({ "X-Arqud-Outcomes-Token": "outcomes-token" }))).toBe(true);
  });
});
