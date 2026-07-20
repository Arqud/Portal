import { describe, expect, it } from "vitest";
import {
  BOOKING_OUTCOMES,
  parseOutcomePayload,
  shouldApplyDenormalizedUpdate,
} from "@/lib/bookings/validate";

const LEAD_ID = "5c1f8a7e-9b2d-4c3a-8e6f-1a2b3c4d5e6f";
const FIXED_NOW = () => new Date("2026-07-20T12:00:00.000Z");

describe("parseOutcomePayload — valid payloads", () => {
  it("accepts a full payload and normalises timestamps to canonical ISO", () => {
    const result = parseOutcomePayload({
      lead_id: LEAD_ID,
      outcome: "booked",
      occurred_at: "2026-07-20T10:00:00+02:00", // SAST offset in, UTC out
      booking_time: "2026-07-22T09:30:00.000Z",
      booking_id: "HL-12345",
    });
    expect(result).toEqual({
      ok: true,
      payload: {
        lead_id: LEAD_ID,
        outcome: "booked",
        occurred_at: "2026-07-20T08:00:00.000Z",
        booking_time: "2026-07-22T09:30:00.000Z",
        booking_id: "HL-12345",
      },
    });
  });

  it("accepts a minimal payload — only lead_id and outcome are required", () => {
    const result = parseOutcomePayload({ lead_id: LEAD_ID, outcome: "no_show" }, FIXED_NOW);
    expect(result).toEqual({
      ok: true,
      payload: {
        lead_id: LEAD_ID,
        outcome: "no_show",
        occurred_at: "2026-07-20T12:00:00.000Z",
        booking_time: null,
        booking_id: null,
      },
    });
  });

  it("accepts every outcome in the vocabulary", () => {
    for (const outcome of BOOKING_OUTCOMES) {
      const result = parseOutcomePayload({ lead_id: LEAD_ID, outcome });
      expect(result.ok).toBe(true);
    }
  });

  it("defaults occurred_at to now when omitted", () => {
    const result = parseOutcomePayload({ lead_id: LEAD_ID, outcome: "showed" }, FIXED_NOW);
    expect(result.ok && result.payload.occurred_at).toBe("2026-07-20T12:00:00.000Z");
  });

  it("ignores unknown extra keys — the sender may add fields later", () => {
    const result = parseOutcomePayload({
      lead_id: LEAD_ID,
      outcome: "cancelled",
      occurred_at: "2026-07-20T10:00:00.000Z",
      notes: "customer called to cancel",
      some_future_field: { nested: true },
    });
    expect(result).toEqual({
      ok: true,
      payload: {
        lead_id: LEAD_ID,
        outcome: "cancelled",
        occurred_at: "2026-07-20T10:00:00.000Z",
        booking_time: null,
        booking_id: null,
      },
    });
  });

  it("treats a blank booking_id as absent", () => {
    const result = parseOutcomePayload({ lead_id: LEAD_ID, outcome: "booked", booking_id: "  " });
    expect(result.ok && result.payload.booking_id).toBe(null);
  });
});

describe("parseOutcomePayload — rejections name the bad field", () => {
  it("rejects a non-object body", () => {
    expect(parseOutcomePayload(null)).toEqual({ ok: false, error: "body must be a JSON object" });
    expect(parseOutcomePayload("booked")).toEqual({ ok: false, error: "body must be a JSON object" });
    expect(parseOutcomePayload([{ lead_id: LEAD_ID }])).toEqual({ ok: false, error: "body must be a JSON object" });
  });

  it("rejects a missing or non-UUID lead_id", () => {
    expect(parseOutcomePayload({ outcome: "booked" })).toEqual({ ok: false, error: "invalid lead_id" });
    expect(parseOutcomePayload({ lead_id: "12345", outcome: "booked" })).toEqual({ ok: false, error: "invalid lead_id" });
    expect(parseOutcomePayload({ lead_id: "not-a-uuid-at-all-just-text", outcome: "booked" })).toEqual({ ok: false, error: "invalid lead_id" });
    expect(parseOutcomePayload({ lead_id: 42, outcome: "booked" })).toEqual({ ok: false, error: "invalid lead_id" });
  });

  it("rejects an outcome outside the vocabulary", () => {
    expect(parseOutcomePayload({ lead_id: LEAD_ID, outcome: "attended" })).toEqual({ ok: false, error: "invalid outcome" });
    expect(parseOutcomePayload({ lead_id: LEAD_ID, outcome: "BOOKED" })).toEqual({ ok: false, error: "invalid outcome" });
    expect(parseOutcomePayload({ lead_id: LEAD_ID })).toEqual({ ok: false, error: "invalid outcome" });
  });

  it("rejects an unparseable occurred_at", () => {
    expect(parseOutcomePayload({ lead_id: LEAD_ID, outcome: "booked", occurred_at: "yesterday-ish" })).toEqual({ ok: false, error: "invalid occurred_at" });
    expect(parseOutcomePayload({ lead_id: LEAD_ID, outcome: "booked", occurred_at: 1752998400 })).toEqual({ ok: false, error: "invalid occurred_at" });
  });

  it("rejects an unparseable booking_time", () => {
    expect(parseOutcomePayload({ lead_id: LEAD_ID, outcome: "booked", booking_time: "next tuesday" })).toEqual({ ok: false, error: "invalid booking_time" });
  });

  it("rejects a non-string booking_id", () => {
    expect(parseOutcomePayload({ lead_id: LEAD_ID, outcome: "booked", booking_id: 12345 })).toEqual({ ok: false, error: "invalid booking_id" });
  });
});

describe("shouldApplyDenormalizedUpdate — out-of-order guard", () => {
  it("applies when the lead has never had a booking update", () => {
    expect(shouldApplyDenormalizedUpdate(null, "2026-07-20T10:00:00.000Z")).toBe(true);
  });

  it("applies when the event is newer than the stored state", () => {
    expect(
      shouldApplyDenormalizedUpdate("2026-07-20T10:00:00.000Z", "2026-07-20T11:00:00.000Z"),
    ).toBe(true);
  });

  it("applies on an exact tie — same-instant delivery must not be dropped", () => {
    expect(
      shouldApplyDenormalizedUpdate("2026-07-20T10:00:00.000Z", "2026-07-20T10:00:00.000Z"),
    ).toBe(true);
  });

  it("skips when the stored state is strictly newer (stale out-of-order delivery)", () => {
    expect(
      shouldApplyDenormalizedUpdate("2026-07-20T11:00:00.000Z", "2026-07-20T10:00:00.000Z"),
    ).toBe(false);
  });

  it("compares instants, not strings — timezone offsets are honoured", () => {
    // 12:00+02:00 is 10:00Z; an 11:00Z event is fresher despite sorting lower as a string.
    expect(
      shouldApplyDenormalizedUpdate("2026-07-20T12:00:00+02:00", "2026-07-20T11:00:00.000Z"),
    ).toBe(true);
  });

  it("applies when the stored value is unparseable — staleness must be proven, not assumed", () => {
    expect(shouldApplyDenormalizedUpdate("garbage", "2026-07-20T10:00:00.000Z")).toBe(true);
  });
});
