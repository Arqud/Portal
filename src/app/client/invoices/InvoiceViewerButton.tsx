"use client";

import { useState } from "react";
import { PdfViewerModal } from "@/components/ui";

const BTN_OUTLINE_SM =
  "inline-flex items-center gap-2 font-semibold tracking-wide rounded-control transition-all text-[11px] px-3.5 py-2 text-arqud-gold-soft border border-arqud-gold/40 hover:border-arqud-gold/70 hover:bg-arqud-gold/5";

export function InvoiceViewerButton({ id, number }: { id: string; number: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className={BTN_OUTLINE_SM}>
        View →
      </button>
      {open && (
        <PdfViewerModal
          src={`/api/invoices/${id}/pdf?inline=1`}
          downloadHref={`/api/invoices/${id}/pdf`}
          title={`Invoice ${number}`}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
