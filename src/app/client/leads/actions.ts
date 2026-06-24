"use server";

import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function updateLeadStatus(
  leadId: string,
  status: "new" | "contacted" | "converted" | "lost",
  notes: string,
  followUpDate: string | null,
) {
  const { profile } = await verifySession("client");
  const admin = createSupabaseAdminClient();

  const { data: lead } = await admin
    .from("leads")
    .select("client_id")
    .eq("id", leadId)
    .single();

  if (!lead || lead.client_id !== profile.client_id) {
    throw new Error("Not authorised.");
  }

  const { error } = await admin
    .from("leads")
    .update({
      status,
      notes: notes.trim() || null,
      follow_up_date: followUpDate || null,
    })
    .eq("id", leadId);

  if (error) throw new Error(error.message);

  revalidatePath("/client/leads");
  revalidatePath("/client/dashboard");
}

// Hard-delete a single lead row. For junk/test leads only — real leads are
// archived (status-derived), never deleted. Gated to the lead's owning client
// (same ownership check as updateLeadStatus); the row is removed via the admin
// client so it bypasses RLS but only after the ownership assertion passes.
export async function deleteLead(leadId: string) {
  const { profile } = await verifySession("client");
  const admin = createSupabaseAdminClient();

  const { data: lead } = await admin
    .from("leads")
    .select("client_id")
    .eq("id", leadId)
    .single();

  if (!lead || lead.client_id !== profile.client_id) {
    throw new Error("Not authorised.");
  }

  const { error } = await admin.from("leads").delete().eq("id", leadId);

  if (error) throw new Error(error.message);

  revalidatePath("/client/leads");
  revalidatePath("/client/dashboard");
}
