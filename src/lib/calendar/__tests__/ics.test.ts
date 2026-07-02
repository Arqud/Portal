import { describe, expect, it } from "vitest";
import { parseICS } from "@/lib/calendar/ics";

const wrap = (body: string) =>
  ["BEGIN:VCALENDAR", "VERSION:2.0", body, "END:VCALENDAR"].join("\r\n");

describe("parseICS", () => {
  it("parses a timed UTC event with folded + escaped summary", () => {
    const ics = wrap(
      [
        "BEGIN:VEVENT",
        "UID:abc@google.com",
        "DTSTART:20260702T040000Z",
        "DTEND:20260702T060000Z",
        "SUMMARY:Content block\\, film",
        "  & post",
        "END:VEVENT",
      ].join("\r\n")
    );
    const [e] = parseICS(ics);
    expect(e.uid).toBe("abc@google.com");
    expect(e.summary).toBe("Content block, film & post");
    expect(e.allDay).toBe(false);
    expect(e.start.getTime()).toBe(Date.UTC(2026, 6, 2, 4, 0, 0));
    expect(e.end?.getTime()).toBe(Date.UTC(2026, 6, 2, 6, 0, 0));
  });

  it("parses all-day events and naive local times", () => {
    const ics = wrap(
      [
        "BEGIN:VEVENT",
        "UID:allday",
        "DTSTART;VALUE=DATE:20260706",
        "DTEND;VALUE=DATE:20260707",
        "SUMMARY:Holiday",
        "END:VEVENT",
        "BEGIN:VEVENT",
        "UID:local",
        "DTSTART;TZID=Africa/Johannesburg:20260702T060000",
        "SUMMARY:Morning block",
        "END:VEVENT",
      ].join("\r\n")
    );
    const [a, b] = parseICS(ics);
    expect(a.allDay).toBe(true);
    expect(a.start.getFullYear()).toBe(2026);
    expect(a.start.getMonth()).toBe(6);
    expect(a.start.getDate()).toBe(6);
    expect(b.allDay).toBe(false);
    expect(b.start.getHours()).toBe(6);
  });

  it("captures RRULE + EXDATE and skips cancelled events", () => {
    const ics = wrap(
      [
        "BEGIN:VEVENT",
        "UID:rec",
        "DTSTART:20260701T050000Z",
        "RRULE:FREQ=DAILY;COUNT=10",
        "EXDATE:20260703T050000Z",
        "SUMMARY:Routine",
        "END:VEVENT",
        "BEGIN:VEVENT",
        "UID:gone",
        "DTSTART:20260701T050000Z",
        "STATUS:CANCELLED",
        "SUMMARY:Cancelled thing",
        "END:VEVENT",
      ].join("\r\n")
    );
    const events = parseICS(ics);
    expect(events).toHaveLength(1);
    expect(events[0].rrule).toBe("FREQ=DAILY;COUNT=10");
    expect(events[0].exdates).toEqual(["20260703T050000Z"]);
  });
});
