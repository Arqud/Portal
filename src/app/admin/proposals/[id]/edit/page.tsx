import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { verifySession } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui";
import { ProposalForm } from "../../ProposalForm";
import type { ProposalWithItems } from "@/lib/proposals/types";

export default async function EditProposalPage({ params }: { params: Promise<{ id: string }> }) {
  await verifySession("admin");
  const { id } = await params;

  const admin = createSupabaseAdminClient();
  const [{ data: proposal }, { data: clients }] = await Promise.all([
    admin
      .from("proposals")
      .select("*, client:clients(id,name,company,email), line_items:proposal_line_items(*)")
      .eq("id", id)
      .single(),
    admin.from("clients").select("id,name,company,email").eq("status", "active").order("name"),
  ]);

  if (!proposal) notFound();
  const p = proposal as ProposalWithItems;
  p.line_items = [...p.line_items].sort((a, b) => a.sort_order - b.sort_order);
  // Accepted/declined proposals are locked — send Morne to the read-only detail view.
  if (p.status === "accepted" || p.status === "declined") {
    redirect(`/admin/proposals/${id}`);
  }

  return (
    <main className="min-h-screen px-4 sm:px-8 py-8 sm:py-10 animate-fade-up">
      <PageHeader title={`Edit ${p.proposal_number}`}>
        <Link href={`/admin/proposals/${id}`} className="text-xs text-arqud-muted hover:text-arqud-gold uppercase tracking-widest">
          ← Back to proposal
        </Link>
      </PageHeader>
      <ProposalForm clients={clients ?? []} editProposal={p} />
    </main>
  );
}
