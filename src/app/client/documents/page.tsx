import { verifySession } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSignedUrl } from "@/lib/storage";

const CATEGORY_LABELS: Record<string, string> = {
  brand_assets: "Brand Assets", contracts: "Contracts",
  reports: "Reports", ad_creatives: "Ad Creatives", other: "Other",
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
    <main className="min-h-screen px-8 py-12">
      <h1 className="text-5xl tracking-wide mb-8">Documents</h1>
      {list.length === 0 ? (
        <div className="border border-arqud-ink bg-arqud-night p-12 text-center space-y-3">
          <p className="font-display text-2xl text-arqud-gold">No documents shared yet</p>
          <p className="text-arqud-bone text-sm max-w-md mx-auto">
            Files shared by your agency — contracts, brand assets, ad creatives — will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([category, categoryFiles]) => (
            <div key={category}>
              <p className="text-xs uppercase tracking-widest text-arqud-gold mb-3 border-b border-arqud-ink pb-2">
                {CATEGORY_LABELS[category] ?? category}
              </p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-arqud-ink">
                    {["File Name", "Date Added", "Download"].map((h) => (
                      <th key={h} className="text-left text-xs uppercase tracking-widest text-arqud-muted pb-2 pr-4">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {categoryFiles.map((file) => (
                    <tr key={file.id} className="border-b border-arqud-ink/50 hover:bg-arqud-night/50">
                      <td className="py-3 pr-4 text-arqud-bone">{file.name}</td>
                      <td className="py-3 pr-4 text-arqud-muted">{new Date(file.uploaded_at).toLocaleDateString("en-ZA")}</td>
                      <td className="py-3">
                        {signedUrls[file.id] ? (
                          <a href={signedUrls[file.id]} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-arqud-gold hover:text-arqud-gold-soft uppercase tracking-widest">Download</a>
                        ) : <span className="text-xs text-arqud-muted">Unavailable</span>}
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
