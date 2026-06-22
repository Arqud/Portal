"use client";

import { useRef, useState, useTransition } from "react";
import { Card, Table, Tr, Td, Pill, Button, Input, Select } from "@/components/ui";
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

  return (
    <div className="space-y-6">
      {/* Upload modal */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md panel-gradient border border-arqud-line rounded-card p-8 shadow-[var(--shadow-card)] space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl text-arqud-gold">Upload File</h2>
              <button onClick={() => setShowUpload(false)} className="text-arqud-muted hover:text-arqud-bone text-xl">✕</button>
            </div>
            {err && <p className="text-red-400 text-sm">{err}</p>}
            <form ref={formRef} onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-widest text-arqud-muted mb-1">Client</label>
                <Select name="clientId" required className="w-full">
                  <option value="">Select client…</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.company ?? c.name}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-arqud-muted mb-1">File Name</label>
                <Input name="name" required placeholder="Brand Guidelines 2026" className="w-full" />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-arqud-muted mb-1">Category</label>
                <Select name="category" className="w-full">
                  {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </Select>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-arqud-muted mb-1">File</label>
                <input name="file" type="file" required accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,application/pdf,image/*"
                  className="w-full text-arqud-bone text-sm file:mr-4 file:py-2 file:px-4 file:border-0 file:bg-arqud-gold file:text-arqud-bg file:text-xs file:uppercase file:tracking-widest file:cursor-pointer file:rounded-control" />
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" name="shared_with_client" id="shared" className="w-4 h-4 accent-arqud-gold" defaultChecked />
                <label htmlFor="shared" className="text-sm text-arqud-bone cursor-pointer">Share with client immediately</label>
              </div>
              <div className="flex gap-4 pt-2">
                <Button type="submit" disabled={pending} className="flex-1 justify-center">
                  {pending ? "Uploading..." : "Upload"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowUpload(false)} className="flex-1 justify-center">
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Filters + upload button */}
      <div className="flex items-center gap-4">
        <Select value={filterClient} onChange={(e) => setFilterClient(e.target.value)} className="w-auto">
          <option value="all">All Clients</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.company ?? c.name}</option>)}
        </Select>
        <Select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="w-auto">
          <option value="all">All Categories</option>
          {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </Select>
        <div className="flex-1" />
        <Button onClick={() => setShowUpload(true)}>+ Upload File</Button>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center space-y-3">
          <p className="font-display text-2xl text-arqud-gold">No files yet</p>
          <p className="text-arqud-bone-dim text-sm">Upload contracts, brand assets, ad creatives and share them with clients.</p>
        </Card>
      ) : (
        <Table>
          <Tr header>
            <Td className="basis-[1.3fr] grow">Name</Td>
            <Td className="basis-[1fr] grow">Client</Td>
            <Td className="basis-[0.9fr] grow">Category</Td>
            <Td className="basis-[0.7fr] grow">Shared</Td>
            <Td className="basis-[0.8fr] grow">Uploaded</Td>
            <Td className="basis-[0.9fr] grow">Actions</Td>
          </Tr>
          {filtered.map((f) => (
            <Tr key={f.id}>
              <Td className="basis-[1.3fr] grow text-arqud-bone">{f.name}</Td>
              <Td className="basis-[1fr] grow">{f.client?.company ?? f.client?.name ?? "—"}</Td>
              <Td className="basis-[0.9fr] grow">{CATEGORY_LABELS[f.category] ?? f.category}</Td>
              <Td className="basis-[0.7fr] grow">
                <button disabled={pending}
                  onClick={() => start(() => toggleFileSharing(f.id, !f.shared_with_client))}
                  className="inline-flex">
                  <Pill tone={f.shared_with_client ? "converted" : "neutral"}>
                    {f.shared_with_client ? "Shared" : "Private"}
                  </Pill>
                </button>
              </Td>
              <Td className="basis-[0.8fr] grow">{new Date(f.uploaded_at).toLocaleDateString("en-ZA")}</Td>
              <Td className="basis-[0.9fr] grow">
                <div className="flex gap-3 items-center">
                  {signedUrls[f.id] && (
                    <a href={signedUrls[f.id]} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-arqud-gold hover:text-arqud-gold-soft uppercase tracking-widest transition-colors">Download</a>
                  )}
                  <button disabled={pending}
                    onClick={() => { if (confirm("Delete this file?")) start(() => removeAdminFile(f.id, f.storage_path)); }}
                    className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50 uppercase tracking-widest">Delete</button>
                </div>
              </Td>
            </Tr>
          ))}
        </Table>
      )}
    </div>
  );
}
