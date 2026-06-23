export function PageHeader({ title, count, children }: { title: string; count?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 mb-5 sm:flex-row sm:justify-between sm:items-center">
      <h1 className="font-display text-arqud-bone text-[22px] sm:text-[26px] m-0">{title}{count && <small className="text-arqud-muted text-xs font-body ml-2.5">{count}</small>}</h1>
      {children && <div className="flex gap-2.5 items-center shrink-0">{children}</div>}
    </div>
  );
}
