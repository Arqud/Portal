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

// Normalise a SA phone number to E.164 digits for a wa.me link (0821234567 → 27821234567).
export function toE164(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) return "27" + digits.slice(1);
  return digits;
}
