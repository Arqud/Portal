"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { Avatar } from "./DataTable";

const CLIENT_NAV = [
  { label: "Dashboard", href: "/client/dashboard" },
  { label: "Leads", href: "/client/leads" },
  { label: "Campaigns", href: "/client/campaigns" },
  { label: "Invoices", href: "/client/invoices" },
  { label: "Reports", href: "/client/reports" },
  { label: "Documents", href: "/client/documents" },
] as const;

const ADMIN_NAV = [
  { label: "Overview", href: "/admin/overview" },
  { label: "Clients", href: "/admin/clients" },
  { label: "Campaigns", href: "/admin/campaigns" },
  { label: "Finances", href: "/admin/finances" },
  { label: "Files", href: "/admin/files" },
] as const;

type SidebarProps = {
  variant: "client" | "admin";
  brandName: string;
  user: { name: string; label: string };
};

export function Sidebar({ variant, brandName, user }: SidebarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const nav = variant === "client" ? CLIENT_NAV : ADMIN_NAV;
  const homeHref = variant === "client" ? "/client/dashboard" : "/admin/overview";
  const initials = user.name.charAt(0).toUpperCase() || "?";

  const navList = (
    <nav aria-label="Primary" className="flex flex-col gap-0.5">
      <p className="text-[9px] tracking-[0.22em] text-arqud-muted uppercase px-2.5 pb-2">Menu</p>
      {nav.map(({ label, href }) => {
        const isActive = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-[11px] text-[13px] px-3 py-[11px] rounded-control transition-colors duration-150",
              isActive
                ? "bg-gradient-to-r from-arqud-gold to-arqud-gold-soft text-arqud-bg font-semibold shadow-[0_6px_18px_rgba(200,169,110,0.25)]"
                : "text-arqud-bone-dim hover:bg-arqud-gold/5 hover:text-arqud-bone"
            )}
          >
            <span
              className={cn(
                "w-4 h-4 rounded-[5px] border-[1.5px] shrink-0",
                isActive ? "border-arqud-bg bg-arqud-bg/25" : "border-current opacity-70"
              )}
              aria-hidden="true"
            />
            {label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Mobile header bar with drawer toggle */}
      <div className="md:hidden flex items-center justify-between px-4 h-14 bg-arqud-bg border-b border-arqud-line sticky top-0 z-50">
        <Link href={homeHref} className="font-display text-lg tracking-[0.28em] text-arqud-gold">
          ARQUD
        </Link>
        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="flex flex-col gap-[5px] p-2 -mr-2"
        >
          <span className="w-5 h-[1.5px] bg-arqud-bone-dim" />
          <span className="w-5 h-[1.5px] bg-arqud-bone-dim" />
          <span className="w-5 h-[1.5px] bg-arqud-bone-dim" />
        </button>
      </div>

      {/* Mobile drawer overlay */}
      {open && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 z-40"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar column: drawer on mobile, static column from md up */}
      <aside
        className={cn(
          "w-[228px] shrink-0 flex flex-col bg-gradient-to-b from-arqud-bg-2 to-arqud-bg border-r border-arqud-line p-4 pt-6",
          "fixed inset-y-0 left-0 z-40 transition-transform duration-200 md:static md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <Link href={homeHref} className="group block px-2 pb-[22px]">
          <span className="block font-display text-[20px] tracking-[0.3em] text-arqud-gold group-hover:text-arqud-gold-soft transition-colors duration-150">
            ARQUD
          </span>
          {variant === "client" && (
            <span className="mt-2 block text-[10px] uppercase tracking-[0.12em] text-arqud-muted leading-snug line-clamp-2">
              {brandName}
            </span>
          )}
        </Link>

        {navList}

        <div className="mt-auto flex items-center gap-2.5 pt-2.5 border-t border-arqud-line">
          <Avatar initials={initials} />
          <div className="min-w-0">
            <p className="text-[12.5px] text-arqud-bone leading-tight truncate">{user.name}</p>
            <p className="text-[10.5px] text-arqud-muted leading-tight truncate">{user.label}</p>
          </div>
        </div>
      </aside>
    </>
  );
}
