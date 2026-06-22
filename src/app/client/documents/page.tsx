import { verifySession } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSignedUrl } from "@/lib/storage";
import { Card, PageHeader, Table, Tr, Td } from "@/components/ui";

// Button is a <button>; this mirrors its outline-sm classes for real <a> downloads (no asChild support).
const BTN_OUTLINE_SM = "inline-flex items-center gap-2 font-semibold tracking-wide rounded-control transition-all text-[11px] px-3.5 py-2 text-arqud-gold-soft border border-arqud-gold/40 hover:border-arqud-gold/70 hover:bg-arqud-gold/5";

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
    <main className="min-h-screen px-8 py-10 space-y-8 animate-fade-up">
      <PageHeader title="Documents" count={`${list.length} ${list.length === 1 ? "file" : "files"} shared`} />

      {list.length === 0 ? (
        <Card>
          <div className="py-6 text-center space-y-3">
            <p className="font-display text-2xl text-arqud-gold">No documents shared yet</p>
            <p className="text-arqud-muted text-sm max-w-md mx-auto">
              Files shared by your agency — contracts, brand assets, ad creatives — will appear here.
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([category, categoryFiles]) => (
            <div key={category} className="space-y-3">
              <p className="text-xs uppercase tracking-widest text-arqud-gold">
                {CATEGORY_LABELS[category] ?? category}
              </p>
              <Table>
                <Tr header>
                  <Td className="basis-[1.8fr] grow">File Name</Td>
                  <Td className="basis-[1fr] grow">Date Added</Td>
                  <Td className="basis-[0.8fr] grow text-right">Download</Td>
                </Tr>
                {categoryFiles.map((file) => (
                  <Tr key={file.id}>
                    <Td className="basis-[1.8fr] grow text-arqud-bone truncate">{file.name}</Td>
                    <Td className="basis-[1fr] grow">{new Date(file.uploaded_at).toLocaleDateString("en-ZA")}</Td>
                    <Td className="basis-[0.8fr] grow text-right">
                      {signedUrls[file.id] ? (
                        <a href={signedUrls[file.id]} target="_blank" rel="noopener noreferrer" className={BTN_OUTLINE_SM}>
                          Download →
                        </a>
                      ) : (
                        <span className="text-xs text-arqud-muted">Unavailable</span>
                      )}
                    </Td>
                  </Tr>
                ))}
              </Table>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
