"use client";

import { useState, useTransition, useRef } from "react";
import { Card, Input, Button } from "@/components/ui";
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
    <div className="max-w-lg space-y-5">
      {msg && <p className="text-arqud-green text-sm animate-fade-up">{msg}</p>}
      {err && <p className="text-red-400 text-sm animate-fade-up">{err}</p>}

      {/* Avatar */}
      <Card title="Profile Photo">
        <div className="flex items-center gap-6 mt-3">
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
            <Button type="button" variant="outline" size="sm" disabled={isPending}
              onClick={() => fileRef.current?.click()}>
              {isPending ? "Uploading..." : "Upload Photo"}
            </Button>
          </div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp"
            className="hidden" onChange={handleAvatarChange} />
        </div>
      </Card>

      {/* Profile */}
      <Card title="Profile">
        <form id="profile-form" onSubmit={handle(updateProfile)} className="space-y-4 mt-3">
          <div>
            <label className="block text-xs uppercase tracking-widest text-arqud-muted mb-2">Email</label>
            <p className="text-arqud-bone-dim text-sm px-3.5 py-2.5 border border-arqud-line-2 bg-arqud-panel rounded-control">{email}</p>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest text-arqud-muted mb-2">Display Name</label>
            <Input name="full_name" defaultValue={fullName} className="w-full" />
          </div>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving..." : "Save Profile"}
          </Button>
        </form>
      </Card>

      {/* Password */}
      <Card title="Change Password">
        <form onSubmit={handle(updatePassword)} className="space-y-4 mt-3">
          <div>
            <label className="block text-xs uppercase tracking-widest text-arqud-muted mb-2">New Password</label>
            <Input name="password" type="password" required minLength={8} className="w-full" placeholder="At least 8 characters" />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest text-arqud-muted mb-2">Confirm Password</label>
            <Input name="confirm" type="password" required minLength={8} className="w-full" placeholder="Repeat new password" />
          </div>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Updating..." : "Update Password"}
          </Button>
        </form>
      </Card>

      {/* Company info */}
      <Card title="ARQUD Company Details" caption="Appears automatically on every invoice and quote PDF.">
        <div className="grid grid-cols-2 gap-4">
          {[
            ["Company", "ARQUD (PTY) LTD"],
            ["Reg Number", "2025/074398/07"],
            ["Email", "Morne@arqud.com"],
            ["Phone", "+27 60 865 8690"],
            ["Website", "arqud.com"],
            ["Bank", "FNB Gold Business"],
            ["Account No", "63219437109"],
            ["Branch Code", "255355"],
            ["VAT Number", "Pending — add when received"],
          ].map(([label, value]) => (
            <div key={label} className="space-y-1">
              <p className="text-xs uppercase tracking-widest text-arqud-muted">{label}</p>
              <p className={`text-sm ${String(value).startsWith("Pending") ? "text-arqud-muted italic" : "text-arqud-bone"}`}>{value}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
