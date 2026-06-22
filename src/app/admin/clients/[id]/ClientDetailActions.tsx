"use client";

import { useState } from "react";
import { EditClientForm } from "./EditClientForm";
import { Button } from "@/components/ui";

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
      <Button variant="outline" size="sm" onClick={() => setShowEdit(true)}>
        Edit Client
      </Button>
    </>
  );
}
