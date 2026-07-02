import { RRule } from "rrule";
import { parseIcsDate, type IcsEvent } from "./ics";

export type Occurrence = {
  uid: string;
  summary: string;
  start: Date;
  end: Date;
  allDay: boolean;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function durationOf(ev: IcsEvent): number {
  if (ev.end) return Math.max(0, ev.end.getTime() - ev.start.getTime());
  return ev.allDay ? DAY_MS : 0;
}

/** Expand events (incl. RRULE recurrence) into concrete occurrences inside [winStart, winEnd]. */
export function expandOccurrences(events: IcsEvent[], winStart: Date, winEnd: Date): Occurrence[] {
  const out: Occurrence[] = [];

  for (const ev of events) {
    const dur = durationOf(ev);

    if (!ev.rrule) {
      const effEnd = new Date(ev.start.getTime() + dur);
      if (ev.start < winEnd && effEnd > winStart) {
        out.push({ uid: ev.uid, summary: ev.summary, start: ev.start, end: effEnd, allDay: ev.allDay });
      }
      continue;
    }

    // Recurring: expand with rrule, then drop EXDATE occurrences.
    let starts: Date[] = [];
    try {
      const rule = new RRule({ ...RRule.parseString(ev.rrule), dtstart: ev.start });
      starts = rule.between(new Date(winStart.getTime() - dur), winEnd, true);
    } catch {
      continue; // unparseable rule — skip rather than crash the calendar
    }
    const excluded = new Set(
      ev.exdates
        .map((x) => parseIcsDate(x)?.date.getTime())
        .filter((t): t is number => typeof t === "number")
    );
    for (const s of starts) {
      if (excluded.has(s.getTime())) continue;
      const e = new Date(s.getTime() + dur);
      if (s < winEnd && e > winStart) {
        out.push({ uid: ev.uid, summary: ev.summary, start: s, end: e, allDay: ev.allDay });
      }
    }
  }

  return out.sort((a, b) => a.start.getTime() - b.start.getTime());
}
