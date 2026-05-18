"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  const admin = createSupabaseAdminClient();
  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") throw new Error("Forbidden");
  return admin;
}

export async function updateClient(clientId: string, formData: FormData) {
  const admin = await requireAdmin();

  const { error } = await admin
    .from("clients")
    .update({
      name: String(formData.get("name") ?? "").trim(),
      company: String(formData.get("company") ?? "").trim() || null,
      email: String(formData.get("email") ?? "").trim(),
      contact_person: String(formData.get("contact_person") ?? "").trim() || null,
      address: String(formData.get("address") ?? "").trim() || null,
      reg_number: String(formData.get("reg_number") ?? "").trim() || null,
      vat_number: String(formData.get("vat_number") ?? "").trim() || null,
      status: String(formData.get("status") ?? "active"),
    })
    .eq("id", clientId);

  if (error) throw new Error(error.message);
  revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath("/admin/clients");
}
