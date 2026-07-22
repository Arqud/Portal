import { verifySession } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { partitionFranchise } from "@/lib/leads/franchise";
import { extractFranchiseQualifiers } from "@/lib/leads/franchiseAnswers";
import { STATUS_TONE, initialsOf } from "@/lib/leads/brand";
import { toE164, formatDateTime } from "@/lib/leads/format";
import { PageHeader, Card, Table, Tr, Td, Pill, Avatar } from "@/components/ui";

// READ-ONLY admin view of the Sparkling Franchise leads. Morne (admin) cannot use the
// client-role server actions (updateLeadStatus/deleteLead are client_id-ownership
// gated), so status/notes management stays with Arno + Marissa on the client portal.
// This page surfaces the qualifier answers + working WhatsApp/Call links (plain hrefs,
// no server action needed) so the pipeline is visible from the command center.
export default async function AdminFranchiseLeadsPage() {
  await verifySession("admin");
  const admin = createSupabaseAdminClient();

  const { data: leads } = await admin
    .from("leads")
    .select(
      "id,full_name,phone,email,branch,meta_campaign_name,meta_ad_name,meta_form_id,form_answers,status,notes,created_at",
    )
    .order("created_at", { ascending: false });

  const franchise = partitionFranchise(leads ?? []).franchise;

  return (
    <main className="min-h-screen px-4 sm:px-8 py-8 sm:py-10 space-y-5 animate-fade-up">
      <PageHeader title="Sparkling Franchise Leads" count={`${franchise.length} total`} />
      <p className="-mt-2 text-[11px] text-arqud-muted max-w-xl">
        Read-only. Investor enquiries from the Sparkling Franchise campaign, separate from the wash CRM.
        Status &amp; notes are managed by the client (Arno / Marissa) on their portal.
      </p>

      {franchise.length === 0 ? (
        <Card>
          <p className="text-arqud-muted text-sm py-6 text-center">
            No franchise leads yet — will populate once the Sparkling Franchise ad goes live.
          </p>
        </Card>
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="sm:hidden space-y-2.5">
            {franchise.map((lead) => {
              const q = extractFranchiseQualifiers(lead.form_answers as Record<string, string> | null);
              const e164 = lead.phone ? toE164(lead.phone) : null;
              return (
                <div key={lead.id} className="panel-gradient border border-arqud-line rounded-card p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar initials={initialsOf(lead.full_name)} />
                      <span className="text-arqud-bone text-[14px] truncate">{lead.full_name ?? "Unnamed lead"}</span>
                    </div>
                    <Pill tone={STATUS_TONE[lead.status] ?? "neutral"}>{lead.status}</Pill>
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
                    <Field label="Capital" value={q.capital} highlight />
                    <Field label="Area" value={q.area} />
                    <Field label="Timeline" value={q.timeline} />
                    <Field label="Funds" value={q.funds} />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-arqud-muted text-[11px]">{formatDateTime(lead.created_at)}</span>
                    <div className="flex gap-2">
                      {e164 && (
                        <a href={`https://wa.me/${e164}`} target="_blank" rel="noopener noreferrer"
                          className="px-3 py-1 text-[11px] border border-green-700/60 text-arqud-green rounded-control uppercase tracking-widest">
                          WhatsApp
                        </a>
                      )}
                      {lead.phone && (
                        <a href={`tel:${lead.phone}`}
                          className="px-3 py-1 text-[11px] border border-arqud-line-2 text-arqud-muted rounded-control uppercase tracking-widest">
                          Call
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop: table */}
          <div className="hidden sm:block">
            <Table>
              <Tr header>
                <Td className="basis-[110px] grow-0 shrink-0">Date</Td>
                <Td className="basis-[1.2fr] grow">Name</Td>
                <Td className="basis-[1fr] grow">Area</Td>
                <Td className="basis-[1fr] grow">Capital</Td>
                <Td className="basis-[1fr] grow">Timeline</Td>
                <Td className="basis-[0.8fr] grow">Status</Td>
                <Td className="basis-[1fr] grow text-right">Contact</Td>
              </Tr>
              {franchise.map((lead) => {
                const q = extractFranchiseQualifiers(lead.form_answers as Record<string, string> | null);
                const e164 = lead.phone ? toE164(lead.phone) : null;
                return (
                  <Tr key={lead.id}>
                    <Td className="basis-[110px] grow-0 shrink-0 text-arqud-muted">{formatDateTime(lead.created_at)}</Td>
                    <Td className="basis-[1.2fr] grow">
                      <div className="flex items-center gap-2.5 text-arqud-bone">
                        <Avatar initials={initialsOf(lead.full_name)} />
                        <div className="min-w-0">
                          <p className="truncate">{lead.full_name ?? "Unnamed lead"}</p>
                          {lead.phone && (
                            <a href={`tel:${lead.phone}`} className="text-[11px] text-arqud-muted hover:text-arqud-gold truncate block">
                              {lead.phone}
                            </a>
                          )}
                        </div>
                      </div>
                    </Td>
                    <Td className="basis-[1fr] grow text-arqud-muted truncate">{q.area ?? "—"}</Td>
                    <Td className="basis-[1fr] grow">
                      {q.capital ? <Pill tone="spark">{q.capital}</Pill> : <span className="text-arqud-muted">—</span>}
                    </Td>
                    <Td className="basis-[1fr] grow text-arqud-muted truncate">{q.timeline ?? "—"}</Td>
                    <Td className="basis-[0.8fr] grow">
                      <Pill tone={STATUS_TONE[lead.status] ?? "neutral"}>{lead.status}</Pill>
                    </Td>
                    <Td className="basis-[1fr] grow text-right">
                      {e164 ? (
                        <a href={`https://wa.me/${e164}`} target="_blank" rel="noopener noreferrer"
                          className="text-arqud-green text-[12px] font-medium hover:underline">
                          WhatsApp →
                        </a>
                      ) : (
                        <span className="text-arqud-muted text-[12px]">—</span>
                      )}
                    </Td>
                  </Tr>
                );
              })}
            </Table>
          </div>
        </>
      )}
    </main>
  );
}

function Field({ label, value, highlight }: { label: string; value: string | null; highlight?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-[9px] uppercase tracking-[0.14em] text-arqud-muted">{label}</p>
      <p className={`truncate ${value ? (highlight ? "text-arqud-gold-soft font-semibold" : "text-arqud-bone") : "text-arqud-muted"}`}>
        {value ?? "—"}
      </p>
    </div>
  );
}
