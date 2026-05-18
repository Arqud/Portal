"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { uploadFile, clientDocumentPath, deleteFile } from "@/lib/storage";

async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  const admin = createSupabaseAdminClient();
  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") throw new Error("Forbidden");
  return admin;
}

export async function uploadAdminFile(formData: FormData) {
  const admin = await requireAdmin();
  const clientId = String(formData.get("clientId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const category = String(formData.get("category") ?? "other");
  const sharedWithClient = formData.get("shared_with_client") === "on";
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
    shared_with_client: sharedWithClient,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/admin/files");
  revalidatePath("/client/documents");
}

export async function removeAdminFile(fileId: string, storagePath: string) {
  const admin = await requireAdmin();
  await deleteFile(storagePath);
  await admin.from("files").delete().eq("id", fileId);
  revalidatePath("/admin/files");
  revalidatePath("/client/documents");
}

export async function toggleFileSharing(fileId: string, shared: boolean) {
  const admin = await requireAdmin();
  await admin.from("files").update({ shared_with_client: shared }).eq("id", fileId);
  revalidatePath("/admin/files");
  revalidatePath("/client/documents");
}
