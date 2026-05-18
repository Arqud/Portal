import { verifySession } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSignedUrl } from "@/lib/storage";
import { FilesClient } from "./FilesClient";

export default async function AdminFilesPage() {
  await verifySession("admin");
  const admin = createSupabaseAdminClient();

  const [filesRes, clientsRes] = await Promise.all([
    admin.from("files").select("*, client:clients(id,name,company)").order("uploaded_at", { ascending: false }),
    admin.from("clients").select("id,name,company").eq("status", "active"),
  ]);

  const files = filesRes.data ?? [];
  const clients = clientsRes.data ?? [];

  // Generate signed URLs
  const signedUrls: Record<string, string> = {};
  await Promise.all(
    files.map(async (f) => {
      try { signedUrls[f.id] = await getSignedUrl(f.storage_path); } catch { /* skip */ }
    })
  );

  return (
    <main className="min-h-screen px-8 py-12">
      <h1 className="text-5xl tracking-wide mb-8">Files</h1>
      <FilesClient files={files} clients={clients} signedUrls={signedUrls} />
    </main>
  );
}
