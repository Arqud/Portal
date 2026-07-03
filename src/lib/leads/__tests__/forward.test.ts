import { describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import { buildForwardPayload, signBody } from "@/lib/leads/forward";

describe("buildForwardPayload", () => {
  it("maps a CRM lead into the exact shape Duan asked for", () => {
    expect(
      buildForwardPayload({
        id: "uuid-1",
        full_name: "Thabo M",
        phone: "0821234567",
        brand: "We Wash",
        branch: "Eldo Glen (Centurion)",
        service: "Four of a Kind R599",
      })
    ).toEqual({
      lead_id: "uuid-1",
      full_name: "Thabo M",
      phone: "0821234567",
      brand: "We Wash",
      branch: "Eldo Glen (Centurion)",
      service: "Four of a Kind R599",
    });
  });

  it("defaults service to null", () => {
    expect(buildForwardPayload({ id: "u", full_name: null, phone: null, brand: "Sparkling", branch: null }).service).toBeNull();
  });
});

describe("signBody", () => {
  it("produces an HMAC-SHA256 that an independent implementation can verify", async () => {
    const body = JSON.stringify({ lead_id: "uuid-1", phone: "0821234567" });
    const secret = "shared-secret-123";
    const got = await signBody(body, secret);
    const expected = "sha256=" + createHmac("sha256", secret).update(body).digest("hex");
    expect(got).toBe(expected);
  });
});
