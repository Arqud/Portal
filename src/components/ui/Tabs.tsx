"use client";
import { cn } from "@/lib/cn";
export function Tabs({ tabs, value, onChange }: { tabs: string[]; value: string; onChange: (t: string) => void }) {
  return (
    <div className="flex gap-2">
      {tabs.map((t) => (
        <button key={t} onClick={() => onChange(t)}
          className={cn("text-xs px-[18px] py-2.5 rounded-full border transition",
            value === t ? "text-arqud-bg bg-gradient-to-r from-arqud-gold to-arqud-gold-soft font-bold border-transparent" : "text-arqud-muted border-arqud-line-2 hover:text-arqud-bone")}>
          {t}
        </button>
      ))}
    </div>
  );
}
