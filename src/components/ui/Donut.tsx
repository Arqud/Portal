export function Donut({ pct, label }: { pct: number; label?: string }) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <svg width="92" height="92" viewBox="0 0 42 42" aria-hidden>
      <circle cx="21" cy="21" r="15.9" fill="none" stroke="var(--color-arqud-line-2)" strokeWidth="6" />
      <circle
        cx="21"
        cy="21"
        r="15.9"
        fill="none"
        stroke="var(--color-arqud-gold)"
        strokeWidth="6"
        strokeDasharray={`${clamped} 100`}
        strokeDashoffset="25"
        strokeLinecap="round"
      />
      <text x="21" y="20" textAnchor="middle" fontSize="8" fontFamily="Georgia" fontStyle="italic" fill="var(--color-arqud-gold)">
        {Math.round(clamped)}%
      </text>
      {label && (
        <text x="21" y="27" textAnchor="middle" fontSize="3.4" fill="var(--color-arqud-muted)">
          {label}
        </text>
      )}
    </svg>
  );
}
