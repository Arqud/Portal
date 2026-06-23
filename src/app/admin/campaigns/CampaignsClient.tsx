"use client";

import { useState, useTransition } from "react";
import { syncClientCampaigns, saveMetaCredentials } from "./actions";
import { getBrand } from "@/lib/leads/brand";

type BrandFilter = "all" | "Sparkling" | "We Wash";
// Campaigns carry the brand in their name (e.g. "Sparkling — Auto Detail R799").
const brandOf = (name: string) => getBrand({ meta_campaign_name: name, meta_ad_name: null });

type Client = {
  id: string; company: string | null; name: string;
  meta_ad_account_id: string | null; meta_access_token: string | null;
};

type Campaign = {
  id: string; name: string; leads: number; cpl: number;
  spend: number; reach: number; ctr: number; synced_at: string | null;
  client_id: string;
};

function fmt(n: number) {
  return `R ${n.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`;
}

export function CampaignsClient({ clients, campaigns }: { clients: Client[]; campaigns: Campaign[] }) {
  const [selectedClient, setSelectedClient] = useState(clients[0]?.id ?? "");
  const [brandFilter, setBrandFilter] = useState<BrandFilter>("all");
  const [showSetup, setShowSetup] = useState(false);
  const [adAccountId, setAdAccountId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [isPending, start] = useTransition();
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const client = clients.find((c) => c.id === selectedClient);
  const clientCampaigns = campaigns.filter((c) => c.client_id === selectedClient);
  const hasCredentials = Boolean(client?.meta_ad_account_id && client?.meta_access_token);

  // Brand split — same routing rule as the Leads page (getBrand on the campaign name).
  const brandCampaigns = clientCampaigns.filter(
    (c) => brandFilter === "all" || brandOf(c.name) === brandFilter,
  );

  const totalLeads = brandCampaigns.reduce((s, c) => s + c.leads, 0);
  const totalSpend = brandCampaigns.reduce((s, c) => s + c.spend, 0);
  const totalReach = brandCampaigns.reduce((s, c) => s + c.reach, 0);
  const avgCpl = totalLeads > 0 ? totalSpend / totalLeads : 0;

  const brandBtn = (active: boolean) =>
    `px-4 py-2 text-xs uppercase tracking-widest border transition-colors ${
      active
        ? "border-arqud-gold text-arqud-gold bg-arqud-gold/10"
        : "border-arqud-ink text-arqud-muted hover:border-arqud-gold hover:text-arqud-gold"
    }`;

  function handleSync() {
    setErr(""); setMsg("");
    start(async () => {
      try {
        const result = await syncClientCampaigns(selectedClient);
        setMsg(`✓ Synced ${result.synced} campaigns successfully`);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Sync failed.");
      }
    });
  }

  function handleSaveCredentials(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setMsg("");
    start(async () => {
      try {
        await saveMetaCredentials(selectedClient, adAccountId, accessToken);
        setMsg("✓ Credentials saved. Click Sync Now to pull campaign data.");
        setShowSetup(false);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed to save.");
      }
    });
  }

  const inputCls = "w-full bg-arqud-black border border-arqud-ink px-4 py-3 text-arqud-bone focus:border-arqud-gold focus:outline-none text-sm";

  return (
    <div>
      {/* Setup modal */}
      {showSetup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md bg-arqud-night border border-arqud-ink p-8 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl text-arqud-gold">Connect Meta Ads</h2>
              <button onClick={() => setShowSetup(false)} className="text-arqud-muted hover:text-arqud-bone text-xl">✕</button>
            </div>
            <p className="text-sm text-arqud-muted">
              Enter the credentials for <span className="text-arqud-bone">{client?.company ?? client?.name}</span>.
            </p>
            <form onSubmit={handleSaveCredentials} className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-widest text-arqud-muted mb-1">Ad Account ID</label>
                <input value={adAccountId} onChange={(e) => setAdAccountId(e.target.value)}
                  required placeholder="act_XXXXXXXXXX or just the number"
                  className={inputCls} />
                <p className="text-xs text-arqud-muted mt-1">Found in Meta Business Manager → Ad Accounts</p>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-arqud-muted mb-1">System User Access Token</label>
                <textarea value={accessToken} onChange={(e) => setAccessToken(e.target.value)}
                  required rows={3} placeholder="EAA..."
                  className={`${inputCls} resize-none font-mono text-xs`} />
                <p className="text-xs text-arqud-muted mt-1">From Meta Business Manager → System Users → Generate Token</p>
              </div>
              <div className="flex gap-4">
                <button type="submit" disabled={isPending}
                  className="flex-1 bg-arqud-gold py-3 text-sm font-semibold uppercase tracking-widest text-arqud-black hover:bg-arqud-gold-soft disabled:opacity-50">
                  {isPending ? "Saving..." : "Save Credentials"}
                </button>
                <button type="button" onClick={() => setShowSetup(false)}
                  className="flex-1 border border-arqud-ink py-3 text-sm uppercase tracking-widest text-arqud-muted hover:text-arqud-bone">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-4 mb-6">
        <select value={selectedClient} onChange={(e) => setSelectedClient(e.target.value)}
          className="bg-arqud-night border border-arqud-ink px-4 py-2 text-arqud-bone text-sm focus:border-arqud-gold focus:outline-none">
          {clients.map((c) => <option key={c.id} value={c.id}>{c.company ?? c.name}</option>)}
        </select>

        <div className="flex-1" />

        {msg && <p className="text-sm text-green-400">{msg}</p>}
        {err && <p className="text-sm text-red-400">{err}</p>}

        <button onClick={() => setShowSetup(true)}
          className={`px-4 py-2 text-xs uppercase tracking-widest border transition-colors ${
            hasCredentials
              ? "border-arqud-muted text-arqud-muted hover:border-arqud-gold hover:text-arqud-gold"
              : "border-arqud-gold text-arqud-gold hover:bg-arqud-gold hover:text-arqud-black"
          }`}>
          {hasCredentials ? "Update Credentials" : "Connect Meta Ads"}
        </button>

        {hasCredentials && (
          <button onClick={handleSync} disabled={isPending}
            className="bg-arqud-gold px-6 py-2 text-sm font-semibold uppercase tracking-widest text-arqud-black hover:bg-arqud-gold-soft disabled:opacity-50">
            {isPending ? "Syncing..." : "Sync Now"}
          </button>
        )}
      </div>

      {/* No credentials state */}
      {!hasCredentials ? (
        <div className="border border-arqud-ink bg-arqud-night p-12 text-center space-y-4">
          <p className="font-display text-2xl text-arqud-gold">Meta Ads not connected</p>
          <p className="text-arqud-bone text-sm max-w-md mx-auto">
            Connect {client?.company ?? client?.name}&apos;s Meta Ad Account to start syncing campaign data.
          </p>
          <button onClick={() => setShowSetup(true)}
            className="inline-block bg-arqud-gold px-8 py-3 text-sm font-semibold uppercase tracking-widest text-arqud-black hover:bg-arqud-gold-soft">
            Connect Meta Ads
          </button>
        </div>
      ) : clientCampaigns.length === 0 ? (
        <div className="border border-arqud-ink bg-arqud-night p-12 text-center space-y-3">
          <p className="font-display text-xl text-arqud-gold">No campaign data yet</p>
          <p className="text-arqud-muted text-sm">Click Sync Now to pull data from Meta.</p>
        </div>
      ) : (
        <>
          {/* Brand split — mirrors the Leads page tabs */}
          <div className="flex gap-2 mb-6">
            {(["all", "Sparkling", "We Wash"] as const).map((b) => (
              <button key={b} onClick={() => setBrandFilter(b)} className={brandBtn(brandFilter === b)}>
                {b === "all" ? "All" : b}
              </button>
            ))}
          </div>

          {/* Summary */}
          <div className="grid grid-cols-4 gap-px bg-arqud-ink border border-arqud-ink mb-8">
            {[
              { label: "Total Leads", value: totalLeads.toLocaleString() },
              { label: "Cost Per Lead", value: fmt(avgCpl) },
              { label: "Total Spend", value: fmt(totalSpend) },
              { label: "Total Reach", value: totalReach.toLocaleString() },
            ].map(({ label, value }) => (
              <div key={label} className="bg-arqud-night px-6 py-5">
                <p className="text-xs uppercase tracking-widest text-arqud-muted mb-2">{label}</p>
                <p className="font-display text-2xl text-arqud-bone">{value}</p>
              </div>
            ))}
          </div>

          {/* Campaigns table */}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-arqud-ink">
                {["Campaign", "Brand", "Leads", "CPL", "Spend", "Reach", "CTR", "Last Synced"].map((h) => (
                  <th key={h} className="text-left text-xs uppercase tracking-widest text-arqud-muted pb-3 pr-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {brandCampaigns.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-xs uppercase tracking-widest text-arqud-muted">
                    No campaigns for this brand yet
                  </td>
                </tr>
              ) : (
                brandCampaigns.map((c) => {
                  const brand = brandOf(c.name);
                  return (
                    <tr key={c.id} className="border-b border-arqud-ink/50 hover:bg-arqud-night/50">
                      <td className="py-3 pr-4 text-arqud-bone">{c.name}</td>
                      <td className="py-3 pr-4">
                        <span className={
                          brand === "Sparkling" ? "text-arqud-blue" : brand === "We Wash" ? "text-arqud-gold" : "text-arqud-muted"
                        }>{brand}</span>
                      </td>
                      <td className="py-3 pr-4 text-arqud-bone">{c.leads.toLocaleString()}</td>
                      <td className="py-3 pr-4 text-arqud-bone">{fmt(c.cpl)}</td>
                      <td className="py-3 pr-4 text-arqud-bone">{fmt(c.spend)}</td>
                      <td className="py-3 pr-4 text-arqud-bone">{c.reach.toLocaleString()}</td>
                      <td className="py-3 pr-4 text-arqud-bone">{(c.ctr * 100).toFixed(2)}%</td>
                      <td className="py-3 pr-4 text-arqud-muted">
                        {c.synced_at ? new Date(c.synced_at).toLocaleDateString("en-ZA") : "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {brandCampaigns[0]?.synced_at && (
            <p className="text-xs text-arqud-muted mt-4">
              Last synced: {new Date(brandCampaigns[0].synced_at).toLocaleString("en-ZA")}
            </p>
          )}
        </>
      )}
    </div>
  );
}
