"use client";

import { useState, useTransition, useMemo } from "react";
import { updateLeadStatus } from "./actions";

export type Lead = {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  branch: string | null;
  meta_campaign_name: string | null;
  meta_ad_name: string | null;
  status: "new" | "contacted" | "converted" | "lost";
  notes: string | null;
  follow_up_date: string | null;
  created_at: string;
};

const STATUS_STYLES: Record<string, string> = {
  new: "text-arqud-gold border-arqud-gold/60 bg-arqud-gold/10",
  contacted: "text-blue-400 border-blue-400/60 bg-blue-400/10",
  converted: "text-green-400 border-green-400/60 bg-green-400/10",
  lost: "text-red-400 border-red-400/60 bg-red-400/10",
};

const STATUS_OPTIONS = ["new", "contacted", "converted", "lost"] as const;

type DateFilter = "today" | "week" | "month" | "all";
type BrandFilter = "all" | "Sparkling" | "We Wash";

function getBrand(lead: Lead): "Sparkling" | "We Wash" | "Other" {
  const name = (lead.meta_campaign_name ?? lead.meta_ad_name ?? "").toLowerCase();
  if (name.includes("sparkling")) return "Sparkling";
  if (name.includes("we wash") || name.includes("wewash") || name.includes("wwcars")) return "We Wash";
  return "Other";
}

const BRAND_STYLES: Record<string, string> = {
  Sparkling: "text-blue-400 border-blue-400/60 bg-blue-400/10",
  "We Wash": "text-arqud-gold border-arqud-gold/60 bg-arqud-gold/10",
  Other: "text-arqud-muted border-arqud-ink bg-transparent",
};

function toE164(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) return "27" + digits.slice(1);
  return digits;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-ZA", { day: "2-digit", month: "short" });
}

