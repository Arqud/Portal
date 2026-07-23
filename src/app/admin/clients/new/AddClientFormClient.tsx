"use client";

import Link from "next/link";
import { useTransition, useState } from "react";
import { addNewClient } from "./actions";
import { Button, Input } from "@/components/ui";
import type { BusinessKey } from "@/lib/business/persist";

export function AddClientFormClient({ defaultBusiness = "arqud" }: { defaultBusiness?: BusinessKey }) {
  const isSae = defaultBusiness === "sa_equipment";
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

  return (
    <form onSubmit={handle} className="space-y-5">
      {err && <p className="text-red-400 text-sm">{err}</p>}

      <div>
        <label className="block text-xs uppercase tracking-widest text-arqud-muted mb-1.5">Business</label>
        <select name="business" defaultValue={defaultBusiness}
          className="w-full bg-arqud-panel border border-arqud-line-2 rounded-control px-3.5 py-2.5 text-arqud-bone text-sm focus:outline-none focus:ring-1 focus:ring-arqud-gold/40 transition">
          <option value="arqud">ARQUD — marketing</option>
          <option value="sa_equipment">SA Equipment — machinery</option>
        </select>
        <p className="text-xs text-arqud-muted mt-1.5">
          Which business is this customer for? It decides which branding their invoices and quotes carry.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs uppercase tracking-widest text-arqud-muted mb-1.5">Contact Name *</label>
          <Input name="name" required placeholder="Arno Gustafson" />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-widest text-arqud-muted mb-1.5">Company Name</label>
          <Input name="company" placeholder="Sparkling Auto Care Centres (Pty) Ltd" />
        </div>
      </div>

      <div>
        <label className="block text-xs uppercase tracking-widest text-arqud-muted mb-1.5">Email Address *</label>
        <Input name="email" type="email" required placeholder="arno@company.co.za" />
      </div>

      <div>
        <label className="block text-xs uppercase tracking-widest text-arqud-muted mb-1.5">
          Portal Subdomain <span className="text-arqud-muted normal-case">(leave blank for billing-only clients)</span>
        </label>
        <div className="flex items-center gap-0">
          <input
            name="subdomain_slug"
            value={subdomain}
            placeholder="e.g. arno (optional)"
            className="flex-1 bg-arqud-panel border border-arqud-line-2 rounded-control rounded-r-none px-3.5 py-2.5 text-arqud-bone text-sm placeholder:text-arqud-muted focus:outline-none focus:ring-1 focus:ring-arqud-gold/40 transition"
            onChange={(e) => {
              setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
            }}
          />
          <span className="bg-arqud-line/40 border border-l-0 border-arqud-line-2 rounded-control rounded-l-none px-3.5 py-2.5 text-xs text-arqud-muted whitespace-nowrap">
            .arqudportal.co.za
          </span>
        </div>
        <p className="text-xs text-arqud-muted mt-1.5">
          {hasSubdomain
            ? `Portal will be at ${subdomain}.arqudportal.co.za`
            : "No portal — client is for invoicing/quoting only"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs uppercase tracking-widest text-arqud-muted mb-1.5">Contact Person</label>
          <Input name="contact_person" placeholder="Arno Gustafson" />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-widest text-arqud-muted mb-1.5">Physical Address</label>
          <Input name="address" placeholder="Potchefstroom, North West" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs uppercase tracking-widest text-arqud-muted mb-1.5">Company Reg No</label>
          <Input name="reg_number" placeholder="2020/123456/07" />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-widest text-arqud-muted mb-1.5">VAT Number</label>
          <Input name="vat_number" placeholder="4123456789" />
        </div>
      </div>

      {hasSubdomain && (
        <div className="flex items-center gap-3 border border-arqud-line rounded-control panel-gradient p-4">
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

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={isPending} className="flex-1 justify-center">
          {isPending ? "Creating…" : isSae ? "Add Customer" : "Add Client"}
        </Button>
        <Link href="/admin/clients"
          className="flex-1 inline-flex items-center justify-center font-semibold tracking-wide rounded-control transition-all text-xs px-[18px] py-[11px] text-arqud-gold-soft border border-arqud-gold/40 hover:border-arqud-gold/70 hover:bg-arqud-gold/5">
          Cancel
        </Link>
      </div>
    </form>
  );
}
