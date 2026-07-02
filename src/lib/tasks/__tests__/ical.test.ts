import { describe, expect, it } from "vitest";
import { toICS } from "@/lib/tasks/ical";

describe("toICS", () => {
  it("emits a VCALENDAR with only due-dated tasks and CRLF", () => {
    const ics = toICS(
      [
        { id: "1", title: "Call Letitia", due_date: "2026-07-02", status: "todo", priority: "high" },
        { id: "2", title: "No date task", due_date: null, status: "todo", priority: "low" },
        { id: "3", title: "Done task", due_date: "2026-07-01", status: "done", priority: "low", client_label: "We Wash" },
      ],
      "arqudportal.co.za"
    );
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("END:VCALENDAR");
    expect(ics).toContain("\r\n");
    expect(ics).toContain("SUMMARY:Call Letitia");
    expect(ics).toContain("DTSTART;VALUE=DATE:20260702");
    expect(ics).toContain("SUMMARY:We Wash — Done task");
    expect(ics).toContain("STATUS:COMPLETED");
    expect(ics).not.toContain("No date task");
  });

  it("escapes commas, semicolons, backslashes", () => {
    const ics = toICS([{ id: "1", title: "A, B; C\\D", due_date: "2026-07-02", status: "todo", priority: "med" }], "d.co");
    expect(ics).toContain("SUMMARY:A\\, B\\; C\\\\D");
  });
});
