"use client";

import { useState } from "react";
import type { Task, TaskStatus } from "@/lib/tasks/types";
import { groupByStatus } from "@/lib/tasks/logic";
import { moveTask } from "@/app/actions/tasks";
import { TaskCard } from "@/components/ui";
import { TaskFormModal } from "./TaskFormModal";

type ClientOpt = { id: string; label: string; tone?: string };

const COLUMNS: { key: TaskStatus; label: string }[] = [
  { key: "todo", label: "To do" },
  { key: "doing", label: "Doing" },
  { key: "done", label: "Done" },
];

export function TasksBoard({ tasks, clients, lockedClientId }: {
  tasks: Task[];
  clients: ClientOpt[];
  lockedClientId?: string;
}) {
  const [filter, setFilter] = useState<string>(lockedClientId ?? "all");
  const [editing, setEditing] = useState<Task | null>(null);
  const [creating, setCreating] = useState(false);

  const visible = tasks.filter((t) => {
    if (lockedClientId) return t.client_id === lockedClientId;
    if (filter === "all") return true;
    if (filter === "personal") return !t.client_id;
    return t.client_id === filter;
  });
  const grouped = groupByStatus(visible);
  const labelFor = (id: string | null) => clients.find((c) => c.id === id)?.label ?? null;
  const toneFor = (id: string | null) => clients.find((c) => c.id === id)?.tone ?? "neutral";

  return (
    <>
      {!lockedClientId && (
        <div className="mb-5 flex flex-wrap gap-2">
          {[{ id: "all", label: "All" }, { id: "personal", label: "Personal" }, ...clients].map((c) => (
            <button
              key={c.id}
              onClick={() => setFilter(c.id)}
              className={`rounded-full border px-3.5 py-1.5 text-[11.5px] transition-colors ${filter === c.id ? "border-transparent bg-arqud-gold/15 font-semibold text-arqud-gold" : "border-arqud-line text-arqud-bone-dim hover:text-arqud-bone"}`}
            >
              {c.label}
            </button>
          ))}
          <button
            onClick={() => setCreating(true)}
            className="ml-auto rounded-full bg-gradient-to-r from-arqud-gold to-arqud-gold-soft px-3.5 py-1.5 text-[11.5px] font-semibold text-arqud-bg"
          >
            + New Task
          </button>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {COLUMNS.map((col) => (
          <div
            key={col.key}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              const id = e.dataTransfer.getData("text/task");
              if (id) moveTask(id, col.key);
            }}
            className="min-h-[120px] rounded-card border border-arqud-line bg-arqud-gold/[0.015] p-3.5"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-arqud-muted">{col.label}</span>
              <span className="rounded-full border border-arqud-line px-2 text-[11px] text-arqud-muted">{grouped[col.key].length}</span>
            </div>
            {grouped[col.key].map((t) => (
              <div key={t.id} draggable onDragStart={(e) => e.dataTransfer.setData("text/task", t.id)}>
                <TaskCard task={t} clientLabel={labelFor(t.client_id)} brandTone={toneFor(t.client_id)} onClick={() => setEditing(t)} />
              </div>
            ))}
            {grouped[col.key].length === 0 && <p className="py-4 text-center text-[11px] text-arqud-muted">Nothing here</p>}
          </div>
        ))}
      </div>

      {lockedClientId && (
        <button
          onClick={() => setCreating(true)}
          className="mt-4 rounded-control bg-gradient-to-r from-arqud-gold to-arqud-gold-soft px-4 py-2 text-xs font-semibold text-arqud-bg"
        >
          + New Task
        </button>
      )}
      {editing && <TaskFormModal task={editing} clients={clients} onClose={() => setEditing(null)} />}
      {creating && <TaskFormModal task={null} clients={clients} defaultClientId={lockedClientId} onClose={() => setCreating(false)} />}
    </>
  );
}
