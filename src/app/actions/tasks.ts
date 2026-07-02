"use server";

import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { TaskStatus, TaskPriority } from "@/lib/tasks/types";

type NewTask = {
  title: string;
  notes?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  due_date?: string | null;
  client_id?: string | null;
};

function revalidate() {
  revalidatePath("/admin/tasks");
  revalidatePath("/admin/overview");
}

export async function createTask(input: NewTask) {
  await verifySession("admin");
  const admin = createSupabaseAdminClient();
  await admin.from("tasks").insert({
    title: input.title.trim(),
    notes: input.notes ?? null,
    status: input.status ?? "todo",
    priority: input.priority ?? "med",
    due_date: input.due_date || null,
    client_id: input.client_id || null,
  });
  revalidate();
}

export async function updateTask(id: string, patch: Partial<NewTask>) {
  await verifySession("admin");
  const admin = createSupabaseAdminClient();
  await admin
    .from("tasks")
    .update({
      ...(patch.title !== undefined ? { title: patch.title.trim() } : {}),
      ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      ...(patch.priority !== undefined ? { priority: patch.priority } : {}),
      ...(patch.due_date !== undefined ? { due_date: patch.due_date || null } : {}),
      ...(patch.client_id !== undefined ? { client_id: patch.client_id || null } : {}),
    })
    .eq("id", id);
  revalidate();
}

export async function moveTask(id: string, status: TaskStatus) {
  await verifySession("admin");
  const admin = createSupabaseAdminClient();
  await admin
    .from("tasks")
    .update({ status, completed_at: status === "done" ? new Date().toISOString() : null })
    .eq("id", id);
  revalidate();
}

export async function toggleComplete(id: string) {
  await verifySession("admin");
  const admin = createSupabaseAdminClient();
  const { data } = await admin.from("tasks").select("status").eq("id", id).single();
  const done = data?.status === "done";
  await admin
    .from("tasks")
    .update({ status: done ? "todo" : "done", completed_at: done ? null : new Date().toISOString() })
    .eq("id", id);
  revalidate();
}

export async function deleteTask(id: string) {
  await verifySession("admin");
  const admin = createSupabaseAdminClient();
  await admin.from("tasks").delete().eq("id", id);
  revalidate();
}
