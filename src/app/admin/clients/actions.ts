"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { uploadFile, clientReportPath, clientDocumentPath } from "@/lib/storage";

async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  const admin = createSupabaseAdminClient();
  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") throw new Error("Forbidden");
  return admin;
}

export async function uploadReport(formData: FormData) {
  const admin = await requireAdmin();
  const clientId = String(formData.get("clientId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const period = String(formData.get("period") ?? "").trim();
  const file = formData.get("file") as File | null;

  if (!clientId || !title || !period || !file) throw new Error("All fields required");

  const ext = file.name.split(".").pop() ?? "pdf";
  const filename = `${Date.now()}-${title.replace(/\s+/g, "-").toLowerCase()}.${ext}`;
  const path = clientReportPath(clientId, filename);

  const buffer = Buffer.from(await file.arrayBuffer());
  await uploadFile(path, buffer, file.type || "application/pdf");

  const { error } = await admin.from("reports").insert({
    client_id: clientId,
    title,
    period,
    pdf_url: path,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath("/client/reports");
}

export async function uploadDocument(formData: FormData) {
  const admin = await requireAdmin();
  const clientId = String(formData.get("clientId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const category = String(formData.get("category") ?? "other");
  const file = formData.get("file") as File | null;

  if (!clientId || !name || !file) throw new Error("All fields required");

  const ext = file.name.split(".").pop() ?? "pdf";
  const filename = `${Date.now()}-${name.replace(/\s+/g, "-").toLowerCase()}.${ext}`;
  const path = clientDocumentPath(clientId, filename);

  const buffer = Buffer.from(await file.arrayBuffer());
  await uploadFile(path, buffer, file.type || "application/pdf");

  const { error } = await admin.from("files").insert({
    client_id: clientId,
    name,
    category,
    storage_path: path,
    shared_with_client: true,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath("/client/documents");
}

export async function deleteReport(reportId: string, clientId: string) {
  const admin = await requireAdmin();
  await admin.from("reports").delete().eq("id", reportId);
  revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath("/client/reports");
}

export async function deleteDocument(fileId: string, clientId: string) {
  const admin = await requireAdmin();
  await admin.from("files").delete().eq("id", fileId);
  revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath("/client/documents");
}
