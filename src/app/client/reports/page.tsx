import { verifySession } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export default async function ClientReportsPage() {
  const { profile } = await verifySession("client");
  const admin = createSupabaseAdminClient();

  const { data: reports } = await admin
    .from("reports")
    .select("*")
    .eq("client_id", profile.client_id!)
    .order("created_at", { ascending: false });

  const list = reports ?? [];

  return (
    <main className="min-h-screen px-8 py-12">
      <h1 className="text-5xl tracking-wide mb-8">Reports</h1>

      {list.length === 0 ? (
        <div className="border border-arqud-ink bg-arqud-night p-12 text-center space-y-3">
          <p className="font-display text-2xl text-arqud-gold">No reports yet</p>
          <p className="text-arqud-bone text-sm max-w-md mx-auto">
            Your monthly performance reports will appear here once your agency uploads them.
          </p>
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-arqud-ink">
              {["Report", "Period", "Date Added", "Download"].map((h) => (
                <th key={h} className="text-left text-xs uppercase tracking-widest text-arqud-muted pb-3 pr-4">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.map((r) => (
              <tr key={r.id} className="border-b border-arqud-ink/50 hover:bg-arqud-night/50">
                <td className="py-3 pr-4 text-arqud-bone">{r.title}</td>
                <td className="py-3 pr-4 text-arqud-muted">{r.period}</td>
                <td className="py-3 pr-4 text-arqud-muted">{new Date(r.created_at).toLocaleDateString("en-ZA")}</td>
                <td className="py-3">
                  <a href={r.pdf_url} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-arqud-gold hover:text-arqud-gold-soft uppercase tracking-widest">
                    Download PDF
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
