import Link from "next/link";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { verifySession } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui";
import { ProposalForm } from "../ProposalForm";

export default async function NewProposalPage() {
  await verifySession("admin");

  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("clients")
    .select("id,name,company,email")
    .eq("status", "active")
    .order("name");

  return (
    <main className="min-h-screen px-4 sm:px-8 py-8 sm:py-10 animate-fade-up">
      <PageHeader title="New Proposal">
        <Link href="/admin/proposals" className="text-xs text-arqud-muted hover:text-arqud-gold uppercase tracking-widest">
          ← All proposals
        </Link>
      </PageHeader>
      <ProposalForm clients={data ?? []} />
    </main>
  );
}
