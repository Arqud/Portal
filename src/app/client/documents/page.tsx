import { verifySession } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSignedUrl } from "@/lib/storage";

const CATEGORY_LABELS: Record<string, string> = {
  brand_assets: "Brand Assets",
  contracts: "Contracts",
  reports: "Reports",
  ad_creatives: "Ad Creatives",
  other: "Other",
};

export default async function ClientDocumentsPage() {
  const { profile } = await verifySession("client");
  const admin = createSupabaseAdminClient();

  const { data: files } = await admin
    .from("files")
    .select("*")
    .eq("client_id", profile.client_id!)
    .eq("shared_with_client", true)
    .order("uploaded_at", { ascending: false });

  const list = files ?? [];

  const signedUrls: Record<string, string> = {};
  await Promise.all(
    list.map(async (f) => {
      try { signedUrls[f.id] = await getSignedUrl(f.storage_path); } catch { /* skip */ }
    })
  );

  const grouped = list.reduce<Record<string, typeof list>>((acc, file) => {
    const cat = file.category ?? "other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(file);
    return acc;
  }, {});

  return (
    <main className="min-h-screen px-8 py-10 space-y-10 animate-fade-up">
      <div>
        <p className="text-xs uppercase tracking-widest text-arqud-muted mb-1">
          {list.length} {list.length === 1 ? "file" : "files"} shared
        </p>
        <h1 className="font-display text-5xl font-normal" style={{ letterSpacing: "-0.02em" }}>
          Documents
        </h1>
      </div>

      {list.length === 0 ? (
        <div className="card p-12 text-center space-y-3">
          <p className="font-display text-2xl text-arqud-gold">No documents shared yet</p>
          <p className="text-arqud-muted text-sm max-w-md mx-auto">
            Files shared by your agency — contracts, brand assets, ad creatives — will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([category, categoryFiles]) => (
            <div key={category} className="card">
              <div
                className="px-6 py-4"
                style={{ borderBottom: "1px solid var(--color-arqud-ink)" }}
              >
                <p className="text-xs uppercase tracking-widest text-arqud-gold">
                  {CATEGORY_LABELS[category] ?? category}
                </p>
              </div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>File Name</th>
                    <th>Date Added</th>
                    <th>Download</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryFiles.map((file) => (
                    <tr key={file.id}>
                      <td className="text-arqud-bone">{file.name}</td>
                      <td>{new Date(file.uploaded_at).toLocaleDateString("en-ZA")}</td>
                      <td>
                        {signedUrls[file.id] ? (
                          <a
                            href={signedUrls[file.id]}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs uppercase tracking-widest text-arqud-gold hover:text-arqud-gold-soft transition-colors"
                          >
                            Download →
                          </a>
                        ) : (
                          <span className="text-xs text-arqud-muted">Unavailable</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
