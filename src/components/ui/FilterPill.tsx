"use client";
import { cn } from "@/lib/cn";
export function FilterPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={cn("text-[10.5px] rounded-full px-3 py-1.5 border transition",
        active ? "text-arqud-gold-soft border-arqud-gold/45 bg-arqud-gold/10" : "text-arqud-bone-dim border-arqud-line-2 hover:text-arqud-bone")}>
      {children}
    </button>
  );
}
