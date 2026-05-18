"use client";

import { useState, useTransition } from "react";
import { updateClient } from "./editActions";

type Client = {
  id: string; name: string; company: string | null; email: string;
  subdomain_slug: string; contact_person: string | null; address: string | null;
  reg_number: string | null; vat_number: string | null; status: string;
};

export function EditClientForm({ client, onClose }: { client: Client; onClose: () => void }) {
  const [isPending, start] = useTransition();
  const [err, setErr] = useState("");

  function handle(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setErr("");
    start(async () => {
      try {
        await updateClient(client.id, fd);
        onClose();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Update failed.");
      }
    });
  }

  const inputCls = "w-full bg-arqud-black border border-arqud-ink px-4 py-3 text-arqud-bone focus:border-arqud-gold focus:outline-none text-sm";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 pt-8 pb-8 px-4">
      <div className="w-full max-w-xl bg-arqud-night border border-arqud-ink p-8 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl text-arqud-gold">Edit Client</h2>
          <button onClick={onClose} className="text-arqud-muted hover:text-arqud-bone text-xl">✕</button>
        </div>
        {err && <p className="text-red-400 text-sm">{err}</p>}

        <form onSubmit={handle} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-widest text-arqud-muted mb-1">Contact Name *</label>
              <input name="name" required defaultValue={client.name} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-arqud-muted mb-1">Company Name</label>
              <input name="company" defaultValue={client.company ?? ""} className={inputCls} />
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-widest text-arqud-muted mb-1">Email Address *</label>
            <input name="email" type="email" required defaultValue={client.email} className={inputCls} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-widest text-arqud-muted mb-1">Contact Person</label>
              <input name="contact_person" defaultValue={client.contact_person ?? ""} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-arqud-muted mb-1">Physical Address</label>
              <input name="address" defaultValue={client.address ?? ""} className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-widest text-arqud-muted mb-1">Company Reg No</label>
              <input name="reg_number" defaultValue={client.reg_number ?? ""} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-arqud-muted mb-1">VAT Number</label>
              <input name="vat_number" defaultValue={client.vat_number ?? ""} className={inputCls} />
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-widest text-arqud-muted mb-1">Status</label>
            <select name="status" defaultValue={client.status} className={inputCls}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="flex gap-4 pt-2">
            <button type="submit" disabled={isPending}
              className="flex-1 bg-arqud-gold py-3 text-sm font-semibold uppercase tracking-widest text-arqud-black hover:bg-arqud-gold-soft disabled:opacity-50">
              {isPending ? "Saving..." : "Save Changes"}
            </button>
            <button type="button" onClick={onClose}
              className="flex-1 border border-arqud-ink py-3 text-sm uppercase tracking-widest text-arqud-muted hover:text-arqud-bone">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
