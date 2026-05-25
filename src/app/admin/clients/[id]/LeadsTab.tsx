"use client";

import { useState, useTransition } from "react";

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

const STATUS_STYLES: Record<string, string> = {
  new: "text-arqud-gold border-arqud-gold",
  contacted: "text-blue-400 border-blue-400",
  converted: "text-green-400 border-green-400",
  lost: "text-red-400 border-red-400",
};

export function LeadsTab({ leads }: { leads: Lead[] }) {
  const total = leads.length;
  const converted = leads.filter((l) => l.status === "converted").length;
  const convRate = total > 0 ? Math.round((converted / total) * 100) : 0;

  if (total === 0) {
    return (
      <p className="text-arqud-muted text-sm py-4 border border-arqud-ink text-center">
        No leads yet — will populate once Meta ads go live.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick stats */}
      <div className="grid grid-cols-4 gap-px bg-arqud-ink border border-arqud-ink">
        {[
          { label: "Total", value: total },
          { label: "Contacted", value: leads.filter((l) => l.status === "contacted").length },
          { label: "Converted", value: converted },
          { label: "Conv. Rate", value: `${convRate}%` },
        ].map(({ label, value }) => (
          <div key={label} className="bg-arqud-night px-4 py-4">
            <p className="text-xs uppercase tracking-widest text-arqud-muted mb-1">{label}</p>
            <p className="font-display text-xl text-arqud-bone">{value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-arqud-ink">
            {["Date", "Name", "Phone", "Branch", "Campaign", "Status", "Notes"].map((h) => (
              <th key={h} className="text-left text-xs uppercase tracking-widest text-arqud-muted pb-3 pr-4">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead.id} className="border-b border-arqud-ink/50 hover:bg-arqud-night/50">
              <td className="py-3 pr-4 text-arqud-muted text-xs">
                {new Date(lead.created_at).toLocaleDateString("en-ZA")}
              </td>
              <td className="py-3 pr-4 text-arqud-bone">{lead.full_name ?? "—"}</td>
              <td className="py-3 pr-4 text-arqud-bone">
                {lead.phone ? (
                  <a href={`tel:${lead.phone}`} className="hover:text-arqud-gold">{lead.phone}</a>
                ) : "—"}
              </td>
              <td className="py-3 pr-4 text-arqud-bone">{lead.branch ?? "—"}</td>
              <td className="py-3 pr-4 text-arqud-muted text-xs">
                {lead.meta_campaign_name ?? lead.meta_ad_name ?? "—"}
              </td>
              <td className="py-3 pr-4">
                <span className={`text-xs uppercase tracking-widest border px-2 py-0.5 ${STATUS_STYLES[lead.status]}`}>
                  {lead.status}
                </span>
              </td>
              <td className="py-3 pr-4 text-arqud-muted text-xs max-w-xs truncate">
                {lead.notes ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
