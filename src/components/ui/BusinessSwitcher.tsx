"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setActiveBusiness } from "@/app/admin/business-actions";
import { BUSINESS_OPTIONS, BUSINESS_LABEL, type BusinessKey } from "@/lib/business/persist";
import { cn } from "@/lib/cn";

// Workspace switcher — the "top switcher that re-skins everything". Flipping this
// sets the active-business cookie (server action) and refreshes, so the whole
// admin re-themes and re-scopes. One legal entity, one ledger; this only changes
// which workspace you're working in, never the accounting.

const SUBTITLE: Record<BusinessKey, string> = {
  arqud: "Command Center",
  sa_equipment: "Machinery Dealer",
};

// The SA Equipment mark is a fixed ink plate + signal-amber "SA" (matches the
// invoice logo) — literal colors so it reads the same in either theme.
function Mark({ business, size }: { business: BusinessKey; size: "lg" | "sm" }) {
  const box = size === "lg" ? "h-8 w-8 rounded-[9px] text-[11px]" : "h-6 w-6 rounded-[7px] text-[9px]";
  if (business === "sa_equipment") {
    return (
      <span className={cn(box, "shrink-0 grid place-items-center font-bold tracking-tight bg-[#0E1116] text-[#F5B301]")}>
        SA
      </span>
    );
  }
  return (
    <span className={cn(box, "shrink-0 grid place-items-center font-bold tracking-tight bg-arqud-gold/15 text-arqud-gold")}>
      AQ
    </span>
  );
}

export function BusinessSwitcher({ current }: { current: BusinessKey }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  function choose(key: BusinessKey) {
    setOpen(false);
    if (key === current) return;
    start(async () => {
      await setActiveBusiness(key);
      router.refresh();
    });
  }

  return (
    <div ref={ref} className="relative px-1 pb-[18px]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Switch workspace"
        disabled={pending}
        className="group flex w-full items-center gap-2.5 rounded-control px-2.5 py-2 text-left transition-colors hover:bg-arqud-gold/[0.06] disabled:opacity-60"
      >
        <Mark business={current} size="lg" />
        <span className="min-w-0 flex-1">
          <span className="block font-display text-[17px] tracking-[0.16em] text-arqud-gold leading-none truncate">
            {current === "sa_equipment" ? "SA EQUIPMENT" : "ARQUD"}
          </span>
          <span className="mt-1 block text-[9.5px] uppercase tracking-[0.14em] text-arqud-muted leading-none truncate">
            {SUBTITLE[current]}
          </span>
        </span>
        <span aria-hidden className={cn("shrink-0 text-arqud-muted text-[10px] transition-transform duration-150", open && "rotate-180")}>
          ▾
        </span>
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Workspaces"
          className="absolute left-1 right-1 top-full z-50 mt-1 overflow-hidden rounded-control border border-arqud-line-2 bg-arqud-panel shadow-card"
        >
          <p className="px-3 pb-1 pt-2.5 text-[8.5px] uppercase tracking-[0.2em] text-arqud-muted">Switch workspace</p>
          {BUSINESS_OPTIONS.map((opt) => {
            const isCur = opt.value === current;
            return (
              <button
                key={opt.value}
                type="button"
                role="menuitemradio"
                aria-checked={isCur}
                onClick={() => choose(opt.value)}
                className={cn(
                  "flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-[13px] transition-colors",
                  isCur ? "text-arqud-gold" : "text-arqud-bone-dim hover:bg-arqud-gold/[0.06] hover:text-arqud-bone"
                )}
              >
                <Mark business={opt.value} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{BUSINESS_LABEL[opt.value]}</span>
                  <span className="block text-[9.5px] uppercase tracking-wider text-arqud-muted">{SUBTITLE[opt.value]}</span>
                </span>
                {isCur && <span aria-hidden className="text-[11px] text-arqud-gold">✓</span>}
              </button>
            );
          })}
          <p className="border-t border-arqud-line/60 px-3 py-2 text-[9.5px] leading-snug text-arqud-muted">
            One company · one set of books. Switching changes the workspace, not the accounting.
          </p>
        </div>
      )}
    </div>
  );
}
