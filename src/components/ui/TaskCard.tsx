"use client";

import type { Task } from "@/lib/tasks/types";
import { dueBucket } from "@/lib/tasks/logic";

const PRIORITY_DOT: Record<string, string> = {
  high: "bg-arqud-amber",
  med: "bg-arqud-gold-soft",
  low: "bg-arqud-line-2",
};

function dueLabel(due: string | null): { text: string; cls: string } | null {
  if (!due) return null;
  const b = dueBucket(due, new Date());
  if (b === "overdue") return { text: "Overdue", cls: "text-arqud-amber font-semibold" };
  if (b === "today") return { text: "Today", cls: "text-arqud-gold font-semibold" };
  return { text: new Date(due + "T00:00:00").toLocaleDateString("en-ZA", { day: "numeric", month: "short" }), cls: "text-arqud-muted" };
}

export function TaskCard({ task, clientLabel, brandTone = "neutral", onClick }: {
  task: Task;
  clientLabel?: string | null;
  brandTone?: string;
  onClick?: () => void;
}) {
  const due = dueLabel(task.due_date);
  const toneCls: Record<string, string> = {
    wash: "bg-arqud-gold/12 text-arqud-gold",
    spark: "bg-arqud-blue/12 text-arqud-blue",
    neutral: "bg-arqud-line-2 text-arqud-muted",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`mb-2.5 w-full rounded-control border border-arqud-line panel-gradient p-3 text-left shadow-[var(--shadow-card)] transition-transform hover:-translate-y-px ${task.status === "done" ? "opacity-70" : ""}`}
    >
      <p className={`mb-2 text-[13px] leading-snug text-arqud-bone ${task.status === "done" ? "text-arqud-muted line-through" : ""}`}>{task.title}</p>
      <div className="flex flex-wrap items-center gap-2">
        {clientLabel && (
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${toneCls[brandTone] ?? toneCls.neutral}`}>{clientLabel}</span>
        )}
        {due && <span className={`text-[10.5px] ${due.cls}`}>{due.text}</span>}
        <span className={`ml-auto h-2 w-2 rounded-full ${PRIORITY_DOT[task.priority] ?? PRIORITY_DOT.med}`} aria-hidden />
      </div>
    </button>
  );
}
