import { cn } from "@/lib/cn";

const WIDTH = 460;
const HEIGHT = 150;
const PADDING = 6;

export function AreaChart({ points, className }: { points: number[]; className?: string }) {
  if (!points || points.length === 0) return null;

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const usableHeight = HEIGHT - PADDING * 2;
  const step = points.length > 1 ? WIDTH / (points.length - 1) : 0;

  const coords = points.map((p, i) => {
    const x = points.length > 1 ? i * step : WIDTH / 2;
    const y = PADDING + usableHeight - ((p - min) / range) * usableHeight;
    return [x, y] as const;
  });

  const linePath = coords
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`)
    .join(" ");

  const [lastX, lastY] = coords[coords.length - 1];
  const [firstX] = coords[0];
  const areaPath = `${linePath} L${lastX.toFixed(2)},${HEIGHT} L${firstX.toFixed(2)},${HEIGHT} Z`;

  const gradientId = "arqud-area-gradient";

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className={cn("w-full h-auto", className)}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(200,169,110,.45)" />
          <stop offset="100%" stopColor="rgba(200,169,110,0)" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradientId})`} stroke="none" />
      <path d={linePath} fill="none" stroke="#c8a96e" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastX} cy={lastY} r={4} fill="#c8a96e" />
    </svg>
  );
}
