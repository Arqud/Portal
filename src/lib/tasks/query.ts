import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Task } from "./types";

// Resilient: before the migration is run the table won't exist — return empty
// + tableReady:false so the UI can show a setup notice instead of crashing.
export async function getTasks(): Promise<{ tasks: Task[]; tableReady: boolean }> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("tasks")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) return { tasks: [], tableReady: false };
  return { tasks: (data ?? []) as Task[], tableReady: true };
}
