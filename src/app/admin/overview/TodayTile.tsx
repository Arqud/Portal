"use client";

import { useState, useTransition } from "react";
import type { Task } from "@/lib/tasks/types";
import { dueBucket } from "@/lib/tasks/logic";
import { toggleComplete, createTask } from "@/app/actions/tasks";

export function TodayTile({ tasks, labelFor, events = [] }: {
  tasks: Task[];
  labelFor: Record<string, string>;
  events?: { time: string; title: string }[];
}) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [pending, start] = useTransition();

  return (
    <div className="rounded-card border border-arqud-line panel-gradient p-5 shadow-[var(--shadow-card)]">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-display text-[17px] text-arqud-bone">Today</h3>
        <button onClick={() => setAdding((v) => !v)} className="text-[11px] font-semibold text-arqud-gold">+ Add</button>
      </div>
      {adding && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!title.trim()) return;
            start(async () => {
              await createTask({ title, due_date: new Date().toISOString().slice(0, 10) });
              setTitle("");
              setAdding(false);
            });
          }}
          className="mb-2"
        >
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Quick task for today…"
            className="w-full rounded-control border border-arqud-line bg-arqud-bg-2 px-3 py-2 text-[13px] text-arqud-bone"
          />
        </form>
      )}
      {events.length > 0 && (
        <div className="mb-2">
          {events.map((e, i) => (
            <div key={i} className="flex items-baseline gap-3 py-[5px]">
              <span className="w-[76px] shrink-0 text-[10.5px] text-arqud-muted">{e.time}</span>
              <span className="min-w-0 truncate text-[12.5px] text-arqud-bone">{e.title}</span>
            </div>
          ))}
          <div className="mt-2 h-px bg-arqud-line/60" />
        </div>
      )}
      {tasks.length === 0 && events.length === 0 && !adding ? (
        <p className="py-6 text-center text-xs uppercase tracking-widest text-arqud-muted">Nothing due — you&apos;re clear</p>
      ) : (
        tasks.map((t) => {
          const over = dueBucket(t.due_date, new Date()) === "overdue";
          return (
            <div key={t.id} className="flex items-center gap-3 border-t border-arqud-line/60 py-2.5 first:border-t-0">
              <button
                disabled={pending}
                onClick={() => start(() => toggleComplete(t.id))}
                aria-label="Complete task"
                className={`h-[18px] w-[18px] shrink-0 rounded-md border-[1.8px] ${t.status === "done" ? "border-arqud-green bg-arqud-green" : "border-arqud-line"}`}
              />
              <div className="min-w-0">
                <p className={`text-[12.5px] ${t.status === "done" ? "text-arqud-muted line-through" : "text-arqud-bone"}`}>{t.title}</p>
                {t.client_id && labelFor[t.client_id] && <p className="text-[10.5px] text-arqud-muted">{labelFor[t.client_id]}</p>}
              </div>
              <span className={`ml-auto rounded-lg px-2 py-0.5 text-[10.5px] font-semibold ${over ? "bg-arqud-amber/15 text-arqud-amber" : "bg-arqud-gold/15 text-arqud-gold"}`}>
                {over ? "Overdue" : "Today"}
              </span>
            </div>
          );
        })
      )}
    </div>
  );
}
