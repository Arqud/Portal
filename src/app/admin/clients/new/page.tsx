import Link from "next/link";
import { verifySession } from "@/lib/auth/session";
import { AddClientFormClient } from "./AddClientFormClient";
import { PageHeader, Card } from "@/components/ui";
import { businessKey } from "@/lib/business/persist";

export default async function NewClientPage({
  searchParams,
}: {
  searchParams: Promise<{ business?: string }>;
}) {
  await verifySession("admin");
  const { business } = await searchParams;
  const defaultBusiness = businessKey(business);
  const isSae = defaultBusiness === "sa_equipment";

  return (
    <main className="min-h-screen px-4 sm:px-8 py-8 sm:py-10 animate-fade-up">
      <div className="mb-5">
        <Link href="/admin/clients" className="text-xs uppercase tracking-widest text-arqud-muted hover:text-arqud-gold transition-colors">
          ← {isSae ? "Customers" : "Clients"}
        </Link>
      </div>
      <PageHeader title={isSae ? "Add Customer" : "Add Client"} />
      <div className="max-w-xl">
        <Card>
          <AddClientFormClient defaultBusiness={defaultBusiness} />
        </Card>
      </div>
    </main>
  );
}
