// Pure iCalendar (RFC 5545) VEVENT parser — just enough for Google Calendar's
// secret-address feeds. Recurrence strings are captured raw and expanded in
// expand.ts (rrule library); this file has no dependencies.

export type IcsEvent = {
  uid: string;
  summary: string;
  start: Date;
  end: Date | null;
  allDay: boolean;
  rrule: string | null;
  exdates: string[];
};

/** Join folded lines: CRLF (or LF) followed by a space/tab continues the line. */
function unfold(text: string): string {
  return text.replace(/\r?\n[ \t]/g, "");
}

function unescapeText(s: string): string {
  return s
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

/** Parse an iCal date/date-time value. All-day = 8-digit date. `Z` = UTC. Else local. */
export function parseIcsDate(value: string): { date: Date; allDay: boolean } | null {
  const dateOnly = /^(\d{4})(\d{2})(\d{2})$/.exec(value);
  if (dateOnly) {
    const [, y, m, d] = dateOnly;
    return { date: new Date(Number(y), Number(m) - 1, Number(d)), allDay: true };
  }
  const dt = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/.exec(value);
  if (!dt) return null;
  const [, y, m, d, hh, mm, ss, z] = dt;
  const date = z
    ? new Date(Date.UTC(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm), Number(ss)))
    : new Date(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm), Number(ss));
  return { date, allDay: false };
}

/** Split one content line into property name and value (params between ; and :). */
function splitLine(line: string): { name: string; value: string } | null {
  const colon = line.indexOf(":");
  if (colon === -1) return null;
  const left = line.slice(0, colon);
  const name = left.split(";")[0].toUpperCase();
  return { name, value: line.slice(colon + 1) };
}

export function parseICS(text: string): IcsEvent[] {
  const lines = unfold(text).split(/\r?\n/);
  const events: IcsEvent[] = [];
  let cur: Partial<IcsEvent> & { cancelled?: boolean } | null = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (line === "BEGIN:VEVENT") {
      cur = { exdates: [], rrule: null, end: null, summary: "", uid: "" };
      continue;
    }
    if (line === "END:VEVENT") {
      if (cur && cur.start && !cur.cancelled) {
        events.push({
          uid: cur.uid || `${cur.start.getTime()}-${cur.summary}`,
          summary: cur.summary ?? "",
          start: cur.start,
          end: cur.end ?? null,
          allDay: cur.allDay ?? false,
          rrule: cur.rrule ?? null,
          exdates: cur.exdates ?? [],
        });
      }
      cur = null;
      continue;
    }
    if (!cur) continue;

    const prop = splitLine(line);
    if (!prop) continue;
    switch (prop.name) {
      case "UID":
        cur.uid = prop.value;
        break;
      case "SUMMARY":
        cur.summary = unescapeText(prop.value);
        break;
      case "DTSTART": {
        const p = parseIcsDate(prop.value);
        if (p) {
          cur.start = p.date;
          cur.allDay = p.allDay;
        }
        break;
      }
      case "DTEND": {
        const p = parseIcsDate(prop.value);
        if (p) cur.end = p.date;
        break;
      }
      case "RRULE":
        cur.rrule = prop.value;
        break;
      case "EXDATE":
        // EXDATE can hold a comma-separated list
        cur.exdates = [...(cur.exdates ?? []), ...prop.value.split(",").map((v) => v.trim()).filter(Boolean)];
        break;
      case "STATUS":
        if (prop.value.toUpperCase() === "CANCELLED") cur.cancelled = true;
        break;
    }
  }
  return events;
}
