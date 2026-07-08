"use client";

import { useState, useTransition, useMemo } from "react";
import { updateLeadStatus, deleteLead } from "./actions";
import { Button, Card, FilterPill, Pill, Tabs, Table, Tr, Td, Avatar, PageHeader } from "@/components/ui";
import { getBrand, BRAND_TONE, STATUS_TONE, initialsOf } from "@/lib/leads/brand";
import { WE_WASH_BRANCHES, SPARKLING_BRANCHES, branchesForBrand, type BrandName } from "@/lib/leads/branches";

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

const STATUS_OPTIONS = ["new", "contacted", "converted", "lost"] as const;

// ── Archive trigger ──────────────────────────────────────────────────────────
// SINGLE source of truth for which statuses move a lead from Active → Archive.
// Default = B (resolved): converted | lost. To switch to "archive on contacted",
// change this one line (e.g. ["contacted", "converted", "lost"]).
const ARCHIVE_STATUSES: ReadonlyArray<Lead["status"]> = ["converted", "lost"];
const isArchived = (l: Lead) => ARCHIVE_STATUSES.includes(l.status);

type DateFilter = "today" | "week" | "month" | "all";
type BrandFilter = "all" | "Sparkling" | "We Wash";
type ViewMode = "active" | "archive";

const BRAND_TABS: { value: BrandFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "Sparkling", label: "Sparkling" },
  { value: "We Wash", label: "We Wash" },
];

function toE164(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) return "27" + digits.slice(1);
  return digits;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-ZA", { day: "2-digit", month: "short" });
}

