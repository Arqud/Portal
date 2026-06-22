import { KpiCard } from "@/components/ui";

function fmt(n: number) {
  return `R ${n.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`;
}

type Props = {
  invoicedThisMonth: number;
  collectedThisMonth: number;
  outstanding: number;
  overdue: number;
  ytd: number;
};

export function RevenueSummary({ invoicedThisMonth, collectedThisMonth, outstanding, overdue, ytd }: Props) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 mb-8">
      <KpiCard label="Invoiced This Month" value={fmt(invoicedThisMonth)} />
      <KpiCard label="Collected This Month" value={fmt(collectedThisMonth)} />
      <KpiCard
        label="Outstanding"
        value={fmt(outstanding)}
        trend={outstanding > 0 ? { dir: "down", text: "needs follow-up" } : undefined}
      />
      <KpiCard
        label="Overdue"
        value={fmt(overdue)}
        trend={overdue > 0 ? { dir: "down", text: "past due date" } : undefined}
      />
      <KpiCard label="Year to Date" value={fmt(ytd)} />
    </div>
  );
}
