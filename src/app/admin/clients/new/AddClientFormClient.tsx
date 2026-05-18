"use client";

import { useTransition, useState } from "react";
import { addNewClient } from "./actions";

export function AddClientFormClient() {
  const [isPending, start] = useTransition();
  const [err, setErr] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const hasSubdomain = subdomain.trim().length > 0;

  function handle(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setErr("");
    start(async () => {
      try {
        await addNewClient(fd);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  const inputCls = "w-full bg-arqud-black border border-arqud-ink px-4 py-3 text-arqud-bone focus:border-arqud-gold focus:outline-none text-sm";

  return (
    <form onSubmit={handle} className="space-y-5">
      {err && <p className="text-red-400 text-sm">{err}</p>}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs uppercase tracking-widest text-arqud-muted mb-1">Contact Name *</label>
          <input name="name" required placeholder="Arno Gustafson" className={inputCls} />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-widest text-arqud-muted mb-1">Company Name</label>
          <input name="company" placeholder="Sparkling Auto Care Centres (Pty) Ltd" className={inputCls} />
        </div>
      </div>

      <div>
        <label className="block text-xs uppercase tracking-widest text-arqud-muted mb-1">Email Address *</label>
        <input name="email" type="email" required placeholder="arno@company.co.za" className={inputCls} />
      </div>

      <div>
        <label className="block text-xs uppercase tracking-widest text-arqud-muted mb-1">
          Portal Subdomain <span className="text-arqud-muted normal-case">(leave blank for billing-only clients)</span>
        </label>
        <div className="flex items-center gap-0">
          <input
            name="subdomain_slug"
            value={subdomain}
            placeholder="e.g. arno (optional)"
            className="flex-1 bg-arqud-black border border-arqud-ink px-4 py-3 text-arqud-bone focus:border-arqud-gold focus:outline-none text-sm"
            onChange={(e) => {
              setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
            }}
          />
          <span className="bg-arqud-ink border border-l-0 border-arqud-ink px-4 py-3 text-xs text-arqud-muted whitespace-nowrap">
            .arqudportal.co.za
          </span>
        </div>
        <p className="text-xs text-arqud-muted mt-1">
          {hasSubdomain
            ? `Portal will be at ${subdomain}.arqudportal.co.za`
            : "No portal — client is for invoicing/quoting only"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs uppercase tracking-widest text-arqud-muted mb-1">Contact Person</label>
          <input name="contact_person" placeholder="Arno Gustafson" className={inputCls} />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-widest text-arqud-muted mb-1">Physical Address</label>
          <input name="address" placeholder="Potchefstroom, North West" className={inputCls} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs uppercase tracking-widest text-arqud-muted mb-1">Company Reg No</label>
          <input name="reg_number" placeholder="2020/123456/07" className={inputCls} />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-widest text-arqud-muted mb-1">VAT Number</label>
          <input name="vat_number" placeholder="4123456789" className={inputCls} />
        </div>
      </div>

      {hasSubdomain && (
        <div className="flex items-center gap-3 border border-arqud-ink bg-arqud-night p-4">
          <input type="checkbox" name="create_portal_access" id="portal_access"
            className="w-4 h-4 accent-arqud-gold" defaultChecked />
          <label htmlFor="portal_access" className="text-sm text-arqud-bone cursor-pointer">
            Create portal login for this client
            <span className="block text-xs text-arqud-muted mt-0.5">
              Creates their login so they can access {subdomain}.arqudportal.co.za
            </span>
          </label>
        </div>
      )}

      <div className="flex gap-4 pt-2">
        <button type="submit" disabled={isPending}
          className="flex-1 bg-arqud-gold py-3 text-sm font-semibold uppercase tracking-widest text-arqud-black hover:bg-arqud-gold-soft disabled:opacity-50">
          {isPending ? "Creating..." : "Add Client"}
        </button>
        <a href="/admin/clients"
          className="flex-1 border border-arqud-ink py-3 text-sm uppercase tracking-widest text-arqud-muted hover:text-arqud-bone text-center">
          Cancel
        </a>
      </div>
    </form>
  );
}
