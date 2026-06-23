"use client";

import { useMemo, useState } from "react";
import { KpiCard, Tabs, Pill, Table, Tr, Td } from "@/components/ui";
import { getBrand, BRAND_TONE } from "@/lib/leads/brand";

type Campaign = {
  id: string;
  name: string;
  leads: number;
  cpl: number;
  spend: number;
  reach: number;
  ctr: number;
  synced_at: string | null;
};

type BrandFilter = "all" | "Sparkling" | "We Wash";

const BRAND_TABS: { value: BrandFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "Sparkling", label: "Sparkling" },
  { value: "We Wash", label: "We Wash" },
];

// Campaigns carry the brand in their name (e.g. "We Wash — Four of a Kind R599").
const brandOf = (name: string) => getBrand({ meta_campaign_name: name, meta_ad_name: null });

export function CampaignsBrandView({ campaigns }: { campaigns: Campaign[] }) {
  const [brand, setBrand] = useState<BrandFilter>("all");

  const filtered = useMemo(
    () => campaigns.filter((c) => brand === "all" || brandOf(c.name) === brand),
    [campaigns, brand],
  );

  const totalLeads = filtered.reduce((s, c) => s + c.leads, 0);
  const totalSpend = filtered.reduce((s, c) => s + c.spend, 0);
  const totalReach = filtered.reduce((s, c) => s + c.reach, 0);
  const avgCpl = totalLeads > 0 ? totalSpend / totalLeads : 0;

  return (
    <div className="space-y-6">
      {/* Brand tabs — mirrors the Leads page so the split is consistent everywhere */}
      <div className="flex items-center justify-between">
        <Tabs
          tabs={BRAND_TABS.map((t) => t.label)}
          value={BRAND_TABS.find((t) => t.value === brand)!.label}
          onChange={(label) => setBrand(BRAND_TABS.find((t) => t.label === label)!.value)}
        />
        <Pill tone={brand === "all" ? "neutral" : BRAND_TONE[brand]}>
          {filtered.length} campaign{filtered.length !== 1 ? "s" : ""}
        </Pill>
      </div>

      {/* KPIs recompute for the selected brand */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <KpiCard label="Leads" value={totalLeads.toLocaleString()} />
        <KpiCard label="Avg CPL" value={`R ${avgCpl.toFixed(2)}`} />
        <KpiCard label="Spend" value={`R ${totalSpend.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`} />
        <KpiCard label="Reach" value={totalReach.toLocaleString()} />
      </div>

      {filtered.length === 0 ? (
        <div className="py-10 text-center text-arqud-muted text-xs uppercase tracking-widest">
          No campaigns for this brand yet
        </div>
      ) : (
        <Table>
          <Tr header>
            <Td className="basis-[1.6fr] grow">Campaign</Td>
            <Td className="basis-[1fr] grow">Brand</Td>
            <Td className="basis-[0.8fr] grow">Leads</Td>
            <Td className="basis-[0.8fr] grow">CPL</Td>
            <Td className="basis-[1fr] grow">Spend</Td>
            <Td className="basis-[0.9fr] grow">Reach</Td>
            <Td className="basis-[0.7fr] grow">CTR</Td>
            <Td className="basis-[1fr] grow text-right">Last Synced</Td>
          </Tr>
          {filtered.map((c) => (
            <Tr key={c.id}>
              <Td className="basis-[1.6fr] grow text-arqud-bone truncate">{c.name}</Td>
              <Td className="basis-[1fr] grow">
                <Pill tone={BRAND_TONE[brandOf(c.name)]}>{brandOf(c.name)}</Pill>
              </Td>
              <Td className="basis-[0.8fr] grow">{c.leads.toLocaleString()}</Td>
              <Td className="basis-[0.8fr] grow">R {Number(c.cpl).toFixed(2)}</Td>
              <Td className="basis-[1fr] grow">R {Number(c.spend).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}</Td>
              <Td className="basis-[0.9fr] grow">{c.reach.toLocaleString()}</Td>
              <Td className="basis-[0.7fr] grow">{(Number(c.ctr) * 100).toFixed(2)}%</Td>
              <Td className="basis-[1fr] grow text-right text-arqud-muted">
                {c.synced_at ? new Date(c.synced_at).toLocaleDateString("en-ZA") : "—"}
              </Td>
            </Tr>
          ))}
        </Table>
      )}
    </div>
  );
}
