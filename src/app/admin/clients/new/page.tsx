import Link from "next/link";
import { verifySession } from "@/lib/auth/session";
import { AddClientFormClient } from "./AddClientFormClient";
import { PageHeader, Card } from "@/components/ui";

export default async function NewClientPage() {
  await verifySession("admin");
  return (
    <main className="min-h-screen px-8 py-10 animate-fade-up">
      <div className="mb-5">
        <Link href="/admin/clients" className="text-xs uppercase tracking-widest text-arqud-muted hover:text-arqud-gold transition-colors">
          ← Clients
        </Link>
      </div>
      <PageHeader title="Add Client" />
      <div className="max-w-xl">
        <Card>
          <AddClientFormClient />
        </Card>
      </div>
    </main>
  );
}
