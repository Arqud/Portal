"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { Avatar } from "./DataTable";
import { ThemeToggle } from "./ThemeToggle";

type NavItem = { label: string; href: string; soon?: boolean };
type NavGroup = { heading: string; items: readonly NavItem[] };

const CLIENT_GROUPS: readonly NavGroup[] = [
  {
    heading: "Menu",
    items: [
      { label: "Dashboard", href: "/client/dashboard" },
      { label: "Leads", href: "/client/leads" },
      { label: "Campaigns", href: "/client/campaigns" },
      { label: "Invoices", href: "/client/invoices" },
      { label: "Reports", href: "/client/reports" },
      { label: "Documents", href: "/client/documents" },
    ],
  },
];

const ADMIN_GROUPS: readonly NavGroup[] = [
  {
    heading: "Workspace",
    items: [
      { label: "Home", href: "/admin/overview" },
      { label: "Clients", href: "/admin/clients" },
      { label: "Campaigns", href: "/admin/campaigns" },
    ],
  },
  {
    heading: "Run the business",
    items: [
      { label: "Tasks", href: "/admin/tasks" },
      { label: "Calendar", href: "/admin/calendar" },
      { label: "Proposals", href: "/admin/proposals", soon: true },
      { label: "Finances", href: "/admin/finances" },
      { label: "Files", href: "/admin/files" },
      { label: "Settings", href: "/admin/settings" },
    ],
  },
];

type SidebarProps = {
  variant: "client" | "admin";
  brandName: string;
  user: { name: string; label: string };
  // Brand-scoped staff logins get a Leads-only sidebar.
  leadsOnly?: boolean;
};

export function Sidebar({ variant, brandName, user, leadsOnly }: SidebarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const clientGroups: readonly NavGroup[] = leadsOnly
    ? [{ heading: "Menu", items: [{ label: "Leads", href: "/client/leads" }] }]
    : CLIENT_GROUPS;
  const groups = variant === "client" ? clientGroups : ADMIN_GROUPS;
  const homeHref = variant === "client" ? (leadsOnly ? "/client/leads" : "/client/dashboard") : "/admin/overview";
  const initials = user.name.charAt(0).toUpperCase() || "?";

  const itemBox = "flex items-center gap-[11px] text-[13px] px-3 py-[10px] rounded-control transition-colors duration-150";
  const iconBox = "w-4 h-4 rounded-[5px] border-[1.5px] shrink-0";

  const navList = (
    <nav aria-label="Primary" className="flex flex-col gap-3">
      {groups.map((group) => (
        <div key={group.heading} className="flex flex-col gap-0.5">
          <p className="text-[9px] tracking-[0.22em] text-arqud-muted uppercase px-2.5 pb-1.5">{group.heading}</p>
          {group.items.map(({ label, href, soon }) => {
            if (soon) {
              return (
                <div key={href} className={cn(itemBox, "text-arqud-bone-dim/45 cursor-default")} aria-disabled="true">
                  <span className={cn(iconBox, "border-current opacity-50")} aria-hidden="true" />
                  {label}
                  <span className="ml-auto rounded-full bg-arqud-gold/10 px-2 py-0.5 text-[8.5px] font-semibold tracking-wide text-arqud-gold">
                    Soon
                  </span>
                </div>
              );
            }
            const isActive = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={cn(
                  itemBox,
                  isActive
                    ? "bg-gradient-to-r from-arqud-gold to-arqud-gold-soft text-arqud-bg font-semibold shadow-[0_6px_18px_rgba(200,169,110,0.25)]"
                    : "text-arqud-bone-dim hover:bg-arqud-gold/5 hover:text-arqud-bone"
                )}
              >
                <span
                  className={cn(iconBox, isActive ? "border-arqud-bg bg-arqud-bg/25" : "border-current opacity-70")}
                  aria-hidden="true"
                />
                {label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );

  return (
    <>
      {/* Mobile header bar with drawer toggle */}
      <div className="md:hidden flex items-center justify-between px-4 h-14 bg-arqud-bg border-b border-arqud-line fixed top-0 inset-x-0 z-50">
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
          <span className="mt-2 block text-[10px] uppercase tracking-[0.12em] text-arqud-muted leading-snug line-clamp-2">
            {variant === "client" ? brandName : "Command Center"}
          </span>
        </Link>

        {navList}

        <div className="mt-auto pt-2.5 border-t border-arqud-line">
          <div className="flex items-center gap-2.5">
            <Avatar initials={initials} />
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] text-arqud-bone leading-tight truncate">{user.name}</p>
              <p className="text-[10.5px] text-arqud-muted leading-tight truncate">{user.label}</p>
            </div>
            <ThemeToggle />
          </div>
          <form action="/logout" method="post" className="mt-3">
            <button
              type="submit"
              className="w-full text-[11px] uppercase tracking-widest text-arqud-muted hover:text-arqud-bone border border-arqud-line-2 rounded-control py-2 transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
