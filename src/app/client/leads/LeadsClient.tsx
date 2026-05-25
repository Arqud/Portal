"use client";

import { useState, useTransition } from "react";
import { updateLeadStatus } from "./actions";

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

const STATUS_OPTIONS = ["new", "contacted", "converted", "lost"] as const;

export function LeadsClient({ leads }: { leads: Lead[] }) {
  const [selected, setSelected] = useState<Lead | null>(null);

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-arqud-ink">
              {["Date", "Name", "Phone", "Branch", "Campaign", "Status", ""].map((h) => (
                <th key={h} className="text-left text-xs uppercase tracking-widest text-arqud-muted pb-3 pr-4 last:pr-0">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id} className="border-b border-arqud-ink/50 hover:bg-arqud-night/50">
                <td className="py-3 pr-4 text-arqud-muted text-xs">
                  {new Date(lead.created_at).toLocaleDateString("en-ZA")}
                </td>
                <td className="py-3 pr-4 text-arqud-bone font-medium">
                  {lead.full_name ?? "—"}
                </td>
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
                <td className="py-3 text-right">
                  <button
                    onClick={() => setSelected(lead)}
                    className="text-xs uppercase tracking-widest text-arqud-muted hover:text-arqud-gold"
                  >
                    Update
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <LeadModal lead={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}

function LeadModal({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const [status, setStatus] = useState(lead.status);
  const [notes, setNotes] = useState(lead.notes ?? "");
  const [isPending, start] = useTransition();
  const [err, setErr] = useState("");

  function save() {
    setErr("");
    start(async () => {
      try {
        await updateLeadStatus(lead.id, status, notes);
        onClose();
      } catch {
        setErr("Could not save. Please try again.");
      }
    });
  }

  const inputCls = "w-full bg-arqud-black border border-arqud-ink px-4 py-3 text-arqud-bone focus:border-arqud-gold focus:outline-none text-sm";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-md bg-arqud-night border border-arqud-ink p-8 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl text-arqud-gold">{lead.full_name ?? "Lead"}</h2>
          <button onClick={onClose} className="text-arqud-muted hover:text-arqud-bone text-xl">✕</button>
        </div>

        {/* Lead info */}
        <div className="space-y-1 text-sm">
          {lead.phone && <p className="text-arqud-bone">{lead.phone}</p>}
          {lead.email && <p className="text-arqud-muted">{lead.email}</p>}
          {lead.branch && <p className="text-arqud-muted">Branch: {lead.branch}</p>}
          {lead.meta_campaign_name && <p className="text-arqud-muted text-xs">Campaign: {lead.meta_campaign_name}</p>}
          <p className="text-arqud-muted text-xs">
            {new Date(lead.created_at).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>

        {err && <p className="text-red-400 text-sm">{err}</p>}

        <div>
          <label className="block text-xs uppercase tracking-widest text-arqud-muted mb-1">Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className={inputCls}>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs uppercase tracking-widest text-arqud-muted mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Left voicemail, follow up Thursday..."
            className={`${inputCls} resize-none`}
          />
        </div>

        <div className="flex gap-4">
          <button
            onClick={save}
            disabled={isPending}
            className="flex-1 bg-arqud-gold py-3 text-sm font-semibold uppercase tracking-widest text-arqud-black hover:bg-arqud-gold-soft disabled:opacity-50"
          >
            {isPending ? "Saving..." : "Save"}
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
