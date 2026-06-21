import { cn } from "@/lib/cn";
export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("panel-gradient border border-arqud-line rounded-card px-4 py-1.5", className)}>{children}</div>;
}
export function Tr({ children, header, className }: { children: React.ReactNode; header?: boolean; className?: string }) {
  return <div className={cn("flex items-center gap-2.5 py-3", header ? "text-[9.5px] tracking-[0.13em] uppercase text-arqud-muted" : "border-t border-arqud-line/60 text-[12.5px] text-arqud-bone-dim hover:bg-arqud-gold/[0.025]", className)}>{children}</div>;
}
export function Td({ children, className }: { children: React.ReactNode; className?: string }) { return <div className={cn("min-w-0", className)}>{children}</div>; }
export function Avatar({ initials }: { initials: string }) {
  return <span className="w-[26px] h-[26px] rounded-full bg-arqud-line text-arqud-bone-dim flex items-center justify-center text-[10px] font-semibold shrink-0">{initials}</span>;
}
