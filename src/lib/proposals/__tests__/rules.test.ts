import { describe, expect, it } from "vitest";
import { canAccept } from "@/lib/proposals/rules";

// 10:00 UTC = 12:00 SAST on 2026-07-11 — unambiguous "today" for date-only checks.
const today = new Date("2026-07-11T10:00:00Z");

describe("canAccept", () => {
  it("blocks a draft proposal", () => {
    expect(canAccept({ status: "draft", valid_until: null }, today)).toEqual({
      ok: false,
      reason: "draft",
    });
  });

  it("blocks an already-accepted proposal", () => {
    expect(canAccept({ status: "accepted", valid_until: null }, today)).toEqual({
      ok: false,
      reason: "accepted",
    });
  });

  it("blocks a declined proposal", () => {
    expect(canAccept({ status: "declined", valid_until: null }, today)).toEqual({
      ok: false,
      reason: "declined",
    });
  });

  it("allows a sent proposal with no valid_until", () => {
    expect(canAccept({ status: "sent", valid_until: null }, today)).toEqual({ ok: true });
  });

  it("blocks a sent proposal whose valid_until was yesterday", () => {
    expect(canAccept({ status: "sent", valid_until: "2026-07-10" }, today)).toEqual({
      ok: false,
      reason: "expired",
    });
  });

  it("allows a sent proposal whose valid_until is today (inclusive)", () => {
    expect(canAccept({ status: "sent", valid_until: "2026-07-11" }, today)).toEqual({ ok: true });
  });

  it("allows a sent proposal whose valid_until is in the future", () => {
    expect(canAccept({ status: "sent", valid_until: "2026-08-01" }, today)).toEqual({ ok: true });
  });

  it("compares dates in SAST — 22:30 UTC is already the next day in Johannesburg", () => {
    // 2026-07-10T22:30Z = 2026-07-11 00:30 SAST, so a 2026-07-10 deadline has passed.
    const lateNightUtc = new Date("2026-07-10T22:30:00Z");
    expect(canAccept({ status: "sent", valid_until: "2026-07-10" }, lateNightUtc)).toEqual({
      ok: false,
      reason: "expired",
    });
  });

  it("defaults today to the current date when not injected", () => {
    // A far-future deadline is acceptable regardless of when the test runs.
    expect(canAccept({ status: "sent", valid_until: "2999-12-31" })).toEqual({ ok: true });
  });
});
