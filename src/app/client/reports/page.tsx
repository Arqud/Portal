import { verifySession } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSignedUrl } from "@/lib/storage";
import { Card, PageHeader, Table, Tr, Td } from "@/components/ui";

// Button is a <button>; this mirrors its outline-sm classes for real <a> downloads (no asChild support).
const BTN_OUTLINE_SM = "inline-flex items-center gap-2 font-semibold tracking-wide rounded-control transition-all text-[11px] px-3.5 py-2 text-arqud-gold-soft border border-arqud-gold/40 hover:border-arqud-gold/70 hover:bg-arqud-gold/5";

export default async function ClientReportsPage() {
  const { profile } = await verifySession("client");
  const admin = createSupabaseAdminClient();

  const { data: reports } = await admin
    .from("reports")
    .select("*")
    .eq("client_id", profile.client_id!)
    .order("created_at", { ascending: false });

  const list = reports ?? [];

  const signedUrls: Record<string, string> = {};
  await Promise.all(
    list.map(async (r) => {
      try { signedUrls[r.id] = await getSignedUrl(r.pdf_url); } catch { /* skip */ }
    })
  );

  return (
    <main className="min-h-screen px-8 py-10 space-y-8 animate-fade-up">
      <PageHeader title="Reports" count={`${list.length} ${list.length === 1 ? "report" : "reports"}`} />

      {list.length === 0 ? (
        <Card>
          <div className="py-6 text-center space-y-3">
            <p className="font-display text-2xl text-arqud-gold">No reports yet</p>
            <p className="text-arqud-muted text-sm max-w-md mx-auto">
              Your monthly performance reports will appear here once your agency uploads them.
            </p>
          </div>
        </Card>
      ) : (
        <Table>
          <Tr header>
            <Td className="basis-[1.6fr] grow">Report</Td>
            <Td className="basis-[1fr] grow">Period</Td>
            <Td className="basis-[1fr] grow">Date Added</Td>
            <Td className="basis-[0.8fr] grow text-right">Download</Td>
          </Tr>
          {list.map((r) => (
            <Tr key={r.id}>
              <Td className="basis-[1.6fr] grow text-arqud-bone truncate">{r.title}</Td>
              <Td className="basis-[1fr] grow">{r.period}</Td>
              <Td className="basis-[1fr] grow">{new Date(r.created_at).toLocaleDateString("en-ZA")}</Td>
              <Td className="basis-[0.8fr] grow text-right">
                {signedUrls[r.id] ? (
                  <a href={signedUrls[r.id]} target="_blank" rel="noopener noreferrer" className={BTN_OUTLINE_SM}>
                    PDF →
                  </a>
                ) : (
                  <span className="text-xs text-arqud-muted">Unavailable</span>
                )}
              </Td>
            </Tr>
          ))}
        </Table>
      )}
    </main>
  );
}
