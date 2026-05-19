"use client";

import { useState, useTransition, useRef } from "react";
import { updateProfile, updatePassword, uploadAvatar } from "./actions";

export function SettingsClient({
  userId, email, fullName, avatarUrl,
}: {
  userId: string; email: string; fullName: string; avatarUrl?: string | null;
}) {
  const [isPending, start] = useTransition();
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [preview, setPreview] = useState<string | null>(avatarUrl ?? null);
  const fileRef = useRef<HTMLInputElement>(null);

  const inputCls = "w-full bg-arqud-black border border-arqud-ink px-4 py-3 text-arqud-bone focus:border-arqud-gold focus:outline-none text-sm transition-colors";

  function handle(action: (fd: FormData) => Promise<void>) {
    return (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setMsg(""); setErr("");
      const fd = new FormData(e.currentTarget);
      start(async () => {
        try {
          await action(fd);
          setMsg("Saved successfully.");
          if (!(e.target as HTMLFormElement).id?.includes("profile")) {
            (e.target as HTMLFormElement).reset();
          }
        } catch (e) {
          setErr(e instanceof Error ? e.message : "Something went wrong.");
        }
      });
    };
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    setMsg(""); setErr("");
    const fd = new FormData();
    fd.set("file", file);
    start(async () => {
      try {
        await uploadAvatar(fd);
        setMsg("Profile photo updated.");
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Upload failed.");
        setPreview(avatarUrl ?? null);
      }
    });
  }

  const initials = fullName ? fullName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : email[0].toUpperCase();

  return (
    <div className="max-w-lg space-y-8">
      {msg && <p className="text-green-400 text-sm animate-fade-up">{msg}</p>}
      {err && <p className="text-red-400 text-sm animate-fade-up">{err}</p>}

      {/* Avatar */}
      <section className="card p-6">
        <h2 className="font-display text-2xl mb-6">Profile Photo</h2>
        <div className="flex items-center gap-6">
          <div className="relative group cursor-pointer" onClick={() => fileRef.current?.click()}>
            {preview ? (
              <img src={preview} alt="Avatar" className="w-20 h-20 rounded-full object-cover"
                style={{ border: "2px solid rgba(200,169,110,0.3)" }} />
            ) : (
              <div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-display"
                style={{
                  background: "linear-gradient(135deg, rgba(200,169,110,0.15), rgba(200,169,110,0.05))",
                  border: "2px solid rgba(200,169,110,0.3)",
                  color: "var(--color-arqud-gold)",
                }}>
                {initials}
              </div>
            )}
            <div className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: "rgba(0,0,0,0.5)" }}>
              <span className="text-xs text-white uppercase tracking-widest">Change</span>
            </div>
          </div>
          <div>
            <p className="text-sm text-arqud-bone mb-1">{fullName || email}</p>
            <p className="text-xs text-arqud-muted mb-3">{email}</p>
            <button type="button" disabled={isPending}
              onClick={() => fileRef.current?.click()}
              className="btn-outline text-xs disabled:opacity-50">
              {isPending ? "Uploading..." : "Upload Photo"}
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp"
            className="hidden" onChange={handleAvatarChange} />
        </div>
      </section>

      {/* Profile */}
      <section className="card p-6">
        <h2 className="font-display text-2xl mb-6">Profile</h2>
        <form id="profile-form" onSubmit={handle(updateProfile)} className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-widest text-arqud-muted mb-2">Email</label>
            <p className="text-arqud-bone text-sm px-4 py-3 border border-arqud-ink bg-arqud-black/50">{email}</p>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest text-arqud-muted mb-2">Display Name</label>
            <input name="full_name" defaultValue={fullName} className={inputCls} />
          </div>
          <button type="submit" disabled={isPending} className="btn-gold disabled:opacity-50">
            {isPending ? "Saving..." : "Save Profile"}
          </button>
        </form>
      </section>

      {/* Password */}
      <section className="card p-6">
        <h2 className="font-display text-2xl mb-6">Change Password</h2>
        <form onSubmit={handle(updatePassword)} className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-widest text-arqud-muted mb-2">New Password</label>
            <input name="password" type="password" required minLength={8} className={inputCls} placeholder="At least 8 characters" />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest text-arqud-muted mb-2">Confirm Password</label>
            <input name="confirm" type="password" required minLength={8} className={inputCls} placeholder="Repeat new password" />
          </div>
          <button type="submit" disabled={isPending} className="btn-gold disabled:opacity-50">
            {isPending ? "Updating..." : "Update Password"}
          </button>
        </form>
      </section>

      {/* Company info */}
      <section className="card p-6">
        <h2 className="font-display text-2xl mb-4">ARQUD Company Details</h2>
        <p className="text-xs text-arqud-muted mb-5">Appears automatically on every invoice and quote PDF.</p>
        <div className="grid grid-cols-2 gap-4">
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
            <div key={label} className="space-y-1">
              <p className="text-xs uppercase tracking-widest text-arqud-muted">{label}</p>
              <p className={`text-sm ${String(value).startsWith("Pending") ? "text-arqud-muted italic" : "text-arqud-bone"}`}>{value}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
