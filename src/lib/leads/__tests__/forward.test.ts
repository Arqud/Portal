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
      // Attribution keys are ALWAYS present in the signed body (null when unknown).
      meta_lead_id: null,
      form_id: null,
      form_version: null,
      campaign_id: null,
      adset_id: null,
      ad_id: null,
    });
  });

  it("maps a fully-populated input to all six Meta attribution keys", () => {
    expect(
      buildForwardPayload({
        id: "uuid-2",
        full_name: "Sipho D",
        phone: "0829999999",
        brand: "We Wash",
        branch: "Menlyn (Pretoria)",
        service: "Full Monty",
        preferred_time: "This weekend",
        meta_lead_id: "meta-lead-123",
        form_id: "form-456",
        form_version: null, // Meta does not expose this — stored/forwarded as null.
        campaign_id: "camp-789",
        adset_id: "adset-321",
        ad_id: "ad-654",
      })
    ).toEqual({
      lead_id: "uuid-2",
      full_name: "Sipho D",
      phone: "0829999999",
      brand: "We Wash",
      branch: "Menlyn (Pretoria)",
      service: "Full Monty",
      preferred_time: "This weekend",
      meta_lead_id: "meta-lead-123",
      form_id: "form-456",
      form_version: null,
      campaign_id: "camp-789",
      adset_id: "adset-321",
      ad_id: "ad-654",
    });
  });

  it("leaves every Meta attribution key null when the input omits them", () => {
    const payload = buildForwardPayload({ id: "u", full_name: null, phone: null, brand: "Sparkling", branch: null });
    expect(payload).toMatchObject({
      meta_lead_id: null,
      form_id: null,
      form_version: null,
      campaign_id: null,
      adset_id: null,
      ad_id: null,
    });
    // Every attribution key must be present in the signed body even when null.
    for (const key of ["meta_lead_id", "form_id", "form_version", "campaign_id", "adset_id", "ad_id"] as const) {
      expect(key in payload).toBe(true);
    }
  });

  it("defaults service to null", () => {
    expect(buildForwardPayload({ id: "u", full_name: null, phone: null, brand: "Sparkling", branch: null }).service).toBeNull();
  });

  it("defaults preferred_time to null when absent (all non-pilot forms)", () => {
    const payload = buildForwardPayload({ id: "u", full_name: null, phone: null, brand: "Sparkling", branch: null });
    expect(payload.preferred_time).toBeNull();
    expect("preferred_time" in payload).toBe(true); // key is always present in the signed body
  });

  it("keeps lead_id (our CRM UUID) distinct from meta_lead_id (Meta's id)", () => {
    const payload = buildForwardPayload({
      id: "crm-uuid",
      full_name: null,
      phone: null,
      brand: "We Wash",
      branch: null,
      meta_lead_id: "meta-id",
    });
    expect(payload.lead_id).toBe("crm-uuid");
    expect(payload.meta_lead_id).toBe("meta-id");
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
        meta_lead_id: "meta-lead-9",
        meta_ad_id: "ad-9",
        meta_campaign_id: "camp-9",
        meta_adset_id: "adset-9",
        meta_form_id: "form-9",
        meta_form_version: null,
      })
    ).toEqual({
      lead_id: "uuid-9",
      full_name: "Lerato K",
      phone: "0731112222",
      brand: "Sparkling",
      branch: "Menlyn (Pretoria)",
      service: "Sparkling — Leads",
      preferred_time: null,
      // Attribution carried straight through from the stored row.
      meta_lead_id: "meta-lead-9",
      form_id: "form-9",
      form_version: null,
      campaign_id: "camp-9",
      adset_id: "adset-9",
      ad_id: "ad-9",
    });
  });

  it("maps null stored attribution columns to null forward keys", () => {
    expect(
      forwardPayloadFromLead({
        id: "uuid-10",
        full_name: null,
        phone: "0820000000",
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
      })
    ).toMatchObject({
      meta_lead_id: null,
      form_id: null,
      form_version: null,
      campaign_id: null,
      adset_id: null,
      ad_id: null,
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
        meta_lead_id: null,
        meta_ad_id: null,
        meta_campaign_id: null,
        meta_adset_id: null,
        meta_form_id: null,
        meta_form_version: null,
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
        meta_lead_id: null,
        meta_ad_id: null,
        meta_campaign_id: null,
        meta_adset_id: null,
        meta_form_id: null,
        meta_form_version: null,
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
