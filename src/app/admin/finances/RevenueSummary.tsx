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
    <div className="grid grid-cols-5 gap-px bg-arqud-ink border border-arqud-ink mb-8">
      {[
        { label: "Invoiced This Month", value: fmt(invoicedThisMonth), color: "text-arqud-bone" },
        { label: "Collected This Month", value: fmt(collectedThisMonth), color: "text-green-400" },
        { label: "Outstanding", value: fmt(outstanding), color: "text-arqud-gold" },
        { label: "Overdue", value: fmt(overdue), color: "text-red-400" },
        { label: "Year to Date", value: fmt(ytd), color: "text-arqud-bone" },
      ].map(({ label, value, color }) => (
        <div key={label} className="bg-arqud-night px-6 py-5">
          <p className="text-xs uppercase tracking-widest text-arqud-muted mb-2">{label}</p>
          <p className={`font-display text-2xl ${color}`}>{value}</p>
        </div>
      ))}
    </div>
  );
}