function exportCsv(leads: Lead[]) {
  const header = ["Date", "Name", "Phone", "Email", "Branch", "Campaign", "Status", "Notes", "Follow-up"];
  const rows = leads.map((l) => [
    formatDate(l.created_at),
    l.full_name ?? "",
    l.phone ?? "",
    l.email ?? "",
    l.branch ?? "",
    l.meta_campaign_name ?? l.meta_ad_name ?? "",
    l.status,
    (l.notes ?? "").replace(/,/g, ";"),
    l.follow_up_date ?? "",
  ]);
  const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function LeadsClient({ leads: initial }: { leads: Lead[] }) {
  const [leads, setLeads] = useState(initial);
  const [selected, setSelected] = useState<Lead | null>(null);
  const [brandFilter, setBrandFilter] = useState<BrandFilter>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [search, setSearch] = useState("");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const branches = useMemo(() => {
    const b = new Set(leads.map((l) => l.branch).filter(Boolean) as string[]);
    return Array.from(b).sort();
  }, [leads]);

  const campaigns = useMemo(() => {
    const map = new Map<string, { leads: number; converted: number }>();
    leads.forEach((l) => {
      const key = l.meta_campaign_name ?? l.meta_ad_name ?? "Unknown";
      const existing = map.get(key) ?? { leads: 0, converted: 0 };
      map.set(key, {
        leads: existing.leads + 1,
        converted: existing.converted + (l.status === "converted" ? 1 : 0),
      });
    });
    return Array.from(map.entries())
      .map(([name, data]) => ({ name, ...data, rate: data.leads > 0 ? Math.round((data.converted / data.leads) * 100) : 0 }))
      .sort((a, b) => b.leads - a.leads);
  }, [leads]);

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      if (brandFilter !== "all" && getBrand(l) !== brandFilter) return false;
      if (statusFilter !== "all" && l.status !== statusFilter) return false;
      if (branchFilter !== "all" && l.branch !== branchFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const match = [l.full_name, l.phone, l.email, l.branch].some((v) => v?.toLowerCase().includes(q));
        if (!match) return false;
      }
      if (dateFilter !== "all") {
        const created = new Date(l.created_at);
        created.setHours(0, 0, 0, 0);
        if (dateFilter === "today") {
          if (created.getTime() !== today.getTime()) return false;
        } else if (dateFilter === "week") {
          const weekAgo = new Date(today); weekAgo.setDate(today.getDate() - 7);
          if (created < weekAgo) return false;
        } else if (dateFilter === "month") {
          const monthAgo = new Date(today); monthAgo.setMonth(today.getMonth() - 1);
          if (created < monthAgo) return false;
        }
      }
      return true;
    });
  }, [leads, statusFilter, branchFilter, dateFilter, search, today]);

  function handleUpdated(updated: Lead) {
    setLeads((prev) => prev.map((l) => l.id === updated.id ? updated : l));
    setSelected(null);
  }

  const filterBtn = (active: boolean) =>
    `px-3 py-1.5 text-xs uppercase tracking-widest border transition-colors ${
      active ? "border-arqud-gold text-arqud-gold" : "border-arqud-ink text-arqud-muted hover:border-arqud-gold/50 hover:text-arqud-bone"
    }`;

  return (
    <>
      {/* Lead Source Breakdown */}
      {campaigns.length > 1 && (
        <div className="grid gap-3 mb-6" style={{ gridTemplateColumns: `repeat(${Math.min(campaigns.length, 4)}, 1fr)` }}>
          {campaigns.map((c) => (
            <div key={c.name} className="bg-arqud-night border border-arqud-ink px-4 py-4">
              <p className="text-xs uppercase tracking-widest text-arqud-muted mb-2 truncate">{c.name}</p>
              <p className="font-display text-2xl text-arqud-bone mb-1">{c.leads}</p>
              <p className="text-xs text-arqud-muted">
                {c.converted} converted · <span className="text-green-400">{c.rate}%</span>
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Brand Tabs */}
      <div className="flex gap-0 mb-5 border-b border-arqud-ink">
        {(["all", "Sparkling", "We Wash"] as const).map((b) => (
          <button
            key={b}
            onClick={() => { setBrandFilter(b); setBranchFilter("all"); }}
            className={`px-5 py-2.5 text-xs uppercase tracking-widest border-b-2 transition-colors -mb-px ${
              brandFilter === b
                ? b === "Sparkling"
                  ? "border-blue-400 text-blue-400"
                  : b === "We Wash"
                  ? "border-arqud-gold text-arqud-gold"
                  : "border-arqud-gold text-arqud-gold"
                : "border-transparent text-arqud-muted hover:text-arqud-bone"
            }`}
          >
            {b === "all" ? "All Leads" : b}
          </button>
        ))}
        <span className="ml-auto flex items-center text-xs text-arqud-muted pr-1">
          {brandFilter !== "all" && (
            <span className={`text-xs border px-2 py-0.5 ${BRAND_STYLES[brandFilter]}`}>
              {leads.filter(l => getBrand(l) === brandFilter).length} leads
            </span>
          )}
        </span>
      </div>

      {/* Filters + Export */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        {/* Search */}
        <input
          type="text"
          placeholder="Search name, phone, branch…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-arqud-night border border-arqud-ink px-3 py-1.5 text-xs text-arqud-bone placeholder-arqud-muted focus:border-arqud-gold focus:outline-none w-52"
        />

        {/* Status */}
        <div className="flex gap-1">
          {["all", ...STATUS_OPTIONS].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)} className={filterBtn(statusFilter === s)}>
              {s}
            </button>
          ))}
        </div>

        {/* Branch */}
        {branches.length > 0 && (
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => setBranchFilter("all")}
              className={filterBtn(branchFilter === "all")}
            >
              All branches
            </button>
            {branches.map((b) => (
              <button
                key={b}
                onClick={() => setBranchFilter(b)}
                className={`px-3 py-1.5 text-xs uppercase tracking-widest border transition-colors ${
                  branchFilter === b
                    ? "border-arqud-gold bg-arqud-gold/10 text-arqud-gold"
                    : "border-arqud-ink text-arqud-muted hover:border-arqud-gold/50 hover:text-arqud-bone"
                }`}
              >
                {b}
              </button>
            ))}
          </div>
        )}

        {/* Date */}
        <div className="flex gap-1">
          {([["today", "Today"], ["week", "7 days"], ["month", "30 days"], ["all", "All time"]] as const).map(([val, label]) => (
            <button key={val} onClick={() => setDateFilter(val)} className={filterBtn(dateFilter === val)}>
              {label}
            </button>
          ))}
        </div>

        {/* Export */}
        <button
          onClick={() => exportCsv(filtered)}
          className="ml-auto px-3 py-1.5 text-xs uppercase tracking-widest border border-arqud-ink text-arqud-muted hover:border-arqud-gold hover:text-arqud-gold transition-colors"
        >
          Export CSV
        </button>
      </div>

      {/* Count */}
      <p className="text-xs text-arqud-muted mb-3">{filtered.length} lead{filtered.length !== 1 ? "s" : ""}</p>

      {/* Table */}
      <div className="border border-arqud-ink overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-arqud-night border-b border-arqud-ink">
              {["Date", "Name", "Contact", "Branch", "Brand", "Follow-up", "Status", ""].map((h) => (
                <th key={h} className="text-left text-xs uppercase tracking-widest text-arqud-muted px-4 py-3 font-normal whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-10 text-arqud-muted text-xs uppercase tracking-widest">
                  No leads match your filters
                </td>
              </tr>
            )}
            {filtered.map((lead) => {
              const e164 = lead.phone ? toE164(lead.phone) : null;
              const isOverdue = lead.follow_up_date && new Date(lead.follow_up_date) < new Date(new Date().toDateString());
              return (
                <tr key={lead.id} className="border-b border-arqud-ink/50 hover:bg-arqud-night/60 transition-colors">
                  <td className="px-4 py-3 text-arqud-muted text-xs whitespace-nowrap">{formatDate(lead.created_at)}</td>
                  <td className="px-4 py-3 text-arqud-bone font-medium whitespace-nowrap">{lead.full_name ?? "—"}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {e164 && (
                        <>
                          <a
                            href={`https://wa.me/${e164}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="WhatsApp"
                            className="flex items-center justify-center w-7 h-7 border border-green-700/60 text-green-400 hover:bg-green-900/30 transition-colors text-xs"
                          >
                            WA
                          </a>
                          <a
                            href={`tel:${lead.phone}`}
                            title="Call"
                            className="flex items-center justify-center w-7 h-7 border border-arqud-ink text-arqud-muted hover:border-arqud-gold/60 hover:text-arqud-gold transition-colors text-xs"
                          >
                            ☎
                          </a>
                        </>
                      )}
                      <span className="text-arqud-muted text-xs">{lead.phone ?? "—"}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {lead.branch ? (
                      <span className="text-xs border border-arqud-gold/50 bg-arqud-gold/10 text-arqud-gold px-2 py-0.5 uppercase tracking-widest">
                        {lead.branch}
                      </span>
                    ) : (
                      <span className="text-xs border border-red-500/50 bg-red-500/10 text-red-400 px-2 py-0.5 uppercase tracking-widest">
                        No branch
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs whitespace-nowrap">
                    <span className={`text-xs border px-2 py-0.5 uppercase tracking-widest ${BRAND_STYLES[getBrand(lead)]}`}>
                      {getBrand(lead)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs whitespace-nowrap">
                    {lead.follow_up_date ? (
                      <span className={isOverdue ? "text-red-400" : "text-arqud-bone"}>
                        {new Date(lead.follow_up_date).toLocaleDateString("en-ZA", { day: "2-digit", month: "short" })}
                        {isOverdue && " ⚠"}
                      </span>
                    ) : (
                      <span className="text-arqud-muted/40">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`text-xs uppercase tracking-widest border px-2 py-0.5 ${STATUS_STYLES[lead.status]}`}>
                      {lead.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button
                      onClick={() => setSelected(lead)}
                      className="text-xs uppercase tracking-widest text-arqud-muted hover:text-arqud-gold transition-colors"
                    >
                      Update
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selected && (
        <LeadModal lead={selected} onClose={() => setSelected(null)} onUpdated={handleUpdated} />
      )}
    </>
  );
}

function LeadModal({ lead, onClose, onUpdated }: { lead: Lead; onClose: () => void; onUpdated: (l: Lead) => void }) {
  const [status, setStatus] = useState(lead.status);
  const [notes, setNotes] = useState(lead.notes ?? "");
  const [followUpDate, setFollowUpDate] = useState(lead.follow_up_date ?? "");
  const [isPending, start] = useTransition();
  const [err, setErr] = useState("");

  const e164 = lead.phone ? toE164(lead.phone) : null;

  function save() {
    setErr("");
    start(async () => {
      try {
        await updateLeadStatus(lead.id, status, notes, followUpDate || null);
        onUpdated({ ...lead, status, notes: notes.trim() || null, follow_up_date: followUpDate || null });
      } catch {
        setErr("Could not save. Please try again.");
      }
    });
  }

  const inputCls = "w-full bg-arqud-black border border-arqud-ink px-4 py-3 text-arqud-bone focus:border-arqud-gold focus:outline-none text-sm";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-md bg-arqud-night border border-arqud-ink p-8 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl text-arqud-gold">{lead.full_name ?? "Lead"}</h2>
          <button onClick={onClose} className="text-arqud-muted hover:text-arqud-bone text-xl leading-none">✕</button>
        </div>

        {/* Contact info */}
        <div className="space-y-2 border border-arqud-ink p-4">
          {lead.phone && (
            <div className="flex items-center justify-between">
              <span className="text-arqud-bone text-sm">{lead.phone}</span>
              <div className="flex gap-2">
                {e164 && (
                  <a href={`https://wa.me/${e164}`} target="_blank" rel="noopener noreferrer"
                    className="px-3 py-1 text-xs border border-green-700/60 text-green-400 hover:bg-green-900/30 transition-colors uppercase tracking-widest">
                    WhatsApp
                  </a>
                )}
                <a href={`tel:${lead.phone}`}
                  className="px-3 py-1 text-xs border border-arqud-ink text-arqud-muted hover:border-arqud-gold hover:text-arqud-gold transition-colors uppercase tracking-widest">
                  Call
                </a>
              </div>
            </div>
          )}
          {lead.email && <p className="text-arqud-muted text-xs">{lead.email}</p>}
          {lead.branch && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-arqud-muted text-xs uppercase tracking-widest">Branch:</span>
              <span className="text-xs border border-arqud-gold/50 bg-arqud-gold/10 text-arqud-gold px-2 py-0.5 uppercase tracking-widest">
                {lead.branch}
              </span>
            </div>
          )}
          {lead.meta_campaign_name && <p className="text-arqud-muted text-xs">Campaign: {lead.meta_campaign_name}</p>}
          <p className="text-arqud-muted text-xs">
            {new Date(lead.created_at).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>

        {err && <p className="text-red-400 text-sm">{err}</p>}

        <div>
          <label className="block text-xs uppercase tracking-widest text-arqud-muted mb-1.5">Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className={inputCls}>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs uppercase tracking-widest text-arqud-muted mb-1.5">Follow-up date</label>
          <input
            type="date"
            value={followUpDate}
            onChange={(e) => setFollowUpDate(e.target.value)}
            className={inputCls}
          />
        </div>

        <div>
          <label className="block text-xs uppercase tracking-widest text-arqud-muted mb-1.5">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Left voicemail, follow up Thursday…"
            className={`${inputCls} resize-none`}
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={save}
            disabled={isPending}
            className="flex-1 bg-arqud-gold py-3 text-sm font-semibold uppercase tracking-widest text-arqud-black hover:opacity-90 disabled:opacity-50"
          >
            {isPending ? "Saving…" : "Save"}
          </button>
          <button
            onClick={onClose}
            className="flex-1 border border-arqud-ink py-3 text-sm uppercase tracking-widest text-arqud-muted hover:text-arqud-bone"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
