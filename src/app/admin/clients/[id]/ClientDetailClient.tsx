"use client";

import { useState, useTransition } from "react";
import { UploadReportForm } from "../UploadReportForm";
import { UploadDocumentForm } from "../UploadDocumentForm";
import { deleteReport, deleteDocument } from "../actions";
import { LeadsTab } from "./LeadsTab";
import { Button, Card, Tabs, Table, Tr, Td, Pill } from "@/components/ui";

type Invoice = { id: string; invoice_number: string; amount: number; status: string; issue_date: string; due_date: string };
type Quote = { id: string; quote_number: string; total: number; status: string; issue_date: string };
type Lead = {
  id: string; full_name: string | null; phone: string | null; email: string | null;
  branch: string | null; meta_campaign_name: string | null; meta_ad_name: string | null;
  status: "new" | "contacted" | "converted" | "lost"; notes: string | null; created_at: string;
};
type Report = { id: string; title: string; period: string; created_at: string; pdf_url: string };
type Document = { id: string; name: string; category: string; uploaded_at: string; storage_path: string };

const CATEGORY_LABELS: Record<string, string> = {
  brand_assets: "Brand Assets", contracts: "Contracts",
  reports: "Reports", ad_creatives: "Ad Creatives", other: "Other",
};

const STATUS_TONE: Record<string, string> = {
  draft: "neutral",
  pending: "contacted",
  paid: "converted",
  overdue: "danger",
  sent: "contacted",
  accepted: "converted",
  rejected: "danger",
};

function fmt(n: number) {
  return `R ${n.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`;
}

const TAB_LABELS = ["Invoices", "Quotes", "Leads", "Reports", "Documents"];

