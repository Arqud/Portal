"use client";

import { useRef, useState, useTransition } from "react";
import { uploadAdminFile, removeAdminFile, toggleFileSharing } from "./actions";

const CATEGORIES = [
  { value: "contracts", label: "Contract" },
  { value: "brand_assets", label: "Brand Asset" },
  { value: "ad_creatives", label: "Ad Creative" },
  { value: "reports", label: "Report" },
  { value: "other", label: "Other" },
];

const CATEGORY_LABELS: Record<string, string> = {
  brand_assets: "Brand Assets", contracts: "Contracts",
  reports: "Reports", ad_creatives: "Ad Creatives", other: "Other",
};

type FileRow = {
  id: string; name: string; category: string;
  storage_path: string; shared_with_client: boolean;
  uploaded_at: string; client_id: string;
  client: { id: string; name: string; company: string | null } | null;
};

type Client = { id: string; name: string; company: string | null };

export function FilesClient({
  files, clients, signedUrls,
}: {
  files: FileRow[];
  clients: Client[];
  signedUrls: Record<string, string>;
}) {
  const [showUpload, setShowUpload] = useState(false);
  const [filterClient, setFilterClient] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [pending, start] = useTransition();
  const [err, setErr] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  const filtered = files.filter((f) => {
    if (filterClient !== "all" && f.client_id !== filterClient) return false;
    if (filterCategory !== "all" && f.category !== filterCategory) return false;
    return true;
  });

  function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData(formRef.current!);
    setErr("");
    start(async () => {
      try {
        await uploadAdminFile(fd);
        setShowUpload(false);
        formRef.current?.reset();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Upload failed.");
      }
    });
  }

  const inputCls = "w-full bg-arqud-black border border-arqud-ink px-4 py-3 text-arqud-bone focus:border-arqud-gold focus:outline-none text-sm";

  return (
    <div>
      {/* Upload modal */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md bg-arqud-night border border-arqud-ink p-8 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl text-arqud-gold">Upload File</h2>
              <button onClick={() => setShowUpload(false)} className="text-arqud-muted hover:text-arqud-bone text-xl">✕</button>
            </div>
            {err && <p className="text-red-400 text-sm">{err}</p>}
            <form ref={formRef} onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-widest text-arqud-muted mb-1">Client</label>
                <select name="clientId" required className={inputCls}>
                  <option value="">Select client…</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.company ?? c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-arqud-muted mb-1">File Name</label>
                <input name="name" required placeholder="Brand Guidelines 2026" className={inputCls} />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-arqud-muted mb-1">Category</label>
                <select name="category" className={inputCls}>
                  {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-arqud-muted mb-1">File</label>
                <input name="file" type="file" required accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,application/pdf,image/*"
                  className="w-full text-arqud-bone text-sm file:mr-4 file:py-2 file:px-4 file:border-0 file:bg-arqud-gold file:text-arqud-black file:text-xs file:uppercase file:tracking-widest file:cursor-pointer" />
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" name="shared_with_client" id="shared" className="w-4 h-4 accent-arqud-gold" defaultChecked />
                <label htmlFor="shared" className="text-sm text-arqud-bone cursor-pointer">Share with client immediately</label>
              </div>
              <div className="flex gap-4 pt-2">
                <button type="submit" disabled={pending}
                  className="flex-1 bg-arqud-gold py-3 text-sm font-semibold uppercase tracking-widest text-arqud-black hover:bg-arqud-gold-soft disabled:opacity-50">
                  {pending ? "Uploading..." : "Upload"}
                </button>
                <button type="button" onClick={() => setShowUpload(false)}
                  className="flex-1 border border-arqud-ink py-3 text-sm uppercase tracking-widest text-arqud-muted hover:text-arqud-bone">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Filters + upload button */}
      <div className="flex items-center gap-4 mb-6">
        <select value={filterClient} onChange={(e) => setFilterClient(e.target.value)}
          className="bg-arqud-night border border-arqud-ink px-4 py-2 text-arqud-bone text-sm focus:border-arqud-gold focus:outline-none">
          <option value="all">All Clients</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.company ?? c.name}</option>)}
        </select>
        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}
          className="bg-arqud-night border border-arqud-ink px-4 py-2 text-arqud-bone text-sm focus:border-arqud-gold focus:outline-none">
          <option value="all">All Categories</option>
          {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <div className="flex-1" />
        <button onClick={() => setShowUpload(true)}
          className="bg-arqud-gold px-6 py-2 text-sm font-semibold uppercase tracking-widest text-arqud-black hover:bg-arqud-gold-soft">
          + Upload File
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="border border-arqud-ink bg-arqud-night p-12 text-center space-y-3">
          <p className="font-display text-2xl text-arqud-gold">No files yet</p>
          <p className="text-arqud-bone text-sm">Upload contracts, brand assets, ad creatives and share them with clients.</p>
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-arqud-ink">
              {["Name", "Client", "Category", "Shared", "Uploaded", "Actions"].map((h) => (
                <th key={h} className="text-left text-xs uppercase tracking-widest text-arqud-muted pb-3 pr-4">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((f) => (
              <tr key={f.id} className="border-b border-arqud-ink/50 hover:bg-arqud-night/50">
                <td className="py-3 pr-4 text-arqud-bone">{f.name}</td>
                <td className="py-3 pr-4 text-arqud-muted">{f.client?.company ?? f.client?.name ?? "—"}</td>
                <td className="py-3 pr-4 text-arqud-muted">{CATEGORY_LABELS[f.category] ?? f.category}</td>
                <td className="py-3 pr-4">
                  <button disabled={pending}
                    onClick={() => start(() => toggleFileSharing(f.id, !f.shared_with_client))}
                    className={`text-xs uppercase tracking-widest border px-2 py-0.5 transition-colors ${
                      f.shared_with_client
                        ? "text-green-400 border-green-400"
                        : "text-arqud-muted border-arqud-muted hover:border-arqud-gold hover:text-arqud-gold"
                    }`}>
                    {f.shared_with_client ? "Shared" : "Private"}
                  </button>
                </td>
                <td className="py-3 pr-4 text-arqud-muted">{new Date(f.uploaded_at).toLocaleDateString("en-ZA")}</td>
                <td className="py-3 flex gap-3 items-center">
                  {signedUrls[f.id] && (
                    <a href={signedUrls[f.id]} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-arqud-gold hover:text-arqud-gold-soft uppercase tracking-widest">Download</a>
                  )}
                  <button disabled={pending}
                    onClick={() => { if (confirm("Delete this file?")) start(() => removeAdminFile(f.id, f.storage_path)); }}
                    className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
