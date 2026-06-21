export function PageHeader({ title, count, children }: { title: string; count?: string; children?: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center mb-5">
      <h1 className="font-display text-arqud-bone text-[26px] m-0">{title}{count && <small className="text-arqud-muted text-xs font-body ml-2.5">{count}</small>}</h1>
      <div className="flex gap-2.5 items-center">{children}</div>
    </div>
  );
}
