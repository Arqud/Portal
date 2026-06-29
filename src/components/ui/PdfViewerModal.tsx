"use client";

import { useEffect } from "react";

const BTN_PRIMARY =
  "inline-flex items-center gap-1.5 font-semibold tracking-wide rounded-control transition-all text-[11px] px-3.5 py-2 text-arqud-bg bg-gradient-to-r from-arqud-gold to-arqud-gold-soft hover:-translate-y-px";
const BTN_OUTLINE =
  "inline-flex items-center gap-1.5 font-semibold tracking-wide rounded-control transition-all text-[11px] px-3.5 py-2 text-arqud-gold-soft border border-arqud-gold/40 hover:border-arqud-gold/70 hover:bg-arqud-gold/5";

export function PdfViewerModal({
  src,
  downloadHref,
  title,
  onClose,
}: {
  src: string;
  downloadHref: string;
  title: string;
  onClose: () => void;
}) {
  // Close on Escape; lock background scroll while open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/85 p-3 sm:p-6" onClick={onClose}>
      <div
        className="mx-auto flex h-full w-full max-w-4xl flex-col overflow-hidden rounded-card border border-arqud-line panel-gradient"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-arqud-line px-4 py-3">
          <p className="font-display text-[15px] text-arqud-gold truncate">{title}</p>
          <div className="flex shrink-0 items-center gap-2">
            <a href={downloadHref} className={BTN_PRIMARY}>
              ↓ Download
            </a>
            <a href={src} target="_blank" rel="noopener noreferrer" className={`${BTN_OUTLINE} hidden sm:inline-flex`}>
              Open
            </a>
            <button
              onClick={onClose}
              aria-label="Close"
              className="ml-1 text-xl leading-none text-arqud-muted transition-colors hover:text-arqud-bone"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Live PDF */}
        <iframe src={src} title={title} className="w-full flex-1 bg-white" />

        {/* Mobile fallback (some mobile browsers don't render PDFs in an iframe) */}
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="border-t border-arqud-line px-4 py-2.5 text-center text-[11px] uppercase tracking-widest text-arqud-muted transition-colors hover:text-arqud-gold sm:hidden"
        >
          Trouble viewing? Tap to open the PDF
        </a>
      </div>
    </div>
  );
}
