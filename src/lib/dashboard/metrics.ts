export type InvoiceLite = { amount: number; status: string; issue_date: string; paid_at?: string | null };
export type TxLite = { amount: number; date: string };
export type QuoteLite = { quote_number: string; total: number; status: string; client_label?: string };
export type LeadLite = { created_at: string };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const ym = (d: Date) => d.getFullYear() * 12 + d.getMonth();
const parse = (s?: string | null) => (s ? new Date(s.length <= 10 ? s + "T00:00:00" : s) : null);

export function outstandingTotal(invoices: InvoiceLite[]): number {
  return invoices
    .filter((i) => i.status === "pending" || i.status === "overdue")
    .reduce((s, i) => s + i.amount, 0);
}

export function collectedInMonth(invoices: InvoiceLite[], ref: Date): number {
  return invoices
    .filter((i) => {
      const p = parse(i.paid_at);
      return i.status === "paid" && p && ym(p) === ym(ref);
    })
    .reduce((s, i) => s + i.amount, 0);
}

export function collectedYTD(invoices: InvoiceLite[], ref: Date): number {
  return invoices
    .filter((i) => {
      const p = parse(i.paid_at);
      return i.status === "paid" && p && p.getFullYear() === ref.getFullYear() && p <= ref;
    })
    .reduce((s, i) => s + i.amount, 0);
}

export function invoicedInMonth(invoices: InvoiceLite[], ref: Date): number {
  return invoices
    .filter((i) => {
      const d = parse(i.issue_date);
      return d && ym(d) === ym(ref);
    })
    .reduce((s, i) => s + i.amount, 0);
}

export function revenueByMonth(invoices: InvoiceLite[], ref: Date, months: number) {
  const out: { label: string; invoiced: number; collected: number }[] = [];
  for (let k = months - 1; k >= 0; k--) {
    const d = new Date(ref.getFullYear(), ref.getMonth() - k, 1);
    const bucket = ym(d);
    const invoiced = invoices
      .filter((i) => {
        const x = parse(i.issue_date);
        return x && ym(x) === bucket;
      })
      .reduce((s, i) => s + i.amount, 0);
    const collected = invoices
      .filter((i) => {
        const x = parse(i.paid_at);
        return i.status === "paid" && x && ym(x) === bucket;
      })
      .reduce((s, i) => s + i.amount, 0);
    out.push({ label: MONTHS[d.getMonth()], invoiced, collected });
  }
  return out;
}

export function cashflow(tx: TxLite[], ref: Date) {
  const inMonth = tx.filter((t) => {
    const d = parse(t.date);
    return d && ym(d) === ym(ref);
  });
  const income = inMonth.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const expenses = inMonth.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  const net = income - expenses;
  const marginPct = income > 0 ? Math.round((net / income) * 100) : 0;
  return { income, expenses, net, marginPct };
}

export function cashflowYTD(tx: TxLite[], ref: Date) {
  const inYear = tx.filter((t) => {
    const d = parse(t.date);
    return d && d.getFullYear() === ref.getFullYear() && d <= ref;
  });
  const income = inYear.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const expenses = inYear.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  const net = income - expenses;
  const marginPct = income > 0 ? Math.round((net / income) * 100) : 0;
  return { income, expenses, net, marginPct };
}

export function pipeline(quotes: QuoteLite[]) {
  const live = quotes.filter((q) => q.status !== "rejected");
  const open = live.reduce((s, q) => s + q.total, 0);
  const deals = [...live].sort((a, b) => b.total - a.total).slice(0, 4);
  return { open, deals };
}

export function leadStats(leads: LeadLite[], ref: Date) {
  const month = leads.filter((l) => {
    const d = parse(l.created_at);
    return d && ym(d) === ym(ref);
  }).length;
  const weekAgo = new Date(ref);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const week = leads.filter((l) => {
    const d = parse(l.created_at);
    return d && d >= weekAgo && d <= ref;
  }).length;
  const d30Start = new Date(ref);
  d30Start.setDate(d30Start.getDate() - 30);
  const d30 = leads.filter((l) => {
    const d = parse(l.created_at);
    return d && d >= d30Start && d <= ref;
  }).length;
  return { month, week, d30 };
}
