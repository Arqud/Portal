import type { Task, TaskStatus } from "./types";

const PRIORITY_RANK: Record<string, number> = { high: 0, med: 1, low: 2 };
const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function dueBucket(due: string | null, ref: Date): "overdue" | "today" | "upcoming" | "none" {
  if (!due) return "none";
  const today = dayKey(ref);
  if (due < today) return "overdue";
  if (due === today) return "today";
  return "upcoming";
}

export function todayTasks(tasks: Task[], ref: Date): Task[] {
  return tasks.filter((t) => {
    if (t.status === "done") return false;
    const b = dueBucket(t.due_date, ref);
    return b === "overdue" || b === "today";
  });
}

export function sortForToday(tasks: Task[], ref: Date = new Date()): Task[] {
  return [...tasks].sort((a, b) => {
    const ba = dueBucket(a.due_date, ref) === "overdue" ? 0 : 1;
    const bb = dueBucket(b.due_date, ref) === "overdue" ? 0 : 1;
    if (ba !== bb) return ba - bb;
    return (PRIORITY_RANK[a.priority] ?? 1) - (PRIORITY_RANK[b.priority] ?? 1);
  });
}

export function groupByStatus(tasks: Task[]): Record<TaskStatus, Task[]> {
  const g: Record<TaskStatus, Task[]> = { todo: [], doing: [], done: [] };
  for (const t of tasks) g[t.status].push(t);
  return g;
}
