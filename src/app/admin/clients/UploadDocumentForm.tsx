"use client";

import { useRef, useState, useTransition } from "react";
import { uploadDocument } from "./actions";
import { Button, Input, Select } from "@/components/ui";

const CATEGORIES = [
  { value: "contracts", label: "Contract" },
  { value: "brand_assets", label: "Brand Asset" },
  { value: "ad_creatives", label: "Ad Creative" },
  { value: "reports", label: "Report" },
  { value: "other", label: "Other" },
];

export function UploadDocumentForm({ clientId, onClose }: { clientId: string; onClose: () => void }) {
  const [isPending, start] = useTransition();
  const [err, setErr] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  function handle(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData(formRef.current!);
    fd.set("clientId", clientId);
    setErr("");
    start(async () => {
      try {
        await uploadDocument(fd);
        onClose();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Upload failed.");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-md panel-gradient border border-arqud-line rounded-card p-8 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl text-arqud-gold">Share Document</h2>
          <button onClick={onClose} className="text-arqud-muted hover:text-arqud-bone text-xl leading-none">✕</button>
        </div>
        {err && <p className="text-red-400 text-sm">{err}</p>}
        <form ref={formRef} onSubmit={handle} className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-widest text-arqud-muted mb-1.5">Document Name</label>
            <Input name="name" required placeholder="Sparkling Auto Brand Guidelines" />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest text-arqud-muted mb-1.5">Category</label>
            <Select name="category">
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </Select>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest text-arqud-muted mb-1.5">File</label>
            <input name="file" type="file" required
              accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,application/pdf,image/*"
              className="w-full text-arqud-bone text-sm file:mr-4 file:py-2 file:px-4 file:border-0 file:bg-arqud-gold file:text-arqud-bg file:text-xs file:uppercase file:tracking-widest file:cursor-pointer file:rounded-control" />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={isPending} className="flex-1 justify-center">
              {isPending ? "Uploading…" : "Share Document"}
            </Button>
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 justify-center">
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
