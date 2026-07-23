"use server";

import { redirect } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { withBusiness } from "@/lib/business/persist";

async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  const admin = createSupabaseAdminClient();
  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") throw new Error("Forbidden");
  return admin;
}

export async function addNewClient(formData: FormData) {
  const admin = await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const company = String(formData.get("company") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const subdomainSlug = String(formData.get("subdomain_slug") ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "");
  const contactPerson = String(formData.get("contact_person") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const regNumber = String(formData.get("reg_number") ?? "").trim();
  const vatNumber = String(formData.get("vat_number") ?? "").trim();
  const createPortalAccess = formData.get("create_portal_access") === "on";
  const business = String(formData.get("business") ?? "").trim();

  if (!name || !email) {
    throw new Error("Name and email are required");
  }

  // Insert client record
  const { data: clientRecord, error: clientErr } = await admin
    .from("clients")
    .insert(withBusiness({
      name,
      company: company || null,
      email,
      subdomain_slug: subdomainSlug || `billing-${Date.now()}`,
      contact_person: contactPerson || null,
      phone: phone || null,
      address: address || null,
      reg_number: regNumber || null,
      vat_number: vatNumber || null,
      status: "active",
    }, business))
    .select("id")
    .single();

  if (clientErr || !clientRecord) {
    throw new Error(clientErr?.message ?? "Failed to create client");
  }

  // Optionally create portal login via Supabase Admin REST API
  if (createPortalAccess) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const authRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password: `Portal${Math.random().toString(36).slice(2, 10)}!Tmp`,
        email_confirm: true,
      }),
    });

    if (authRes.ok) {
      const authUser = await authRes.json();
      if (authUser.id) {
        await admin.from("profiles").insert({
          id: authUser.id,
          role: "client",
          full_name: contactPerson || name,
          client_id: clientRecord.id,
        });
      }
    }
  }

  redirect(`/admin/clients/${clientRecord.id}`);
}
