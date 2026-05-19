import { verifySession } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSignedUrl } from "@/lib/storage";

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
    <main className="min-h-screen px-8 py-10 space-y-10 animate-fade-up">
      <div>
        <p className="text-xs uppercase tracking-widest text-arqud-muted mb-1">
          {list.length} {list.length === 1 ? "report" : "reports"}
        </p>
        <h1 className="font-display text-5xl font-normal" style={{ letterSpacing: "-0.02em" }}>
          Reports
        </h1>
      </div>

      {list.length === 0 ? (
        <div className="card p-12 text-center space-y-3">
          <p className="font-display text-2xl text-arqud-gold">No reports yet</p>
          <p className="text-arqud-muted text-sm max-w-md mx-auto">
            Your monthly performance reports will appear here once your agency uploads them.
          </p>
        </div>
      ) : (
        <div className="card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Report</th>
                <th>Period</th>
                <th>Date Added</th>
                <th>Download</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id}>
                  <td className="text-arqud-bone">{r.title}</td>
                  <td>{r.period}</td>
                  <td>{new Date(r.created_at).toLocaleDateString("en-ZA")}</td>
                  <td>
                    {signedUrls[r.id] ? (
                      <a
                        href={signedUrls[r.id]}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs uppercase tracking-widest text-arqud-gold hover:text-arqud-gold-soft transition-colors"
                      >
                        PDF →
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
      )}
    </main>
  );
}
