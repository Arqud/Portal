"use server";

import { redirect } from "next/navigation";
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

export async function createClient(formData: FormData) {
  const admin = await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const company = String(formData.get("company") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const subdomainSlug = String(formData.get("subdomain_slug") ?? "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
  const contactPerson = String(formData.get("contact_person") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const regNumber = String(formData.get("reg_number") ?? "").trim();
  const vatNumber = String(formData.get("vat_number") ?? "").trim();
  const createPortalAccess = formData.get("create_portal_access") === "on";

  if (!name || !email || !subdomainSlug) throw new Error("Name, email and subdomain are required");

  // Insert client record
  const { data: client, error: clientErr } = await admin
    .from("clients")
    .insert({
      name,
      company: company || null,
      email,
      subdomain_slug: subdomainSlug,
      contact_person: contactPerson || null,
      address: address || null,
      reg_number: regNumber || null,
      vat_number: vatNumber || null,
      status: "active",
    })
    .select("id")
    .single();

  if (clientErr || !client) throw new Error(clientErr?.message ?? "Failed to create client");

  // Optionally create portal login
  if (createPortalAccess) {
    const tempPassword = `Portal${Math.random().toString(36).slice(2, 10)}!`;
    const { data: authUser, error: authErr } = await admin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
    });

    if (!authErr && authUser.user) {
      await admin.from("profiles").insert({
        id: authUser.user.id,
        role: "client",
        full_name: contactPerson || name,
        client_id: client.id,
      });
    }
  }

  redirect(`/admin/clients/${client.id}`);
}
