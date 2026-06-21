import { cn } from "@/lib/cn";
const ctl = "bg-arqud-panel border border-arqud-line-2 rounded-control text-arqud-bone text-sm px-3.5 py-2.5 placeholder:text-arqud-muted focus:outline-none focus:ring-1 focus:ring-arqud-gold/40 transition";
export function Input(p: React.InputHTMLAttributes<HTMLInputElement>) { return <input {...p} className={cn(ctl, p.className)} />; }
export function Select(p: React.SelectHTMLAttributes<HTMLSelectElement>) { return <select {...p} className={cn(ctl, p.className)} />; }
export function Textarea(p: React.TextareaHTMLAttributes<HTMLTextAreaElement>) { return <textarea {...p} className={cn(ctl, p.className)} />; }
