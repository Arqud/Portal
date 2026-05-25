"use server";

import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function updateLeadStatus(
  leadId: string,
  status: "new" | "contacted" | "converted" | "lost",
  notes: string,
) {
  const { profile } = await verifySession("client");
  const admin = createSupabaseAdminClient();

  // Verify the lead belongs to this client before updating
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
    .update({ status, notes: notes.trim() || null })
    .eq("id", leadId);

  if (error) throw new Error(error.message);

  revalidatePath("/client/leads");
}
