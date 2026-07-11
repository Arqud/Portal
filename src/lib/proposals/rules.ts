// Pure acceptance rules — no imports beyond types, injectable clock for tests.
// The server action re-checks these on every accept/decline; the public page
// uses the same helper so UI state and server behavior can never disagree.
import type { ProposalStatus } from "./types";

export type AcceptBlockReason = "draft" | "accepted" | "declined" | "expired";

// Date-only "YYYY-MM-DD" in SAST (Africa/Johannesburg) — recipients and
// valid_until both live in the client's timezone, not UTC.
function sastDate(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Johannesburg" }).format(d);
}

export function canAccept(
  p: { status: ProposalStatus; valid_until: string | null },
  today: Date = new Date(),
): { ok: true } | { ok: false; reason: AcceptBlockReason } {
  if (p.status === "draft") return { ok: false, reason: "draft" };
  if (p.status === "accepted") return { ok: false, reason: "accepted" };
  if (p.status === "declined") return { ok: false, reason: "declined" };
  // status === "sent": expired only when valid_until is strictly before today
  // (date-only, SAST) — the deadline day itself still accepts.
  if (p.valid_until && p.valid_until.slice(0, 10) < sastDate(today)) {
    return { ok: false, reason: "expired" };
  }
  return { ok: true };
}
