import { describe, expect, it } from "vitest";
import { expandOccurrences } from "@/lib/calendar/expand";
import type { IcsEvent } from "@/lib/calendar/ics";

const ev = (o: Partial<IcsEvent>): IcsEvent => ({
  uid: o.uid ?? "u",
  summary: o.summary ?? "E",
  start: o.start ?? new Date(2026, 6, 2, 6, 0, 0),
  end: o.end ?? null,
  allDay: o.allDay ?? false,
  rrule: o.rrule ?? null,
  exdates: o.exdates ?? [],
});

const win = (a: string, b: string) => [new Date(a), new Date(b)] as const;

describe("expandOccurrences", () => {
  it("includes a single event inside the window, excludes outside", () => {
    const [ws, we] = win("2026-07-01T00:00:00", "2026-07-31T23:59:59");
    const out = expandOccurrences(
      [
        ev({ uid: "in", start: new Date(2026, 6, 10, 9), end: new Date(2026, 6, 10, 10) }),
        ev({ uid: "out", start: new Date(2026, 7, 5, 9) }),
      ],
      ws,
      we
    );
    expect(out.map((o) => o.uid)).toEqual(["in"]);
    expect(out[0].end.getTime() - out[0].start.getTime()).toBe(60 * 60 * 1000);
  });

  it("expands FREQ=DAILY;COUNT=5 with duration preserved and honors EXDATE", () => {
    const [ws, we] = win("2026-07-01T00:00:00", "2026-07-10T00:00:00");
    const start = new Date(2026, 6, 1, 6, 0, 0);
    const end = new Date(2026, 6, 1, 8, 0, 0);
    const exdate = "20260703T060000"; // local-form exdate for the 3rd
    const out = expandOccurrences([ev({ uid: "r", start, end, rrule: "FREQ=DAILY;COUNT=5", exdates: [exdate] })], ws, we);
    expect(out).toHaveLength(4); // 5 minus 1 exdate
    expect(out[0].end.getTime() - out[0].start.getTime()).toBe(2 * 60 * 60 * 1000);
    expect(out.some((o) => o.start.getDate() === 3)).toBe(false);
  });

  it("gives all-day events a 1-day default end and sorts output", () => {
    const [ws, we] = win("2026-07-01T00:00:00", "2026-07-31T23:59:59");
    const out = expandOccurrences(
      [
        ev({ uid: "b", start: new Date(2026, 6, 10), allDay: true }),
        ev({ uid: "a", start: new Date(2026, 6, 5), allDay: true }),
      ],
      ws,
      we
    );
    expect(out.map((o) => o.uid)).toEqual(["a", "b"]);
    expect(out[0].end.getTime() - out[0].start.getTime()).toBe(24 * 60 * 60 * 1000);
  });
});
