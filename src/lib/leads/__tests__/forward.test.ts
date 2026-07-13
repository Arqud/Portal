import { describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import { buildForwardPayload, signBody, forwardPayloadFromLead } from "@/lib/leads/forward";

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
        preferred_time: "This week — morning",
      })
    ).toEqual({
      lead_id: "uuid-1",
      full_name: "Thabo M",
      phone: "0821234567",
      brand: "We Wash",
      branch: "Eldo Glen (Centurion)",
      service: "Four of a Kind R599",
      preferred_time: "This week — morning",
    });
  });

  it("defaults service to null", () => {
    expect(buildForwardPayload({ id: "u", full_name: null, phone: null, brand: "Sparkling", branch: null }).service).toBeNull();
  });

  it("defaults preferred_time to null when absent (all non-pilot forms)", () => {
    const payload = buildForwardPayload({ id: "u", full_name: null, phone: null, brand: "Sparkling", branch: null });
    expect(payload.preferred_time).toBeNull();
    expect("preferred_time" in payload).toBe(true); // key is always present in the signed body
  });
});

describe("forwardPayloadFromLead", () => {
  it("rebuilds the identical forward payload from a stored lead (backfill retry)", () => {
    expect(
      forwardPayloadFromLead({
        id: "uuid-9",
        full_name: "Lerato K",
        phone: "0731112222",
        branch: "Menlyn (Pretoria)",
        meta_campaign_name: "Sparkling — Leads",
        meta_ad_name: null,
        preferred_time: null,
      })
    ).toEqual({
      lead_id: "uuid-9",
      full_name: "Lerato K",
      phone: "0731112222",
      brand: "Sparkling",
      branch: "Menlyn (Pretoria)",
      service: "Sparkling — Leads",
      preferred_time: null,
    });
  });

  it("derives brand from the campaign name the same way the live forward does", () => {
    expect(
      forwardPayloadFromLead({
        id: "u",
        full_name: null,
        phone: "0820000000",
        branch: "Sunnyside (Pretoria)",
        meta_campaign_name: "We Wash — Leads",
        meta_ad_name: null,
        preferred_time: null,
      }).brand
    ).toBe("We Wash");
  });

  it("carries the stored preferred_time into a retried forward", () => {
    expect(
      forwardPayloadFromLead({
        id: "u",
        full_name: null,
        phone: "0820000000",
        branch: null,
        meta_campaign_name: "We Wash — Leads",
        meta_ad_name: null,
        preferred_time: "As soon as possible",
      }).preferred_time
    ).toBe("As soon as possible");
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
