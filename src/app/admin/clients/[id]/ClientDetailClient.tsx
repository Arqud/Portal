"use client";

import { useState, useTransition } from "react";
import { UploadReportForm } from "../UploadReportForm";
import { UploadDocumentForm } from "../UploadDocumentForm";
import { deleteReport, deleteDocument } from "../actions";

type Report = { id: string; title: string; period: string; created_at: string; pdf_url: string };
type Document = { id: string; name: string; category: string; uploaded_at: string; storage_path: string };

const CATEGORY_LABELS: Record<string, string> = {
  brand_assets: "Brand Assets", contracts: "Contracts",
  reports: "Reports", ad_creatives: "Ad Creatives", other: "Other",
};

export function ClientDetailClient({
  clientId, reports, documents, reportUrls, documentUrls,
}: {
  clientId: string;
  reports: Report[];
  documents: Document[];
  reportUrls: Record<string, string>;
  documentUrls: Record<string, string>;
}) {
  const [showReport, setShowReport] = useState(false);
  const [showDoc, setShowDoc] = useState(false);
  const [pending, start] = useTransition();

  return (
    <div className="space-y-10">
      {showReport && <UploadReportForm clientId={clientId} onClose={() => setShowReport(false)} />}
      {showDoc && <UploadDocumentForm clientId={clientId} onClose={() => setShowDoc(false)} />}

      {/* Reports */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-2xl text-arqud-gold">Reports</h2>
          <button onClick={() => setShowReport(true)}
            className="bg-arqud-gold px-4 py-2 text-xs font-semibold uppercase tracking-widest text-arqud-black hover:bg-arqud-gold-soft">
            + Upload Report
          </button>
        </div>
        {reports.length === 0 ? (
          <p className="text-arqud-muted text-sm py-6 border border-arqud-ink text-center">No reports uploaded yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-arqud-ink">
                {["Report", "Period", "Uploaded", "Actions"].map((h) => (
                  <th key={h} className="text-left text-xs uppercase tracking-widest text-arqud-muted pb-3 pr-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id} className="border-b border-arqud-ink/50">
                  <td className="py-3 pr-4 text-arqud-bone">{r.title}</td>
                  <td className="py-3 pr-4 text-arqud-muted">{r.period}</td>
                  <td className="py-3 pr-4 text-arqud-muted">{new Date(r.created_at).toLocaleDateString("en-ZA")}</td>
                  <td className="py-3 flex gap-4">
                    {reportUrls[r.id] && (
                      <a href={reportUrls[r.id]} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-arqud-gold hover:text-arqud-gold-soft uppercase tracking-widest">Download</a>
                    )}
                    <button disabled={pending}
                      onClick={() => { if (confirm("Delete this report?")) start(() => deleteReport(r.id, clientId)); }}
                      className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Documents */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-2xl text-arqud-gold">Shared Documents</h2>
          <button onClick={() => setShowDoc(true)}
            className="bg-arqud-gold px-4 py-2 text-xs font-semibold uppercase tracking-widest text-arqud-black hover:bg-arqud-gold-soft">
            + Share Document
          </button>
        </div>
        {documents.length === 0 ? (
          <p className="text-arqud-muted text-sm py-6 border border-arqud-ink text-center">No documents shared yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-arqud-ink">
                {["Name", "Category", "Shared", "Actions"].map((h) => (
                  <th key={h} className="text-left text-xs uppercase tracking-widest text-arqud-muted pb-3 pr-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {documents.map((d) => (
                <tr key={d.id} className="border-b border-arqud-ink/50">
                  <td className="py-3 pr-4 text-arqud-bone">{d.name}</td>
                  <td className="py-3 pr-4 text-arqud-muted">{CATEGORY_LABELS[d.category] ?? d.category}</td>
                  <td className="py-3 pr-4 text-arqud-muted">{new Date(d.uploaded_at).toLocaleDateString("en-ZA")}</td>
                  <td className="py-3 flex gap-4">
                    {documentUrls[d.id] && (
                      <a href={documentUrls[d.id]} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-arqud-gold hover:text-arqud-gold-soft uppercase tracking-widest">Download</a>
                    )}
                    <button disabled={pending}
                      onClick={() => { if (confirm("Remove this document?")) start(() => deleteDocument(d.id, clientId)); }}
                      className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50">Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
