export function Sparkline({ points, tone = "pos" }: { points: number[]; tone?: "pos" | "neg" }) {
  const w = 74;
  const h = 26;
  if (!points.length) return <svg width={w} height={h} aria-hidden />;
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const span = max - min || 1;
  const denom = points.length > 1 ? points.length - 1 : 1;
  const path = points
    .map((p, i) => `${(i / denom) * w},${h - ((p - min) / span) * (h - 4) - 2}`)
    .join(" ");
  const stroke = tone === "pos" ? "var(--color-arqud-green)" : "var(--color-arqud-amber)";
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden>
      <polyline fill="none" stroke={stroke} strokeWidth="2" points={path} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
