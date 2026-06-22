import { verifySession } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { Card, KpiCard, PageHeader, Table, Tr, Td } from "@/components/ui";

export default async function ClientCampaignsPage() {
  const { profile } = await verifySession("client");
  const admin = createSupabaseAdminClient();

  const { data: campaigns } = await admin
    .from("campaigns")
    .select("*")
    .eq("client_id", profile.client_id!)
    .order("synced_at", { ascending: false });

  const list = campaigns ?? [];

  return (
    <main className="min-h-screen px-8 py-10 space-y-8 animate-fade-up">
      <PageHeader title="Campaigns" count={list.length > 0 ? `${list.length} active` : undefined} />

      {list.length === 0 ? (
        <Card>
          <div className="py-6 text-center space-y-4">
            <p className="font-display text-2xl text-arqud-gold">Live data coming soon</p>
            <p className="text-arqud-bone-dim text-sm max-w-md mx-auto">
              Your Meta Ads campaign performance will appear here once your Meta Business Manager
              access is connected to this portal.
            </p>
            <p className="text-xs text-arqud-muted">Campaigns launching soon</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mt-8">
            {["Leads", "Cost Per Lead", "Ad Spend", "Reach"].map((label) => (
              <KpiCard key={label} label={label} value="—" />
            ))}
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
            <KpiCard label="Total Leads" value={list.reduce((s, c) => s + c.leads, 0).toLocaleString()} />
            <KpiCard label="Avg CPL" value={`R ${(list.reduce((s, c) => s + c.cpl, 0) / list.length).toFixed(2)}`} />
            <KpiCard label="Total Spend" value={`R ${list.reduce((s, c) => s + c.spend, 0).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`} />
            <KpiCard label="Total Reach" value={list.reduce((s, c) => s + c.reach, 0).toLocaleString()} />
            <KpiCard label="Active Campaigns" value={list.length.toString()} />
          </div>

          <Table>
            <Tr header>
              <Td className="basis-[1.6fr] grow">Campaign</Td>
              <Td className="basis-[0.8fr] grow">Leads</Td>
              <Td className="basis-[0.8fr] grow">CPL</Td>
              <Td className="basis-[1fr] grow">Spend</Td>
              <Td className="basis-[0.9fr] grow">Reach</Td>
              <Td className="basis-[0.7fr] grow">CTR</Td>
              <Td className="basis-[1fr] grow text-right">Last Synced</Td>
            </Tr>
            {list.map((c) => (
              <Tr key={c.id}>
                <Td className="basis-[1.6fr] grow text-arqud-bone truncate">{c.name}</Td>
                <Td className="basis-[0.8fr] grow">{c.leads.toLocaleString()}</Td>
                <Td className="basis-[0.8fr] grow">R {Number(c.cpl).toFixed(2)}</Td>
                <Td className="basis-[1fr] grow">R {Number(c.spend).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}</Td>
                <Td className="basis-[0.9fr] grow">{c.reach.toLocaleString()}</Td>
                <Td className="basis-[0.7fr] grow">{(Number(c.ctr) * 100).toFixed(2)}%</Td>
                <Td className="basis-[1fr] grow text-right text-arqud-muted">{c.synced_at ? new Date(c.synced_at).toLocaleDateString("en-ZA") : "—"}</Td>
              </Tr>
            ))}
          </Table>
        </div>
      )}
    </main>
  );
}
