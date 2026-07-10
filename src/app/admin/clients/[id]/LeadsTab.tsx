"use client";

import { Card, Table, Tr, Td, Pill, Avatar } from "@/components/ui";
import { getBrand, BRAND_TONE, STATUS_TONE, initialsOf } from "@/lib/leads/brand";
import { formatDateTime } from "@/lib/leads/format";

type Lead = {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  branch: string | null;
  meta_campaign_name: string | null;
  meta_ad_name: string | null;
  status: "new" | "contacted" | "converted" | "lost";
  notes: string | null;
  created_at: string;
};

export function LeadsTab({ leads }: { leads: Lead[] }) {
  const total = leads.length;
  const converted = leads.filter((l) => l.status === "converted").length;
  const convRate = total > 0 ? Math.round((converted / total) * 100) : 0;

  if (total === 0) {
    return (
      <Card>
        <p className="text-arqud-muted text-sm py-6 text-center">
          No leads yet — will populate once Meta ads go live.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {/* Quick stats */}
      <div className="grid grid-cols-4 gap-3.5">
        {[
          { label: "Total", value: total },
          { label: "Contacted", value: leads.filter((l) => l.status === "contacted").length },
          { label: "Converted", value: converted },
          { label: "Conv. Rate", value: `${convRate}%` },
        ].map(({ label, value }) => (
          <Card key={label} className="relative gold-topedge overflow-hidden">
            <p className="text-[10px] tracking-[0.14em] uppercase text-arqud-muted">{label}</p>
            <p className="stat-number text-[26px] mt-2.5">{value}</p>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Table>
        <Tr header>
          <Td className="basis-[120px] grow-0 shrink-0">Date</Td>
          <Td className="basis-[1.3fr] grow">Name</Td>
          <Td className="basis-[1fr] grow">Branch</Td>
          <Td className="basis-[1.1fr] grow">Brand</Td>
          <Td className="basis-[0.9fr] grow">Status</Td>
          <Td className="basis-[1.4fr] grow">Notes</Td>
        </Tr>

        {leads.map((lead) => (
          <Tr key={lead.id}>
            <Td className="basis-[120px] grow-0 shrink-0 text-arqud-muted">{formatDateTime(lead.created_at)}</Td>
            <Td className="basis-[1.3fr] grow">
              <div className="flex items-center gap-2.5 text-arqud-bone">
                <Avatar initials={initialsOf(lead.full_name)} />
                <div className="min-w-0">
                  <p className="truncate">{lead.full_name ?? "Unnamed lead"}</p>
                  {lead.phone && (
                    <a href={`tel:${lead.phone}`} className="text-[11px] text-arqud-muted hover:text-arqud-gold truncate block">
                      {lead.phone}
                    </a>
                  )}
                </div>
              </div>
            </Td>
            <Td className="basis-[1fr] grow">
              {lead.branch ? <Pill tone="branch">{lead.branch}</Pill> : <Pill tone="neutral">No branch</Pill>}
            </Td>
            <Td className="basis-[1.1fr] grow">
              <Pill tone={BRAND_TONE[getBrand(lead)]}>{getBrand(lead)}</Pill>
            </Td>
            <Td className="basis-[0.9fr] grow">
              <Pill tone={STATUS_TONE[lead.status] ?? "neutral"}>{lead.status}</Pill>
            </Td>
            <Td className="basis-[1.4fr] grow text-arqud-muted text-[12px] truncate">
              {lead.notes ?? "—"}
            </Td>
          </Tr>
        ))}
      </Table>
    </div>
  );
}
