import { describe, expect, it } from "vitest";
import { dueBucket, todayTasks, sortForToday, groupByStatus } from "@/lib/tasks/logic";
import type { Task } from "@/lib/tasks/types";

const ref = new Date("2026-07-02T09:00:00");
const t = (o: Partial<Task>): Task => ({
  id: o.id ?? "x",
  title: o.title ?? "T",
  notes: null,
  status: o.status ?? "todo",
  priority: o.priority ?? "med",
  due_date: o.due_date ?? null,
  client_id: o.client_id ?? null,
  sort_order: o.sort_order ?? 0,
  completed_at: o.completed_at ?? null,
  created_at: "2026-07-01",
});

describe("dueBucket", () => {
  it("classifies overdue/today/upcoming/none", () => {
    expect(dueBucket("2026-07-01", ref)).toBe("overdue");
    expect(dueBucket("2026-07-02", ref)).toBe("today");
    expect(dueBucket("2026-07-05", ref)).toBe("upcoming");
    expect(dueBucket(null, ref)).toBe("none");
  });
});

describe("todayTasks", () => {
  it("returns not-done tasks that are overdue or due today", () => {
    const res = todayTasks(
      [
        t({ id: "a", due_date: "2026-07-01" }),
        t({ id: "b", due_date: "2026-07-02" }),
        t({ id: "c", due_date: "2026-07-09" }),
        t({ id: "d", due_date: "2026-07-01", status: "done" }),
      ],
      ref
    );
    expect(res.map((x) => x.id)).toEqual(["a", "b"]);
  });
});

describe("sortForToday", () => {
  it("puts overdue before non-overdue", () => {
    const res = sortForToday(
      [
        t({ id: "todayLow", due_date: "2026-07-02", priority: "low" }),
        t({ id: "overMed", due_date: "2026-07-01", priority: "med" }),
        t({ id: "todayHigh", due_date: "2026-07-02", priority: "high" }),
      ],
      ref
    );
    expect(res[0].id).toBe("overMed");
  });
});

describe("groupByStatus", () => {
  it("buckets by status with all three keys present", () => {
    const g = groupByStatus([t({ status: "todo" }), t({ status: "done" }), t({ status: "done" })]);
    expect(g.todo).toHaveLength(1);
    expect(g.doing).toHaveLength(0);
    expect(g.done).toHaveLength(2);
  });
});
