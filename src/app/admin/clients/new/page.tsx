import Link from "next/link";
import { verifySession } from "@/lib/auth/session";
import { AddClientFormClient } from "./AddClientFormClient";

export default async function NewClientPage() {
  await verifySession("admin");
  return (
    <main className="min-h-screen px-8 py-12">
      <div className="mb-6">
        <Link href="/admin/clients" className="text-xs uppercase tracking-widest text-arqud-muted hover:text-arqud-gold">
          ← Clients
        </Link>
      </div>
      <h1 className="text-5xl tracking-wide mb-8">Add Client</h1>
      <div className="max-w-xl">
        <AddClientFormClient />
      </div>
    </main>
  );
}
