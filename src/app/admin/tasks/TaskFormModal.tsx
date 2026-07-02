"use client";

import { useState, useTransition } from "react";
import { Input, Select, Textarea, Button } from "@/components/ui";
import { createTask, updateTask, deleteTask } from "@/app/actions/tasks";
import type { Task, TaskStatus, TaskPriority } from "@/lib/tasks/types";

type ClientOpt = { id: string; label: string };

export function TaskFormModal({ task, clients, defaultClientId, onClose }: {
  task: Task | null;
  clients: ClientOpt[];
  defaultClientId?: string | null;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [notes, setNotes] = useState(task?.notes ?? "");
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? "todo");
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? "med");
  const [due, setDue] = useState(task?.due_date ?? "");
  const [clientId, setClientId] = useState(task?.client_id ?? defaultClientId ?? "");
  const [pending, start] = useTransition();

  function save() {
    if (!title.trim()) return;
    start(async () => {
      if (task) await updateTask(task.id, { title, notes, status, priority, due_date: due, client_id: clientId });
      else await createTask({ title, notes, status, priority, due_date: due, client_id: clientId });
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 pt-16" onClick={onClose}>
      <div className="w-full max-w-md rounded-card border border-arqud-line panel-gradient p-6 shadow-[var(--shadow-card)]" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 font-display text-xl text-arqud-gold">{task ? "Edit task" : "New task"}</h2>
        <div className="space-y-3">
          <Input placeholder="Task title" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus className="w-full" />
          <div className="grid grid-cols-2 gap-3">
            <Select value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)} className="w-full">
              <option value="todo">To do</option>
              <option value="doing">Doing</option>
              <option value="done">Done</option>
            </Select>
            <Select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)} className="w-full">
              <option value="low">Low</option>
              <option value="med">Medium</option>
              <option value="high">High</option>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="w-full" />
            <Select value={clientId} onChange={(e) => setClientId(e.target.value)} className="w-full">
              <option value="">Personal</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </Select>
          </div>
          <Textarea placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full" rows={3} />
        </div>
        <div className="mt-5 flex items-center justify-between">
          {task ? (
            <button
              disabled={pending}
              onClick={() => start(async () => { await deleteTask(task.id); onClose(); })}
              className="text-xs uppercase tracking-widest text-red-400 hover:text-red-300 disabled:opacity-50"
            >
              Delete
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" onClick={save} disabled={pending || !title.trim()}>{task ? "Save" : "Create"}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
