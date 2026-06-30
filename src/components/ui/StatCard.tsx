import { Sparkline } from "./Sparkline";

export function StatCard({
  label,
  value,
  trend,
  trendTone = "pos",
  points,
}: {
  label: string;
  value: string;
  trend?: string;
  trendTone?: "pos" | "neg";
  points?: number[];
}) {
  return (
    <div className="rounded-card border border-arqud-line panel-gradient p-[18px] shadow-[var(--shadow-card)]">
      <div className="text-[9.5px] uppercase tracking-[0.13em] text-arqud-muted">{label}</div>
      <div className="stat-number mt-[9px] text-[25px] break-words leading-tight">{value}</div>
      {(trend || points) && (
        <div className="mt-[11px] flex items-center justify-between gap-2">
          {trend && (
            <span className={`text-[10.5px] font-semibold ${trendTone === "pos" ? "text-arqud-green" : "text-arqud-amber"}`}>
              {trend}
            </span>
          )}
          {points && <Sparkline points={points} tone={trendTone} />}
        </div>
      )}
    </div>
  );
}
