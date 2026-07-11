"use client";

// Typed-name e-sign block — the one action on the page. Gold ACCEPT is the
// single primary CTA; decline is a deliberately quiet text reveal beneath it.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { acceptProposal, declineProposal } from "./actions";

export function AcceptBlock({ token }: { token: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [acceptedAs, setAcceptedAs] = useState<string | null>(null);
  const [declined, setDeclined] = useState(false);
  const [showDecline, setShowDecline] = useState(false);
  const [reason, setReason] = useState("");

  const accept = () => {
    const trimmed = name.trim();
    if (trimmed.length < 3) {
      setError("Please type your full name.");
      return;
    }
    setError("");
    start(async () => {
      const res = await acceptProposal(token, trimmed);
      if (res.ok) {
        setAcceptedAs(trimmed);
        router.refresh();
      } else {
        setError(res.error ?? "Something went wrong — please try again.");
      }
    });
  };

  const decline = () => {
    setError("");
    start(async () => {
      const res = await declineProposal(token, reason.trim() || undefined);
      if (res.ok) {
        setDeclined(true);
        router.refresh();
      } else {
        setError("Something went wrong — please try again.");
      }
    });
  };

  // Success state swaps in without a reload; router.refresh() syncs the page.
  if (acceptedAs) {
    const date = new Date().toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" });
    return (
      <div className="rounded-card border border-arqud-gold/40 bg-arqud-gold/5 px-6 py-8 text-center gold-topedge relative overflow-hidden">
        <p className="font-display text-2xl text-arqud-gold m-0">Accepted</p>
        <p className="mt-2 text-[15px] text-arqud-bone-dim m-0">
          Accepted by <span className="text-arqud-bone">{acceptedAs}</span> on {date}
        </p>
        <p className="mt-3 text-[13px] text-arqud-muted m-0">Thank you — we&apos;ll be in touch shortly to get started.</p>
      </div>
    );
  }

  if (declined) {
    return (
      <div className="rounded-card border border-arqud-line bg-arqud-panel/50 px-6 py-8 text-center">
        <p className="text-[15px] text-arqud-bone-dim m-0">This proposal has been declined.</p>
        <p className="mt-2 text-[13px] text-arqud-muted m-0">
          Changed your mind? Email <a href="mailto:Morne@arqud.com" className="text-arqud-gold hover:text-arqud-gold-soft">Morne@arqud.com</a>.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-card border border-arqud-line panel-gradient gold-topedge relative overflow-hidden px-5 py-7 sm:px-8">
      <p className="text-center text-xs uppercase tracking-[0.24em] text-arqud-muted m-0">Ready to proceed?</p>
      <h2 className="mt-2 text-center font-display text-2xl text-arqud-bone sm:text-3xl">Accept this proposal</h2>

      <div className="mx-auto mt-6 max-w-md">
        <label htmlFor="accept-name" className="block text-[11px] uppercase tracking-[0.18em] text-arqud-muted mb-2">
          Your full name
        </label>
        <input
          id="accept-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") accept(); }}
          autoComplete="name"
          placeholder="e.g. Jane Mokoena"
          disabled={pending}
          className="w-full rounded-control border border-arqud-line-2 bg-arqud-panel px-4 py-3.5 text-[16px] text-arqud-bone placeholder:text-arqud-muted focus:outline-none focus:ring-1 focus:ring-arqud-gold/40 transition disabled:opacity-50"
        />
        <p className="mt-2 text-[12px] text-arqud-muted">
          Typing your name and pressing Accept acts as your electronic signature.
        </p>

        {error && <p className="mt-3 text-[13px] text-red-400" role="alert">{error}</p>}

        <button
          type="button"
          onClick={accept}
          disabled={pending}
          className="mt-5 w-full rounded-control bg-gradient-to-r from-arqud-gold to-arqud-gold-soft px-6 py-4 text-sm font-semibold uppercase tracking-[0.14em] text-arqud-bg shadow-[0_8px_22px_rgba(200,169,110,0.28)] transition-all hover:-translate-y-px disabled:opacity-50 disabled:hover:translate-y-0 cursor-pointer"
          style={{ touchAction: "manipulation" }}
        >
          {pending ? "Accepting…" : "Accept proposal"}
        </button>

        {!showDecline ? (
          <p className="mt-5 text-center">
            <button
              type="button"
              onClick={() => setShowDecline(true)}
              className="text-[12px] text-arqud-muted hover:text-arqud-bone-dim underline underline-offset-4 transition-colors cursor-pointer"
            >
              Decline instead
            </button>
          </p>
        ) : (
          <div className="mt-6 border-t border-arqud-line/60 pt-5">
            <label htmlFor="decline-reason" className="block text-[11px] uppercase tracking-[0.18em] text-arqud-muted mb-2">
              Reason (optional)
            </label>
            <textarea
              id="decline-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              maxLength={300}
              disabled={pending}
              placeholder="A one-liner helps us improve"
              className="w-full resize-none rounded-control border border-arqud-line-2 bg-arqud-panel px-4 py-3 text-[16px] text-arqud-bone placeholder:text-arqud-muted focus:outline-none focus:ring-1 focus:ring-arqud-gold/40 transition disabled:opacity-50"
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setShowDecline(false)}
                disabled={pending}
                className="text-[12px] text-arqud-muted hover:text-arqud-bone-dim transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={decline}
                disabled={pending}
                className="rounded-control border border-red-400/40 px-5 py-2.5 text-[12px] font-semibold uppercase tracking-widest text-red-400 transition-colors hover:bg-red-400/10 disabled:opacity-50 cursor-pointer"
                style={{ touchAction: "manipulation" }}
              >
                {pending ? "Declining…" : "Confirm decline"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