export function ClientDetailClient({
  clientId, invoices, quotes, leads, reports, documents, reportUrls, documentUrls,
}: {
  clientId: string;
  invoices: Invoice[];
  quotes: Quote[];
  leads: Lead[];
  reports: Report[];
  documents: Document[];
  reportUrls: Record<string, string>;
  documentUrls: Record<string, string>;
}) {
  const [tab, setTab] = useState("Invoices");
  const [showReport, setShowReport] = useState(false);
  const [showDoc, setShowDoc] = useState(false);
  const [pending, start] = useTransition();

  return (
    <div className="space-y-5">
      {showReport && <UploadReportForm clientId={clientId} onClose={() => setShowReport(false)} />}
      {showDoc && <UploadDocumentForm clientId={clientId} onClose={() => setShowDoc(false)} />}

      <div className="flex items-center justify-between">
        <Tabs tabs={TAB_LABELS} value={tab} onChange={setTab} />
        {tab === "Reports" && (
          <Button variant="outline" size="sm" onClick={() => setShowReport(true)}>+ Upload Report</Button>
        )}
        {tab === "Documents" && (
          <Button variant="outline" size="sm" onClick={() => setShowDoc(true)}>+ Share Document</Button>
        )}
        {(tab === "Invoices" || tab === "Quotes") && (
          <a href="/admin/finances" className="text-xs uppercase tracking-widest text-arqud-muted hover:text-arqud-gold transition-colors">
            + New {tab === "Invoices" ? "Invoice" : "Quote"} →
          </a>
        )}
      </div>

      {/* Invoices */}
      {tab === "Invoices" && (
        invoices.length === 0 ? (
          <Card><p className="text-arqud-muted text-sm py-6 text-center">No invoices yet.</p></Card>
        ) : (
          <Table>
            <Tr header>
              <Td className="basis-[1fr] grow">Invoice #</Td>
              <Td className="basis-[0.9fr] grow">Issue Date</Td>
              <Td className="basis-[0.9fr] grow">Due Date</Td>
              <Td className="basis-[0.9fr] grow">Amount</Td>
              <Td className="basis-[0.8fr] grow">Status</Td>
              <Td className="basis-[0.6fr] grow-0 shrink-0 text-right">PDF</Td>
            </Tr>
            {invoices.map((inv) => (
              <Tr key={inv.id}>
                <Td className="basis-[1fr] grow font-display italic text-arqud-gold">{inv.invoice_number}</Td>
                <Td className="basis-[0.9fr] grow text-arqud-muted">{inv.issue_date}</Td>
                <Td className="basis-[0.9fr] grow text-arqud-muted">{inv.due_date}</Td>
                <Td className="basis-[0.9fr] grow text-arqud-bone">{fmt(inv.amount)}</Td>
                <Td className="basis-[0.8fr] grow">
                  <Pill tone={STATUS_TONE[inv.status] ?? "neutral"}>{inv.status}</Pill>
                </Td>
                <Td className="basis-[0.6fr] grow-0 shrink-0 text-right">
                  <a href={`/api/invoices/${inv.id}/pdf`} target="_blank" rel="noopener noreferrer"
                    className="text-arqud-gold text-[12px] font-medium hover:underline">PDF →</a>
                </Td>
              </Tr>
            ))}
          </Table>
        )
      )}

      {/* Quotes */}
      {tab === "Quotes" && (
        quotes.length === 0 ? (
          <Card><p className="text-arqud-muted text-sm py-6 text-center">No quotes yet.</p></Card>
        ) : (
          <Table>
            <Tr header>
              <Td className="basis-[1fr] grow">Quote #</Td>
              <Td className="basis-[1fr] grow">Date</Td>
              <Td className="basis-[1fr] grow">Total (excl. VAT)</Td>
              <Td className="basis-[0.8fr] grow">Status</Td>
              <Td className="basis-[0.6fr] grow-0 shrink-0 text-right">PDF</Td>
            </Tr>
            {quotes.map((q) => (
              <Tr key={q.id}>
                <Td className="basis-[1fr] grow font-display italic text-arqud-gold">{q.quote_number}</Td>
                <Td className="basis-[1fr] grow text-arqud-muted">{q.issue_date}</Td>
                <Td className="basis-[1fr] grow text-arqud-bone">{fmt(q.total)}</Td>
                <Td className="basis-[0.8fr] grow">
                  <Pill tone={STATUS_TONE[q.status] ?? "neutral"}>{q.status}</Pill>
                </Td>
                <Td className="basis-[0.6fr] grow-0 shrink-0 text-right">
                  <a href={`/api/quotes/${q.id}/pdf`} target="_blank" rel="noopener noreferrer"
                    className="text-arqud-gold text-[12px] font-medium hover:underline">PDF →</a>
                </Td>
              </Tr>
            ))}
          </Table>
        )
      )}

      {/* Leads */}
      {tab === "Leads" && <LeadsTab leads={leads} />}

      {/* Reports */}
      {tab === "Reports" && (
        reports.length === 0 ? (
          <Card><p className="text-arqud-muted text-sm py-6 text-center">No reports uploaded yet.</p></Card>
        ) : (
          <Table>
            <Tr header>
              <Td className="basis-[1.4fr] grow">Report</Td>
              <Td className="basis-[1fr] grow">Period</Td>
              <Td className="basis-[1fr] grow">Uploaded</Td>
              <Td className="basis-[1fr] grow text-right">Actions</Td>
            </Tr>
            {reports.map((r) => (
              <Tr key={r.id}>
                <Td className="basis-[1.4fr] grow text-arqud-bone">{r.title}</Td>
                <Td className="basis-[1fr] grow text-arqud-muted">{r.period}</Td>
                <Td className="basis-[1fr] grow text-arqud-muted">{new Date(r.created_at).toLocaleDateString("en-ZA")}</Td>
                <Td className="basis-[1fr] grow flex items-center justify-end gap-4">
                  {reportUrls[r.id] && (
                    <a href={reportUrls[r.id]} target="_blank" rel="noopener noreferrer"
                      className="text-arqud-gold text-[12px] font-medium hover:underline">Download</a>
                  )}
                  <button disabled={pending}
                    onClick={() => { if (confirm("Delete this report?")) start(() => deleteReport(r.id, clientId)); }}
                    className="text-[12px] text-red-400 hover:text-red-300 disabled:opacity-50">Delete</button>
                </Td>
              </Tr>
            ))}
          </Table>
        )
      )}

      {/* Documents */}
      {tab === "Documents" && (
        documents.length === 0 ? (
          <Card><p className="text-arqud-muted text-sm py-6 text-center">No documents shared yet.</p></Card>
        ) : (
          <Table>
            <Tr header>
              <Td className="basis-[1.4fr] grow">Name</Td>
              <Td className="basis-[1fr] grow">Category</Td>
              <Td className="basis-[1fr] grow">Shared</Td>
              <Td className="basis-[1fr] grow text-right">Actions</Td>
            </Tr>
            {documents.map((d) => (
              <Tr key={d.id}>
                <Td className="basis-[1.4fr] grow text-arqud-bone">{d.name}</Td>
                <Td className="basis-[1fr] grow text-arqud-muted">{CATEGORY_LABELS[d.category] ?? d.category}</Td>
                <Td className="basis-[1fr] grow text-arqud-muted">{new Date(d.uploaded_at).toLocaleDateString("en-ZA")}</Td>
                <Td className="basis-[1fr] grow flex items-center justify-end gap-4">
                  {documentUrls[d.id] && (
                    <a href={documentUrls[d.id]} target="_blank" rel="noopener noreferrer"
                      className="text-arqud-gold text-[12px] font-medium hover:underline">Download</a>
                  )}
                  <button disabled={pending}
                    onClick={() => { if (confirm("Remove this document?")) start(() => deleteDocument(d.id, clientId)); }}
                    className="text-[12px] text-red-400 hover:text-red-300 disabled:opacity-50">Remove</button>
                </Td>
              </Tr>
            ))}
          </Table>
        )
      )}
    </div>
  );
}
