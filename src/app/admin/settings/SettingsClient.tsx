"use client";

import { useState, useTransition } from "react";
import { updateProfile, updatePassword } from "./actions";

export function SettingsClient({ userId, email, fullName }: { userId: string; email: string; fullName: string }) {
  const [isPending, start] = useTransition();
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const inputCls = "w-full bg-arqud-black border border-arqud-ink px-4 py-3 text-arqud-bone focus:border-arqud-gold focus:outline-none text-sm";

  function handle(action: (fd: FormData) => Promise<void>) {
    return (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setMsg(""); setErr("");
      const fd = new FormData(e.currentTarget);
      start(async () => {
        try {
          await action(fd);
          setMsg("Saved successfully.");
          (e.target as HTMLFormElement).reset();
        } catch (e) {
          setErr(e instanceof Error ? e.message : "Something went wrong.");
        }
      });
    };
  }

  return (
    <div className="max-w-lg space-y-10">
      {msg && <p className="text-green-400 text-sm">{msg}</p>}
      {err && <p className="text-red-400 text-sm">{err}</p>}

      {/* Profile */}
      <section className="border border-arqud-ink bg-arqud-night p-6 space-y-4">
        <h2 className="font-display text-2xl text-arqud-gold">Profile</h2>
        <div>
          <label className="block text-xs uppercase tracking-widest text-arqud-muted mb-1">Email</label>
          <p className="text-arqud-bone text-sm px-4 py-3 border border-arqud-ink bg-arqud-black/50">{email}</p>
        </div>
        <form onSubmit={handle(updateProfile)} className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-widest text-arqud-muted mb-1">Display Name</label>
            <input name="full_name" defaultValue={fullName} className={inputCls} />
          </div>
          <button type="submit" disabled={isPending}
            className="bg-arqud-gold px-6 py-2 text-sm font-semibold uppercase tracking-widest text-arqud-black hover:bg-arqud-gold-soft disabled:opacity-50">
            {isPending ? "Saving..." : "Save Profile"}
          </button>
        </form>
      </section>

      {/* Password */}
      <section className="border border-arqud-ink bg-arqud-night p-6 space-y-4">
        <h2 className="font-display text-2xl text-arqud-gold">Change Password</h2>
        <form onSubmit={handle(updatePassword)} className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-widest text-arqud-muted mb-1">New Password</label>
            <input name="password" type="password" required minLength={8} className={inputCls} placeholder="At least 8 characters" />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest text-arqud-muted mb-1">Confirm Password</label>
            <input name="confirm" type="password" required minLength={8} className={inputCls} placeholder="Repeat new password" />
          </div>
          <button type="submit" disabled={isPending}
            className="bg-arqud-gold px-6 py-2 text-sm font-semibold uppercase tracking-widest text-arqud-black hover:bg-arqud-gold-soft disabled:opacity-50">
            {isPending ? "Updating..." : "Update Password"}
          </button>
        </form>
      </section>

      {/* ARQUD Details info */}
      <section className="border border-arqud-ink bg-arqud-night p-6 space-y-3">
        <h2 className="font-display text-2xl text-arqud-gold">ARQUD Company Details</h2>
        <p className="text-arqud-muted text-sm">These appear on every invoice and quote PDF automatically.</p>
        <div className="grid grid-cols-2 gap-3 text-sm">
          {[
            ["Company", "ARQUD (PTY) LTD"],
            ["Reg Number", "2025/074398/07"],
            ["Email", "Morne@arqud.com"],
            ["Phone", "+27 60 865 8690"],
            ["Website", "arqud.com"],
            ["Bank", "FNB Gold Business"],
            ["Account No", "63195766482"],
            ["Branch Code", "255355"],
            ["VAT Number", "Pending — add when received"],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-xs uppercase tracking-widest text-arqud-muted mb-0.5">{label}</p>
              <p className={`text-sm ${value.startsWith("Pending") ? "text-arqud-muted italic" : "text-arqud-bone"}`}>{value}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
