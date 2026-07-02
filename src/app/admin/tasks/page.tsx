import { verifySession } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PageHeader, Card } from "@/components/ui";
import { getTasks } from "@/lib/tasks/query";
import { todayTasks } from "@/lib/tasks/logic";
import { TasksBoard } from "./TasksBoard";

export default async function TasksPage() {
  await verifySession("admin");
  const admin = createSupabaseAdminClient();
  const [{ tasks, tableReady }, clientsRes] = await Promise.all([
    getTasks(),
    admin.from("clients").select("id, company, name").order("company", { ascending: true }),
  ]);
  const clients = (clientsRes.data ?? []).map((c) => ({ id: c.id, label: c.company ?? c.name, tone: "neutral" }));
  const open = tasks.filter((t) => t.status !== "done").length;
  const dueToday = todayTasks(tasks, new Date()).length;

  return (
    <main className="min-h-screen px-4 sm:px-8 py-8 sm:py-10 animate-fade-up">
      <PageHeader title="Tasks" count={`${open} open · ${dueToday} due today`} />
      {!tableReady ? (
        <Card>
          <div className="space-y-2 py-10 text-center">
            <p className="font-display text-xl text-arqud-gold">One-time setup needed</p>
            <p className="text-sm text-arqud-muted">Run the tasks-table SQL in Supabase, then refresh.</p>
          </div>
        </Card>
      ) : (
        <TasksBoard tasks={tasks} clients={clients} />
      )}
    </main>
  );
}
