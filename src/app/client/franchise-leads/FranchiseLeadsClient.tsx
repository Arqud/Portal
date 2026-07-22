"use client";

import { useState, useTransition, useMemo } from "react";
import { updateLeadStatus, deleteLead } from "../leads/actions";
import { Button, Pill, Table, Tr, Td, Avatar, PageHeader } from "@/components/ui";
import { STATUS_TONE, initialsOf } from "@/lib/leads/brand";
import { formatDateTime, toE164 } from "@/lib/leads/format";
import { extractFranchiseQualifiers } from "@/lib/leads/franchiseAnswers";

export type FranchiseLead = {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  branch: string | null;
  preferred_time: string | null;
  meta_campaign_name: string | null;
  meta_ad_name: string | null;
  meta_form_id: string | null;
  form_answers: Record<string, string> | null;
  status: "new" | "contacted" | "converted" | "lost";
  notes: string | null;
  follow_up_date: string | null;
  created_at: string;
};

const STATUS_OPTIONS = ["new", "contacted", "converted", "lost"] as const;
const ARCHIVE_STATUSES: ReadonlyArray<FranchiseLead["status"]> = ["converted", "lost"];
const isArchived = (l: FranchiseLead) => ARCHIVE_STATUSES.includes(l.status);

type DateFilter = "today" | "week" | "month" | "all";
type ViewMode = "active" | "archive";

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-ZA", { day: "2-digit", month: "short" });
}
function monthKey(d: string) {
  const date = new Date(d);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
function monthLabel(d: string) {
  return new Date(d).toLocaleDateString("en-ZA", { month: "long", year: "numeric" });
}

function exportCsv(leads: FranchiseLead[]) {
  const header = ["Date", "Name", "Phone", "Email", "Area", "Capital", "Timeline", "Funds", "Status", "Notes", "Follow-up"];
  const rows = leads.map((l) => {
    const q = extractFranchiseQualifiers(l.form_answers);
    return [
      formatDate(l.created_at),
      l.full_name ?? "",
      l.phone ?? "",
      l.email ?? "",
      q.area ?? "",
      q.capital ?? "",
      q.timeline ?? "",
      q.funds ?? "",
      l.status,
      (l.notes ?? "").replace(/,/g, ";"),
      l.follow_up_date ?? "",
    ];
  });
  const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `franchise-leads-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function FranchiseLeadsClient({ leads: initial, total }: { leads: FranchiseLead[]; total?: number }) {
  const [leads, setLeads] = useState(initial);
  const [selected, setSelected] = useState<FranchiseLead | null>(null);
  const [view, setView] = useState<ViewMode>("active");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [search, setSearch] = useState("");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const activeCount = useMemo(() => leads.filter((l) => !isArchived(l)).length, [leads]);
  const archiveCount = useMemo(() => leads.filter((l) => isArchived(l)).length, [leads]);

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      if (view === "active" && isArchived(l)) return false;
      if (view === "archive" && !isArchived(l)) return false;
      if (statusFilter !== "all" && l.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const answers = l.form_answers ? Object.values(l.form_answers).join(" ") : "";
        const match = [l.full_name, l.phone, l.email, answers].some((v) => v?.toLowerCase().includes(q));
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
  }, [leads, view, statusFilter, dateFilter, search, today]);

  const monthGroups = useMemo(() => {
    if (view !== "archive") return [];
    const map = new Map<string, { label: string; leads: FranchiseLead[] }>();
    filtered.forEach((l) => {
      const key = monthKey(l.created_at);
      const group = map.get(key) ?? { label: monthLabel(l.created_at), leads: [] };
      group.leads.push(l);
      map.set(key, group);
    });
    return Array.from(map.entries())
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([key, group]) => ({ key, ...group }));
  }, [filtered, view]);

  function handleUpdated(updated: FranchiseLead) {
    setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
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
      <PageHeader title="Sparkling Franchise Leads" count={`${total ?? leads.length} total`}>
        <Button variant="outline" size="sm" onClick={() => exportCsv(filtered)}>
          ⤓ Export CSV
        </Button>
      </PageHeader>

      <p className="-mt-2 mb-5 text-[11px] text-arqud-muted max-w-xl">
        Franchise investor enquiries from the Sparkling Franchise campaign — kept separate from the wash CRM.
        Each row shows the qualifier answers (capital, timeline, funds and area) at a glance.
      </p>

      {/* Active / Archive segment */}
      <div className="flex flex-wrap items-center gap-1.5 mb-5">
        {([["active", "Active", activeCount], ["archive", "Archive", archiveCount]] as const).map(([val, label, count]) => (
          <button
            key={val}
            onClick={() => { setView(val); setStatusFilter("all"); }}
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
      </div>

      {/* Search + status + date filters */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <input
          type="text"
          placeholder="Search name, phone, answers…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-arqud-panel border border-arqud-line-2 rounded-control px-3.5 py-2 text-xs text-arqud-bone placeholder:text-arqud-muted focus:outline-none focus:ring-1 focus:ring-arqud-gold/40 w-full sm:w-56"
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

      <p className="text-xs text-arqud-muted mb-3">{filtered.length} lead{filtered.length !== 1 ? "s" : ""}</p>

      {filtered.length === 0 ? (
        <div className="py-10 text-center text-arqud-muted text-xs uppercase tracking-widest">
          {view === "archive" ? "No archived leads yet" : "No leads match your filters"}
        </div>
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="sm:hidden space-y-2.5">
            {view === "archive"
              ? monthGroups.map((group) => (
                  <div key={group.key} className="space-y-2.5">
                    <div className="flex items-center gap-3 pt-3 pb-0.5">
                      <span className="text-[10px] uppercase tracking-[0.18em] text-arqud-gold-dim">{group.label}</span>
                      <span className="text-[10px] text-arqud-muted">{group.leads.length}</span>
                      <span className="flex-1 h-px bg-arqud-line/60" />
                    </div>
                    {group.leads.map((lead) => (
                      <FranchiseCard key={lead.id} lead={lead} onSelect={() => setSelected(lead)} />
                    ))}
                  </div>
                ))
              : filtered.map((lead) => (
                  <FranchiseCard key={lead.id} lead={lead} onSelect={() => setSelected(lead)} />
                ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden sm:block">
            <Table>
              <Tr header>
                <Td className="basis-[110px] grow-0 shrink-0">Date</Td>
                <Td className="basis-[1.2fr] grow">Name</Td>
                <Td className="basis-[1.1fr] grow">Area</Td>
                <Td className="basis-[1.1fr] grow">Capital</Td>
                <Td className="basis-[0.8fr] grow">Status</Td>
                <Td className="basis-[0.9fr] grow text-right">Action</Td>
              </Tr>
              {view === "archive"
                ? monthGroups.map((group) => (
                    <div key={group.key}>
                      <div className="flex items-center gap-3 pt-4 pb-1.5">
                        <span className="text-[10px] uppercase tracking-[0.18em] text-arqud-gold-dim">{group.label}</span>
                        <span className="text-[10px] text-arqud-muted">{group.leads.length}</span>
                        <span className="flex-1 h-px bg-arqud-line/60" />
                      </div>
                      {group.leads.map((lead) => (
                        <FranchiseRow key={lead.id} lead={lead} onSelect={() => setSelected(lead)} />
                      ))}
                    </div>
                  ))
                : filtered.map((lead) => (
                    <FranchiseRow key={lead.id} lead={lead} onSelect={() => setSelected(lead)} />
                  ))}
            </Table>
          </div>
        </>
      )}

      {selected && (
        <FranchiseModal lead={selected} onClose={() => setSelected(null)} onUpdated={handleUpdated} onDeleted={handleDeleted} />
      )}
    </>
  );
}

function FranchiseRow({ lead, onSelect }: { lead: FranchiseLead; onSelect: () => void }) {
  const e164 = lead.phone ? toE164(lead.phone) : null;
  const isOverdue = lead.follow_up_date && new Date(lead.follow_up_date) < new Date(new Date().toDateString());
  const q = extractFranchiseQualifiers(lead.form_answers);
  return (
    <Tr className="cursor-pointer" onClick={onSelect}>
      <Td className="basis-[110px] grow-0 shrink-0 text-arqud-muted">{formatDateTime(lead.created_at)}</Td>
      <Td className="basis-[1.2fr] grow">
        <div className="flex items-center gap-2.5 text-arqud-bone">
          <Avatar initials={initialsOf(lead.full_name)} />
          <span className="truncate">{lead.full_name ?? "Unnamed lead"}</span>
        </div>
      </Td>
      <Td className="basis-[1.1fr] grow text-arqud-muted truncate">{q.area ?? "—"}</Td>
      <Td className="basis-[1.1fr] grow">
        {q.capital ? <Pill tone="spark">{q.capital}</Pill> : <span className="text-arqud-muted">—</span>}
      </Td>
      <Td className="basis-[0.8fr] grow flex items-center gap-2">
        <Pill tone={STATUS_TONE[lead.status] ?? "neutral"}>{lead.status}</Pill>
        {lead.follow_up_date && (
          <span className={`text-[10px] ${isOverdue ? "text-red-400" : "text-arqud-muted"}`} title="Follow-up date">
            {isOverdue && "⚠ "}
            {new Date(lead.follow_up_date).toLocaleDateString("en-ZA", { day: "2-digit", month: "short" })}
          </span>
        )}
      </Td>
      <Td className="basis-[0.9fr] grow text-right" onClick={(e) => e.stopPropagation()}>
        {e164 ? (
          <a href={`https://wa.me/${e164}`} target="_blank" rel="noopener noreferrer"
            className="text-arqud-green text-[12px] font-medium hover:underline">
            WhatsApp →
          </a>
        ) : (
          <span className="text-arqud-muted text-[12px]">—</span>
        )}
      </Td>
    </Tr>
  );
}

