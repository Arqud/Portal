import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const BUCKET = "portal-files";

export async function uploadFile(
  path: string,
  file: File | Buffer,
  contentType: string,
): Promise<string> {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.storage.from(BUCKET).upload(path, file, {
    contentType,
    upsert: true,
  });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  return path;
}

export async function getSignedUrl(path: string, expiresIn = 3600): Promise<string> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(path, expiresIn);
  if (error || !data) throw new Error(`Failed to get signed URL: ${error?.message}`);
  return data.signedUrl;
}

export async function deleteFile(path: string): Promise<void> {
  const admin = createSupabaseAdminClient();
  await admin.storage.from(BUCKET).remove([path]);
}

export function clientReportPath(clientId: string, filename: string): string {
  return `clients/${clientId}/reports/${filename}`;
}

export function clientDocumentPath(clientId: string, filename: string): string {
  return `clients/${clientId}/documents/${filename}`;
}
