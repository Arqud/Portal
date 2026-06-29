"use client";

import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";

// Render PDFs ourselves (canvas) so display never depends on the browser's
// built-in PDF handler (some browsers force-download embedded PDFs).
// Worker is self-hosted (same-origin) so Brave Shields / CSP can't block it.
pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

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
  const scrollRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errMsg, setErrMsg] = useState("");

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

  // Fetch the PDF bytes (fetch ignores Content-Disposition) and paint each page.
  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let task: any;

    (async () => {
      try {
        setStatus("loading");
        const res = await fetch(src, { credentials: "same-origin" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buf = await res.arrayBuffer();
        if (cancelled) return;

        task = pdfjsLib.getDocument({ data: buf });
        const pdf = await task.promise;
        if (cancelled) return;

        const container = scrollRef.current;
        if (!container) return;
        container.innerHTML = "";
        const width = Math.min(container.clientWidth || 800, 1000);
        const dpr = Math.min(window.devicePixelRatio || 1, 2);

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          if (cancelled) return;
          const base = page.getViewport({ scale: 1 });
          const viewport = page.getViewport({ scale: width / base.width });

          const canvas = document.createElement("canvas");
          canvas.width = Math.floor(viewport.width * dpr);
          canvas.height = Math.floor(viewport.height * dpr);
          canvas.style.width = "100%";
          canvas.style.height = "auto";
          canvas.style.display = "block";
          canvas.style.margin = "0 auto 12px";
          canvas.style.borderRadius = "4px";
          canvas.style.boxShadow = "0 6px 24px rgba(0,0,0,0.4)";

          const ctx = canvas.getContext("2d");
          if (!ctx) continue;
          ctx.scale(dpr, dpr);
          await page.render({ canvasContext: ctx, viewport }).promise;
          if (cancelled) return;
          container.appendChild(canvas);
        }
        setStatus("ready");
      } catch (e) {
        if (!cancelled) {
          setErrMsg(e instanceof Error ? e.message : String(e));
          setStatus("error");
        }
      }
    })();

    return () => {
      cancelled = true;
      try {
        task?.destroy?.();
      } catch {
        /* noop */
      }
    };
  }, [src]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/85 p-3 sm:p-6" onClick={onClose}>
      <div
        className="mx-auto flex h-full w-full max-w-4xl flex-col overflow-hidden rounded-card border border-arqud-line panel-gradient"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-arqud-line px-4 py-3">
          <p className="truncate font-display text-[15px] text-arqud-gold">{title}</p>
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

        {/* Rendered PDF */}
        <div className="relative flex-1 overflow-y-auto bg-arqud-bg-2 p-3 sm:p-5">
          <div ref={scrollRef} className="mx-auto max-w-[1000px]" />

          {status === "loading" && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-xs uppercase tracking-widest text-arqud-muted">Loading invoice…</p>
            </div>
          )}
          {status === "error" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center">
              <p className="text-xs uppercase tracking-widest text-arqud-muted">Couldn&apos;t render preview.</p>
              {errMsg && <p className="max-w-md text-[11px] text-red-400/80 break-words">{errMsg}</p>}
              <a href={downloadHref} className={BTN_PRIMARY}>
                ↓ Download instead
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
