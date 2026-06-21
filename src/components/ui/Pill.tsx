import { cn } from "@/lib/cn";

const tones: Record<string, string> = {
  spark:     "text-arqud-blue bg-arqud-blue/10 border-arqud-blue/30",
  wash:      "text-arqud-gold-soft bg-arqud-gold/10 border-arqud-gold/30",
  new:       "text-arqud-green bg-arqud-green/10 border-arqud-green/30",
  contacted: "text-arqud-amber bg-arqud-amber/10 border-arqud-amber/30",
  converted: "text-arqud-green bg-arqud-green/10 border-arqud-green/30",
  branch:    "text-arqud-bone-dim bg-white/5 border-arqud-line-2",
  neutral:   "text-arqud-muted bg-white/5 border-arqud-line-2",
};

export function Pill({ tone, children }: { tone: keyof typeof tones | string; children: React.ReactNode }) {
  return <span className={cn("inline-block text-[9.5px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full border", tones[tone] ?? tones.neutral)}>{children}</span>;
}
