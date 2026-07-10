// Received date + 24h time, e.g. "09 Jul 2026, 13:11". Leads arrive all day,
// so the time matters for speed-to-lead. Rendered client-side → browser (SA) timezone.
export function formatDateTime(d: string) {
  return new Date(d).toLocaleString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
