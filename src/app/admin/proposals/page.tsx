import Link from "next/link";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { verifySession } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui";
import { getActiveBusiness } from "@/lib/business/active";
import { businessKey } from "@/lib/business/persist";
import { ProposalsTable } from "./ProposalsTable";
import type { ProposalWithItems } from "@/lib/proposals/types";

// (In the SA Equipment workspace a scoped globals.css rule recolors this to solid amber + ink.)
const BTN_PRIMARY = "inline-flex items-center gap-2 font-semibold tracking-wide rounded-control transition-all text-xs px-[18px] py-[11px] text-arqud-bg bg-gradient-to-r from-arqud-gold to-arqud-gold-soft shadow-[0_8px_22px_rgba(200,169,110,0.28)] hover:-translate-y-px";

export default async function ProposalsPage() {
  await verifySession("admin");

  const business = await getActiveBusiness();

  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("proposals")
    .select("*, client:clients(id,name,company,email), line_items:proposal_line_items(*)")
    .order("created_at", { ascending: false });

  // Proposals are a scoped workspace surface (like Customers): each is tagged with a
  // business on write (the wall), so the list shows only the active workspace's own.
  // Untagged rows read as ARQUD, so the ARQUD list is unchanged.
  const proposals = ((data ?? []) as ProposalWithItems[]).filter(
    (p) => businessKey((p as { business?: string | null }).business) === business,
  );
  const openCount = proposals.filter((p) => p.status === "draft" || p.status === "sent").length;

  return (
    <main className="min-h-screen px-4 sm:px-8 py-8 sm:py-10 animate-fade-up">
      <PageHeader title="Proposals" count={`${openCount} open · ${proposals.length} total`}>
        <Link href="/admin/proposals/new" className={BTN_PRIMARY}>+ New Proposal</Link>
      </PageHeader>

      <ProposalsTable proposals={proposals} />
    </main>
  );
}
