"use client";

import { useState } from "react";
import { EditClientForm } from "./EditClientForm";

type Client = {
  id: string; name: string; company: string | null; email: string;
  subdomain_slug: string; contact_person: string | null; address: string | null;
  reg_number: string | null; vat_number: string | null; status: string;
};

export function ClientDetailActions({ client }: { client: Client }) {
  const [showEdit, setShowEdit] = useState(false);

  return (
    <>
      {showEdit && <EditClientForm client={client} onClose={() => setShowEdit(false)} />}
      <div className="flex justify-end mb-4">
        <button onClick={() => setShowEdit(true)}
          className="border border-arqud-gold px-4 py-2 text-xs uppercase tracking-widest text-arqud-gold hover:bg-arqud-gold hover:text-arqud-black transition-colors">
          Edit Client
        </button>
      </div>
    </>
  );
}
