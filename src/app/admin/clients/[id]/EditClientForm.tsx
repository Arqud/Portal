"use client";

import { useState, useTransition } from "react";
import { updateClient } from "./editActions";
import { Button, Input, Select } from "@/components/ui";

type Client = {
  id: string; name: string; company: string | null; email: string;
  subdomain_slug: string; contact_person: string | null; phone: string | null; address: string | null;
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

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 pt-8 pb-8 px-4">
      <div className="w-full max-w-xl panel-gradient border border-arqud-line rounded-card p-8 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl text-arqud-gold">Edit Client</h2>
          <button onClick={onClose} className="text-arqud-muted hover:text-arqud-bone text-xl leading-none">✕</button>
        </div>
        {err && <p className="text-red-400 text-sm">{err}</p>}

        <form onSubmit={handle} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-widest text-arqud-muted mb-1.5">Contact Name *</label>
              <Input name="name" required defaultValue={client.name} />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-arqud-muted mb-1.5">Company Name</label>
              <Input name="company" defaultValue={client.company ?? ""} />
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-widest text-arqud-muted mb-1.5">Email Address *</label>
            <Input name="email" type="email" required defaultValue={client.email} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-widest text-arqud-muted mb-1.5">Contact Person</label>
              <Input name="contact_person" defaultValue={client.contact_person ?? ""} />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-arqud-muted mb-1.5">Phone</label>
              <Input name="phone" type="tel" defaultValue={client.phone ?? ""} />
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-widest text-arqud-muted mb-1.5">Physical Address</label>
            <Input name="address" defaultValue={client.address ?? ""} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-widest text-arqud-muted mb-1.5">Company Reg No</label>
              <Input name="reg_number" defaultValue={client.reg_number ?? ""} />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-arqud-muted mb-1.5">VAT Number</label>
              <Input name="vat_number" defaultValue={client.vat_number ?? ""} />
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-widest text-arqud-muted mb-1.5">Status</label>
            <Select name="status" defaultValue={client.status}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={isPending} className="flex-1 justify-center">
              {isPending ? "Saving…" : "Save Changes"}
            </Button>
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 justify-center">
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
