import type { TaskStatus, TaskPriority } from "./types";

export type ICSTask = {
  id: string;
  title: string;
  due_date: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  client_label?: string | null;
};

function esc(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export function toICS(tasks: ICSTask[], domain: string): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ARQUD//Portal//EN",
    "CALSCALE:GREGORIAN",
    "X-WR-CALNAME:ARQUD Tasks",
  ];
  for (const t of tasks) {
    if (!t.due_date) continue;
    const date = t.due_date.replace(/-/g, "");
    const summary = t.client_label ? `${t.client_label} — ${t.title}` : t.title;
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:task-${t.id}@${domain}`);
    lines.push(`DTSTART;VALUE=DATE:${date}`);
    lines.push(`SUMMARY:${esc(summary)}`);
    lines.push(`DESCRIPTION:${esc(`Priority: ${t.priority} · Status: ${t.status}`)}`);
    lines.push(`STATUS:${t.status === "done" ? "COMPLETED" : "CONFIRMED"}`);
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}
