import { describe, expect, it } from "vitest";
import { pickAttribution, hasFullInlineAttribution } from "@/lib/leads/attribution";

describe("pickAttribution — inline values", () => {
  it("reads every field straight off a fully-mapped webhook body", () => {
    expect(
      pickAttribution({
        leadgen_id: "meta-lead-1",
        campaign_id: "camp-1",
        adset_id: "adset-1",
        adgroup_id: "ad-1",
        form_id: "form-1",
        ad_name: "WW — Full Monty — Menlyn",
      })
    ).toEqual({
      campaign_id: "camp-1",
      adset_id: "adset-1",
      ad_id: "ad-1",
      form_id: "form-1",
      ad_name: "WW — Full Monty — Menlyn",
    });
  });

  it("returns all-null for a body carrying no attribution at all (today's live Make body)", () => {
    expect(pickAttribution({ leadgen_id: "meta-lead-1", page_id: "p1", campaign_name: "We Wash — Leads" })).toEqual({
      campaign_id: null,
      adset_id: null,
      ad_id: null,
      form_id: null,
      ad_name: null,
    });
  });

  it("never throws on junk input", () => {
    for (const junk of [null, undefined, "string", 42, [], true]) {
      expect(pickAttribution(junk)).toEqual({
        campaign_id: null,
        adset_id: null,
        ad_id: null,
        form_id: null,
        ad_name: null,
      });
    }
  });
});

describe("pickAttribution — alias tolerance", () => {
  it("accepts the meta_-prefixed aliases when the plain keys are absent", () => {
    expect(
      pickAttribution({
        meta_campaign_id: "camp-2",
        meta_adset_id: "adset-2",
        meta_ad_id: "ad-2",
        meta_form_id: "form-2",
        meta_ad_name: "Sparkling — Amanzimtoti",
      })
    ).toEqual({
      campaign_id: "camp-2",
      adset_id: "adset-2",
      ad_id: "ad-2",
      form_id: "form-2",
      ad_name: "Sparkling — Amanzimtoti",
    });
  });

  it("accepts adgroup_id_parent as an adset alias", () => {
    expect(pickAttribution({ adgroup_id_parent: "adset-3" }).adset_id).toBe("adset-3");
  });

  it("takes the first non-empty alias in order", () => {
    const attr = pickAttribution({ ad_id: "second-choice", meta_ad_id: "third-choice", adgroup_id: "first-choice" });
    expect(attr.ad_id).toBe("first-choice");
    expect(pickAttribution({ ad_id: "second-choice", meta_ad_id: "third-choice" }).ad_id).toBe("second-choice");
    expect(pickAttribution({ meta_ad_id: "third-choice" }).ad_id).toBe("third-choice");
  });

  it("NEVER reads adgroup_id as the adset id — that key is Meta's AD id", () => {
    const attr = pickAttribution({ adgroup_id: "ad-9" });
    expect(attr.ad_id).toBe("ad-9");
    expect(attr.adset_id).toBeNull();
  });
});

describe("pickAttribution — normalisation", () => {
  it("coerces numeric ids to strings (Make may send them unquoted; the columns are text)", () => {
    // Real, safe-integer Meta ids (the live Slot Pilot form id among them).
    expect(
      pickAttribution({ campaign_id: 6512345678901, adset_id: 6512345678902, adgroup_id: 6512345678903, form_id: 1023465583947231 })
    ).toEqual({
      campaign_id: "6512345678901",
      adset_id: "6512345678902",
      ad_id: "6512345678903",
      form_id: "1023465583947231",
      ad_name: null,
    });
    for (const v of Object.values(pickAttribution({ campaign_id: 1023465583947231 }))) {
      if (v !== null) expect(typeof v).toBe("string");
    }
  });

  it("still yields a string for an id past MAX_SAFE_INTEGER (precision is lost upstream, at JSON.parse)", () => {
    // Documents a real limit: an 18-digit unquoted id is already mangled before it
    // reaches us. Coercion keeps it a string; only Make quoting the id truly fixes it.
    const mangled = pickAttribution({ campaign_id: 120210000000000001 }).campaign_id;
    expect(typeof mangled).toBe("string");
    expect(mangled).toBe(String(120210000000000001));
  });

  it("treats empty and whitespace-only strings as absent, so the Graph fallback still runs", () => {
    const attr = pickAttribution({ campaign_id: "", adset_id: "   ", ad_id: "", form_id: "", ad_name: "" });
    expect(attr).toEqual({ campaign_id: null, adset_id: null, ad_id: null, form_id: null, ad_name: null });
    expect(hasFullInlineAttribution(attr)).toBe(false);
  });

  it("falls past an empty alias to the next populated one", () => {
    expect(pickAttribution({ campaign_id: "", meta_campaign_id: "camp-fallback" }).campaign_id).toBe("camp-fallback");
    expect(pickAttribution({ adgroup_id: "  ", ad_id: "ad-fallback" }).ad_id).toBe("ad-fallback");
  });

  it("trims surrounding whitespace", () => {
    expect(pickAttribution({ campaign_id: "  camp-4  ", ad_name: "  Full Monty  " })).toMatchObject({
      campaign_id: "camp-4",
      ad_name: "Full Monty",
    });
  });

  it("ignores non-id types (null, booleans, objects, NaN)", () => {
    expect(
      pickAttribution({ campaign_id: null, adset_id: true, ad_id: { id: "x" }, form_id: NaN, ad_name: [] })
    ).toEqual({ campaign_id: null, adset_id: null, ad_id: null, form_id: null, ad_name: null });
  });
});

describe("hasFullInlineAttribution — Graph skip decision", () => {
  it("is true only when BOTH campaign_id and adset_id came inline", () => {
    expect(hasFullInlineAttribution(pickAttribution({ campaign_id: "c", adset_id: "a" }))).toBe(true);
    expect(hasFullInlineAttribution(pickAttribution({ campaign_id: "c" }))).toBe(false);
    expect(hasFullInlineAttribution(pickAttribution({ adset_id: "a" }))).toBe(false);
    expect(hasFullInlineAttribution(pickAttribution({}))).toBe(false);
  });

  it("is true for numeric inline ids (coerced) — no wasted Graph round trip", () => {
    expect(hasFullInlineAttribution(pickAttribution({ campaign_id: 123, adset_id: 456 }))).toBe(true);
  });

  it("is false when only ad_id/form_id arrived — the Graph fallback is still needed", () => {
    expect(hasFullInlineAttribution(pickAttribution({ adgroup_id: "ad-1", form_id: "form-1" }))).toBe(false);
  });
});

describe("pickAttribution — reused to normalise the Graph fallback response", () => {
  it("normalises a Graph lead-node response the same way as an inline body", () => {
    expect(pickAttribution({ campaign_id: "camp-g", adset_id: "adset-g", form_id: "form-g", id: "lead-g" })).toMatchObject({
      campaign_id: "camp-g",
      adset_id: "adset-g",
      form_id: "form-g",
    });
  });

  it("yields nulls for a Graph error payload, so a failed call cannot corrupt attribution", () => {
    // The live shape today: app in development mode → OAuthException #3, no id fields.
    expect(
      pickAttribution({ error: { message: "(#3) Apps in dev mode should only access leads submitted from App special roles", code: 3 } })
    ).toEqual({ campaign_id: null, adset_id: null, ad_id: null, form_id: null, ad_name: null });
  });
});
