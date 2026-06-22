"use client";

import { useRef, useState, useTransition } from "react";
import { uploadReport } from "./actions";
import { Button, Input } from "@/components/ui";

export function UploadReportForm({ clientId, onClose }: { clientId: string; onClose: () => void }) {
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
        await uploadReport(fd);
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
          <h2 className="font-display text-2xl text-arqud-gold">Upload Report</h2>
          <button onClick={onClose} className="text-arqud-muted hover:text-arqud-bone text-xl leading-none">✕</button>
        </div>
        {err && <p className="text-red-400 text-sm">{err}</p>}
        <form ref={formRef} onSubmit={handle} className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-widest text-arqud-muted mb-1.5">Report Title</label>
            <Input name="title" required placeholder="May 2026 Performance Report" />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest text-arqud-muted mb-1.5">Period</label>
            <Input name="period" required placeholder="May 2026" />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest text-arqud-muted mb-1.5">PDF File</label>
            <input name="file" type="file" required accept=".pdf,application/pdf"
              className="w-full text-arqud-bone text-sm file:mr-4 file:py-2 file:px-4 file:border-0 file:bg-arqud-gold file:text-arqud-bg file:text-xs file:uppercase file:tracking-widest file:cursor-pointer file:rounded-control" />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={isPending} className="flex-1 justify-center">
              {isPending ? "Uploading…" : "Upload Report"}
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