// Newest-first month key + label for archive grouping.
function monthKey(d: string) {
  const date = new Date(d);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
function monthLabel(d: string) {
  return new Date(d).toLocaleDateString("en-ZA", { month: "long", year: "numeric" });
}

// Brand-qualified branch label, e.g. "We Wash — Sunward (Boksburg)". Two branches
// share "Faerie Glen" across brands, so the prefix disambiguates at a glance.
function qualifiedBranch(lead: Lead) {
  const brand = getBrand(lead);
  if (!lead.branch) return null;
  if (brand === "Other") return lead.branch;
  return `${brand} — ${lead.branch}`;
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

export function LeadsClient({ leads: initial, total }: { leads: Lead[]; total?: number }) {
  const [leads, setLeads] = useState(initial);
  const [selected, setSelected] = useState<Lead | null>(null);
  const [view, setView] = useState<ViewMode>("active");
  const [brandFilter, setBrandFilter] = useState<BrandFilter>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [search, setSearch] = useState("");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Branch pills: show the FULL roster for the selected brand tab (even with zero
  // leads), then append any branch seen in the data that isn't in the roster.
  // Scoped to the selected brand — fixes the old bug where pills came from ALL
  // leads regardless of the active brand tab.
  const branches = useMemo(() => {
    const ordered: string[] = [];
    const seen = new Set<string>();
    const push = (b: string) => {
      if (!seen.has(b)) { seen.add(b); ordered.push(b); }
    };

    if (brandFilter === "all") {
      WE_WASH_BRANCHES.forEach(push);
      SPARKLING_BRANCHES.forEach(push);
    } else {
      branchesForBrand(brandFilter as BrandName).forEach(push);
    }

    // Defensive: append branches present in leads (for the active brand scope)
    // that aren't part of the canonical roster.
    leads.forEach((l) => {
      if (!l.branch) return;
      if (brandFilter !== "all" && getBrand(l) !== brandFilter) return;
      push(l.branch);
    });

    return ordered;
  }, [leads, brandFilter]);

  // Per-special performance cards — grouped from the real leads data, no new query.
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

  const activeCount = useMemo(() => leads.filter((l) => !isArchived(l)).length, [leads]);
  const archiveCount = useMemo(() => leads.filter((l) => isArchived(l)).length, [leads]);

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      // Active vs Archive split — status-derived, never destructive.
      if (view === "active" && isArchived(l)) return false;
      if (view === "archive" && !isArchived(l)) return false;
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
  }, [leads, view, brandFilter, statusFilter, branchFilter, dateFilter, search, today]);

  // Archive view: group filtered leads by month (from created_at), newest first.
  const monthGroups = useMemo(() => {
    if (view !== "archive") return [];
    const map = new Map<string, { label: string; leads: Lead[] }>();
    filtered.forEach((l) => {
      const key = monthKey(l.created_at);
      const group = map.get(key) ?? { label: monthLabel(l.created_at), leads: [] };
      group.leads.push(l);
      map.set(key, group);
    });
    return Array.from(map.entries())
      .sort((a, b) => (a[0] < b[0] ? 1 : -1)) // newest month first
      .map(([key, group]) => ({ key, ...group }));
  }, [filtered, view]);

  function handleUpdated(updated: Lead) {
    setLeads((prev) => prev.map((l) => l.id === updated.id ? updated : l));
    setSelected(null);
  }

  function handleDeleted(id: string) {
    setLeads((prev) => prev.filter((l) => l.id !== id));
    setSelected(null);
  }

  const filterBtn = (active: boolean) =>
    `px-3 py-1.5 text-[10.5px] uppercase tracking-widest border rounded-control transition-colors ${
      active ? "border-arqud-gold text-arqud-gold-soft bg-arqud-gold/10" : "border-arqud-line-2 text-arqud-muted hover:border-arqud-gold/50 hover:text-arqud-bone"
    }`;

  return (
    <>
      {total !== undefined ? (
        <PageHeader title="Leads" count={`${total} total`}>
          <Button variant="outline" size="sm" onClick={() => exportCsv(filtered)}>
            ⤓ Export CSV
          </Button>
        </PageHeader>
      ) : (
        <div className="flex justify-end mb-5">
          <Button variant="outline" size="sm" onClick={() => exportCsv(filtered)}>
            ⤓ Export CSV
          </Button>
        </div>
      )}

      {/* Active / Archive segment — Archive is a status-derived view (converted/lost),
          never a destructive move. Leads are never auto-deleted. */}
      <div className="flex flex-wrap items-center gap-1.5 mb-5">
        {([["active", "Active", activeCount], ["archive", "Archive", archiveCount]] as const).map(([val, label, count]) => (
          <button
            key={val}
            onClick={() => { setView(val); setBranchFilter("all"); setStatusFilter("all"); }}
            className={`flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-widest rounded-control border transition-colors ${
              view === val
                ? "border-arqud-gold text-arqud-gold-soft bg-arqud-gold/10"
                : "border-arqud-line-2 text-arqud-muted hover:border-arqud-gold/50 hover:text-arqud-bone"
            }`}
          >
            {label}
            <span className={`text-[10px] ${view === val ? "text-arqud-gold-soft/70" : "text-arqud-muted"}`}>{count}</span>
          </button>
        ))}
        <p className="basis-full sm:basis-auto sm:ml-2 text-[10.5px] text-arqud-muted">
          {view === "active"
            ? "New & contacted leads to work."
            : "Resolved leads (converted / lost), grouped by month — kept for re-engagement."}
        </p>
      </div>

      {/* Per-special performance cards */}
      {campaigns.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5">
          {campaigns.map((c) => (
            <Card key={c.name} className="relative gold-topedge overflow-hidden">
              <p className="text-[11px] text-arqud-bone font-semibold truncate">{c.name}</p>
              <p className="stat-number text-[26px] my-2.5">{c.leads}</p>
              <p className="text-[10px] text-arqud-green">{c.rate}% converted</p>
            </Card>
          ))}
        </div>
      )}

      {/* Brand Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
        <Tabs
          tabs={BRAND_TABS.map((t) => t.label)}
          value={BRAND_TABS.find((t) => t.value === brandFilter)!.label}
          onChange={(label) => {
            const tab = BRAND_TABS.find((t) => t.label === label)!;
            setBrandFilter(tab.value);
            setBranchFilter("all");
          }}
        />
        {brandFilter !== "all" && (
          <Pill tone={BRAND_TONE[brandFilter]}>
            {filtered.filter((l) => getBrand(l) === brandFilter).length} leads
          </Pill>
        )}
      </div>

      {/* Branch filter pills — full roster for the selected brand, always visible */}
      {branches.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3.5">
          <FilterPill active={branchFilter === "all"} onClick={() => setBranchFilter("all")}>
            All branches
          </FilterPill>
          {branches.map((b) => (
            <FilterPill key={b} active={branchFilter === b} onClick={() => setBranchFilter(b)}>
              {b}
            </FilterPill>
          ))}
        </div>
      )}

      {/* Search + status + date filters */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <input
          type="text"
          placeholder="Search name, phone, branch…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-arqud-panel border border-arqud-line-2 rounded-control px-3.5 py-2 text-xs text-arqud-bone placeholder:text-arqud-muted focus:outline-none focus:ring-1 focus:ring-arqud-gold/40 w-full sm:w-52"
        />

        <div className="flex flex-wrap gap-1">
          {["all", ...STATUS_OPTIONS].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)} className={filterBtn(statusFilter === s)}>
              {s}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-1">
          {([["today", "Today"], ["week", "7 days"], ["month", "30 days"], ["all", "All time"]] as const).map(([val, label]) => (
            <button key={val} onClick={() => setDateFilter(val)} className={filterBtn(dateFilter === val)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Count */}
      <p className="text-xs text-arqud-muted mb-3">{filtered.length} lead{filtered.length !== 1 ? "s" : ""}</p>

      {/* Table */}
      <Table>
        <Tr header>
          <Td className="basis-[70px] grow-0 shrink-0">Date</Td>
          <Td className="basis-[1.3fr] grow">Name</Td>
          <Td className="basis-[1.4fr] grow">Branch</Td>
          <Td className="basis-[0.9fr] grow">Status</Td>
          <Td className="basis-[1fr] grow text-right">Action</Td>
        </Tr>

        {filtered.length === 0 && (
          <div className="py-10 text-center text-arqud-muted text-xs uppercase tracking-widest">
            {view === "archive" ? "No archived leads yet" : "No leads match your filters"}
          </div>
        )}

        {/* Archive: month-grouped sections, newest first */}
        {view === "archive"
          ? monthGroups.map((group) => (
              <div key={group.key}>
                <div className="flex items-center gap-3 pt-4 pb-1.5">
                  <span className="text-[10px] uppercase tracking-[0.18em] text-arqud-gold-dim">{group.label}</span>
                  <span className="text-[10px] text-arqud-muted">{group.leads.length}</span>
                  <span className="flex-1 h-px bg-arqud-line/60" />
                </div>
                {group.leads.map((lead) => (
                  <LeadRow key={lead.id} lead={lead} onSelect={() => setSelected(lead)} />
                ))}
              </div>
            ))
          : filtered.map((lead) => (
              <LeadRow key={lead.id} lead={lead} onSelect={() => setSelected(lead)} />
            ))}
      </Table>

      {selected && (
        <LeadModal lead={selected} onClose={() => setSelected(null)} onUpdated={handleUpdated} onDeleted={handleDeleted} />
      )}
    </>
  );
}

function LeadRow({ lead, onSelect }: { lead: Lead; onSelect: () => void }) {
  const e164 = lead.phone ? toE164(lead.phone) : null;
  const isOverdue = lead.follow_up_date && new Date(lead.follow_up_date) < new Date(new Date().toDateString());
  const branchLabel = qualifiedBranch(lead);
  return (
    <Tr className="cursor-pointer" onClick={onSelect}>
      <Td className="basis-[70px] grow-0 shrink-0 text-arqud-muted">{formatDate(lead.created_at)}</Td>
      <Td className="basis-[1.3fr] grow">
        <div className="flex items-center gap-2.5 text-arqud-bone">
          <Avatar initials={initialsOf(lead.full_name)} />
          <span className="truncate">{lead.full_name ?? "Unnamed lead"}</span>
        </div>
      </Td>
      <Td className="basis-[1.4fr] grow">
        {branchLabel ? (
          <Pill tone={BRAND_TONE[getBrand(lead)] ?? "branch"}>{branchLabel}</Pill>
        ) : (
          <Pill tone="neutral">No branch</Pill>
        )}
      </Td>
      <Td className="basis-[0.9fr] grow flex items-center gap-2">
        <Pill tone={STATUS_TONE[lead.status] ?? "neutral"}>{lead.status}</Pill>
        {lead.follow_up_date && (
          <span className={`text-[10px] ${isOverdue ? "text-red-400" : "text-arqud-muted"}`} title="Follow-up date">
            {isOverdue && "⚠ "}
            {new Date(lead.follow_up_date).toLocaleDateString("en-ZA", { day: "2-digit", month: "short" })}
          </span>
        )}
      </Td>
      <Td className="basis-[1fr] grow text-right" onClick={(e) => e.stopPropagation()}>
        {e164 ? (
          <a
            href={`https://wa.me/${e164}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-arqud-green text-[12px] font-medium hover:underline"
          >
            WhatsApp →
          </a>
        ) : (
          <span className="text-arqud-muted text-[12px]">—</span>
        )}
      </Td>
    </Tr>
  );
}

function LeadModal({
  lead, onClose, onUpdated, onDeleted,
}: {
  lead: Lead;
  onClose: () => void;
  onUpdated: (l: Lead) => void;
  onDeleted: (id: string) => void;
}) {
  const [status, setStatus] = useState(lead.status);
  const [notes, setNotes] = useState(lead.notes ?? "");
  const [followUpDate, setFollowUpDate] = useState(lead.follow_up_date ?? "");
  const [isPending, start] = useTransition();
  const [isDeleting, startDelete] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [err, setErr] = useState("");

  const e164 = lead.phone ? toE164(lead.phone) : null;
  const branchLabel = qualifiedBranch(lead);

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

  function remove() {
    setErr("");
    startDelete(async () => {
      try {
        await deleteLead(lead.id);
        onDeleted(lead.id);
      } catch {
        setErr("Could not delete. Please try again.");
      }
    });
  }

  const inputCls = "w-full bg-arqud-bg border border-arqud-line-2 rounded-control px-4 py-3 text-arqud-bone focus:border-arqud-gold focus:outline-none text-sm";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-md panel-gradient border border-arqud-line rounded-card p-8 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl text-arqud-gold">{lead.full_name ?? "Lead"}</h2>
          <button onClick={onClose} className="text-arqud-muted hover:text-arqud-bone text-xl leading-none">✕</button>
        </div>

        {/* Contact info */}
        <div className="space-y-2 border border-arqud-line rounded-control p-4">
          {lead.phone && (
            <div className="flex items-center justify-between">
              <span className="text-arqud-bone text-sm">{lead.phone}</span>
              <div className="flex gap-2">
                {e164 && (
                  <a href={`https://wa.me/${e164}`} target="_blank" rel="noopener noreferrer"
                    className="px-3 py-1 text-xs border border-green-700/60 text-arqud-green hover:bg-green-900/30 transition-colors uppercase tracking-widest rounded-control">
                    WhatsApp
                  </a>
                )}
                <a href={`tel:${lead.phone}`}
                  className="px-3 py-1 text-xs border border-arqud-line-2 text-arqud-muted hover:border-arqud-gold hover:text-arqud-gold transition-colors uppercase tracking-widest rounded-control">
                  Call
                </a>
              </div>
            </div>
          )}
          {lead.email && <p className="text-arqud-muted text-xs">{lead.email}</p>}
          {branchLabel && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-arqud-muted text-xs uppercase tracking-widest">Branch:</span>
              <Pill tone={BRAND_TONE[getBrand(lead)] ?? "branch"}>{branchLabel}</Pill>
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
            disabled={isPending || isDeleting}
            className="flex-1 bg-arqud-gold py-3 text-sm font-semibold uppercase tracking-widest text-arqud-bg hover:opacity-90 disabled:opacity-50 rounded-control"
          >
            {isPending ? "Saving…" : "Save"}
          </button>
          <button
            onClick={onClose}
            className="flex-1 border border-arqud-line-2 py-3 text-sm uppercase tracking-widest text-arqud-muted hover:text-arqud-bone rounded-control"
          >
            Cancel
          </button>
        </div>

        {/* Delete — junk/test leads only. Confirm before hard-deleting. */}
        <div className="pt-2 border-t border-arqud-line/60">
          {confirmDelete ? (
            <div className="space-y-2.5">
              <p className="text-xs text-red-400">Delete permanently? This can&apos;t be undone.</p>
              <div className="flex gap-3">
                <button
                  onClick={remove}
                  disabled={isDeleting}
                  className="flex-1 border border-red-400/40 bg-red-400/10 py-2.5 text-xs font-semibold uppercase tracking-widest text-red-400 hover:bg-red-400/20 disabled:opacity-50 rounded-control"
                >
                  {isDeleting ? "Deleting…" : "Yes, delete"}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  disabled={isDeleting}
                  className="flex-1 border border-arqud-line-2 py-2.5 text-xs uppercase tracking-widest text-arqud-muted hover:text-arqud-bone disabled:opacity-50 rounded-control"
                >
                  Keep
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-[11px] uppercase tracking-widest text-arqud-muted hover:text-red-400 transition-colors"
            >
              Delete lead
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
