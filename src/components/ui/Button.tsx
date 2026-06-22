import { cn } from "@/lib/cn";
import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "outline" | "ghost";
  size?: "sm" | "md";
  asChild?: boolean;
};

const base = "inline-flex items-center gap-2 font-semibold tracking-wide rounded-control transition-all disabled:opacity-50";
const sizes = { sm: "text-[11px] px-3.5 py-2", md: "text-xs px-[18px] py-[11px]" };
const variants = {
  primary: "text-arqud-bg bg-gradient-to-r from-arqud-gold to-arqud-gold-soft shadow-[0_8px_22px_rgba(200,169,110,0.28)] hover:-translate-y-px",
  outline: "text-arqud-gold-soft border border-arqud-gold/40 hover:border-arqud-gold/70 hover:bg-arqud-gold/5",
  ghost:   "text-arqud-muted hover:text-arqud-bone",
};

export function Button({ variant = "primary", size = "md", asChild, className, ...props }: Props) {
  return <button className={cn(base, sizes[size], variants[variant], className)} {...props} />;
}
