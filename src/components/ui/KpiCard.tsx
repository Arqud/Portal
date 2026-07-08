import { cn } from "@/lib/cn";
export function KpiCard({ label, value, trend }: { label: string; value: string; trend?: { dir: "up" | "down"; text: string } }) {
  return (
    <div className="relative overflow-hidden panel-gradient border border-arqud-line rounded-card p-[18px] gold-topedge">
      <div className="text-[10px] tracking-[0.14em] uppercase text-arqud-muted">{label}</div>
      <div className="stat-number text-[20px] sm:text-[34px] my-3 break-normal leading-tight tabular-nums">{value}</div>
      {trend && <div className={cn("text-[11px] inline-flex items-center gap-1", trend.dir === "up" ? "text-arqud-green" : "text-arqud-amber")}>{trend.dir === "up" ? "▲" : "▼"} {trend.text}</div>}
    </div>
  );
}