function FranchiseCard({ lead, onSelect }: { lead: FranchiseLead; onSelect: () => void }) {
  const e164 = lead.phone ? toE164(lead.phone) : null;
  const isOverdue = lead.follow_up_date && new Date(lead.follow_up_date) < new Date(new Date().toDateString());
  const q = extractFranchiseQualifiers(lead.form_answers);
  return (
    <div onClick={onSelect} className="panel-gradient border border-arqud-line rounded-card p-3.5 cursor-pointer space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <Avatar initials={initialsOf(lead.full_name)} />
          <span className="text-arqud-bone text-[14px] truncate">{lead.full_name ?? "Unnamed lead"}</span>
        </div>
        <Pill tone={STATUS_TONE[lead.status] ?? "neutral"}>{lead.status}</Pill>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
        <QualifierLine label="Capital" value={q.capital} highlight />
        <QualifierLine label="Area" value={q.area} />
        <QualifierLine label="Timeline" value={q.timeline} />
        <QualifierLine label="Funds" value={q.funds} />
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-arqud-muted text-[11px] shrink-0">{formatDateTime(lead.created_at)}</span>
        {lead.follow_up_date && (
          <span className={`text-[11px] ${isOverdue ? "text-red-400" : "text-arqud-muted"}`}>
            {isOverdue && "⚠ "}Follow-up {new Date(lead.follow_up_date).toLocaleDateString("en-ZA", { day: "2-digit", month: "short" })}
          </span>
        )}
      </div>
      {e164 && (
        <a href={`https://wa.me/${e164}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
          className="block text-center text-arqud-green text-[13px] font-medium border border-green-700/40 rounded-control py-2 hover:bg-green-900/20 transition-colors">
          WhatsApp →
        </a>
      )}
    </div>
  );
}

function QualifierLine({ label, value, highlight }: { label: string; value: string | null; highlight?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-[9px] uppercase tracking-[0.14em] text-arqud-muted">{label}</p>
      <p className={`truncate ${value ? (highlight ? "text-arqud-gold-soft font-semibold" : "text-arqud-bone") : "text-arqud-muted"}`}>
        {value ?? "—"}
      </p>
    </div>
  );
}

function FranchiseModal({
  lead, onClose, onUpdated, onDeleted,
}: {
  lead: FranchiseLead;
  onClose: () => void;
  onUpdated: (l: FranchiseLead) => void;
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
  const q = extractFranchiseQualifiers(lead.form_answers);
  const qualifiers = [
    { label: "Capital", value: q.capital },
    { label: "Timeline", value: q.timeline },
    { label: "Funds available", value: q.funds },
    { label: "Area", value: q.area },
    ...q.other,
  ].filter((x) => x.value);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8 overflow-y-auto">
      <div className="w-full max-w-md panel-gradient border border-arqud-line rounded-card p-8 space-y-5 my-auto">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl text-arqud-gold">{lead.full_name ?? "Franchise lead"}</h2>
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
          {lead.meta_campaign_name && <p className="text-arqud-muted text-xs">Campaign: {lead.meta_campaign_name}</p>}
          <p className="text-arqud-muted text-xs">{formatDateTime(lead.created_at)}</p>
        </div>

        {/* Qualifier answers — the point of this page */}
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-widest text-arqud-muted mb-1.5">Qualifier answers</p>
          {qualifiers.length === 0 ? (
            <p className="text-arqud-muted text-xs">No qualifier answers captured for this lead.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 border border-arqud-line rounded-control p-4">
              {qualifiers.map((x) => (
                <div key={x.label} className="min-w-0">
                  <p className="text-[9px] uppercase tracking-[0.14em] text-arqud-muted">{x.label}</p>
                  <p className="text-arqud-bone text-[13px] break-words">{x.value}</p>
                </div>
              ))}
            </div>
          )}
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
          <input type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} className={inputCls} />
        </div>

        <div>
          <label className="block text-xs uppercase tracking-widest text-arqud-muted mb-1.5">Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
            placeholder="Called, sending franchise pack, follow up Thursday…" className={`${inputCls} resize-none`} />
        </div>

        <div className="flex gap-3">
          <button onClick={save} disabled={isPending || isDeleting}
            className="flex-1 bg-arqud-gold py-3 text-sm font-semibold uppercase tracking-widest text-arqud-bg hover:opacity-90 disabled:opacity-50 rounded-control">
            {isPending ? "Saving…" : "Save"}
          </button>
          <button onClick={onClose}
            className="flex-1 border border-arqud-line-2 py-3 text-sm uppercase tracking-widest text-arqud-muted hover:text-arqud-bone rounded-control">
            Cancel
          </button>
        </div>

        <div className="pt-2 border-t border-arqud-line/60">
          {confirmDelete ? (
            <div className="space-y-2.5">
              <p className="text-xs text-red-400">Delete permanently? This can&apos;t be undone.</p>
              <div className="flex gap-3">
                <button onClick={remove} disabled={isDeleting}
                  className="flex-1 border border-red-400/40 bg-red-400/10 py-2.5 text-xs font-semibold uppercase tracking-widest text-red-400 hover:bg-red-400/20 disabled:opacity-50 rounded-control">
                  {isDeleting ? "Deleting…" : "Yes, delete"}
                </button>
                <button onClick={() => setConfirmDelete(false)} disabled={isDeleting}
                  className="flex-1 border border-arqud-line-2 py-2.5 text-xs uppercase tracking-widest text-arqud-muted hover:text-arqud-bone disabled:opacity-50 rounded-control">
                  Keep
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setConfirmDelete(true)}
              className="text-[11px] uppercase tracking-widest text-arqud-muted hover:text-red-400 transition-colors">
              Delete lead
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
