import { cn } from "@/lib/cn";
export function Card({ title, caption, className, children }: { title?: string; caption?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("panel-gradient border border-arqud-line rounded-card p-[18px] shadow-[var(--shadow-card)]", className)}>
      {title && <h4 className="font-display text-arqud-bone text-[15px] font-medium m-0">{title}</h4>}
      {caption && <p className="text-[11px] text-arqud-muted mb-3.5 mt-0.5">{caption}</p>}
      {children}
    </div>
  );
}
