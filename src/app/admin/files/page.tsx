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

  const signedUrls: Record<string, string> = {};
  await Promise.all(
    files.map(async (f) => {
      try { signedUrls[f.id] = await getSignedUrl(f.storage_path); } catch { /* skip */ }
    })
  );

  return (
    <main className="min-h-screen px-8 py-10 space-y-10 animate-fade-up">
      <div>
        <p className="text-xs uppercase tracking-widest text-arqud-muted mb-1">
          {files.length} {files.length === 1 ? "file" : "files"}
        </p>
        <h1 className="font-display text-5xl font-normal" style={{ letterSpacing: "-0.02em" }}>
          Files
        </h1>
      </div>
      <FilesClient files={files} clients={clients} signedUrls={signedUrls} />
    </main>
  );
}
