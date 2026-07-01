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
    <div className="rounded-card border border-arqud-line panel-gradient p-3.5 sm:p-[18px] shadow-[var(--shadow-card)]">
      <div className="text-[9px] sm:text-[9.5px] uppercase tracking-[0.12em] text-arqud-muted leading-tight">{label}</div>
      <div className="stat-number mt-2 sm:mt-[9px] text-[19px] sm:text-[25px] break-words leading-tight">{value}</div>
      {(trend || points) && (
        <div className="mt-2.5 sm:mt-[11px] flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
          {trend && (
            <span className={`text-[10px] font-semibold ${trendTone === "pos" ? "text-arqud-green" : "text-arqud-amber"}`}>
              {trend}
            </span>
          )}
          {points && (
            <span className="hidden sm:block shrink-0">
              <Sparkline points={points} tone={trendTone} />
            </span>
          )}
        </div>
      )}
    </div>
  );
}
