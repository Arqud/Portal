import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getTasks } from "@/lib/tasks/query";
import { toICS, type ICSTask } from "@/lib/tasks/ical";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token || token !== process.env.ICAL_FEED_TOKEN) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { tasks } = await getTasks();
  const admin = createSupabaseAdminClient();
  const { data: clients } = await admin.from("clients").select("id, company, name");
  const nameFor = (id: string | null) =>
    id ? clients?.find((c) => c.id === id)?.company ?? clients?.find((c) => c.id === id)?.name ?? null : null;

  const items: ICSTask[] = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    due_date: t.due_date,
    status: t.status,
    priority: t.priority,
    client_label: nameFor(t.client_id),
  }));

  return new NextResponse(toICS(items, "arqudportal.co.za"), {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Cache-Control": "no-store" },
  });
}
