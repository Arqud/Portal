"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/cn";
import type { NavMode } from "@/lib/auth/access";
import type { BusinessKey } from "@/lib/business/persist";
import { Avatar } from "./DataTable";
import { ThemeToggle } from "./ThemeToggle";
import { BusinessSwitcher } from "./BusinessSwitcher";

type NavItem = { label: string; href: string; soon?: boolean };
type NavGroup = { heading: string; items: readonly NavItem[] };

// Sparkling Franchise recruitment leads live on their own page — shown to Arno (full
// account) and Marissa (franchise-only), never to wash staff.
const FRANCHISE_ITEM: NavItem = { label: "Sparkling Franchise Leads", href: "/client/franchise-leads" };

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
      FRANCHISE_ITEM,
    ],
  },
];

// ARQUD agency workspace — the full command center.
const ADMIN_GROUPS: readonly NavGroup[] = [
  {
    heading: "Workspace",
    items: [
      { label: "Home", href: "/admin/overview" },
      { label: "Clients", href: "/admin/clients" },
      { label: "Campaigns", href: "/admin/campaigns" },
      { label: "Franchise Leads", href: "/admin/franchise-leads" },
    ],
  },
  {
    heading: "Run the business",
    items: [
      { label: "Tasks", href: "/admin/tasks" },
      { label: "Calendar", href: "/admin/calendar" },
      { label: "Proposals", href: "/admin/proposals" },
      { label: "Finances", href: "/admin/finances" },
      { label: "Files", href: "/admin/files" },
      { label: "Settings", href: "/admin/settings" },
    ],
  },
];

// SA Equipment workspace — its own focused home. No leads/campaigns (a dealer, not
// an agency). Finances is shared: it's the one company's books, reached from here too.
const SAE_GROUPS: readonly NavGroup[] = [
  {
    heading: "Workspace",
    items: [
      { label: "Home", href: "/admin/overview" },
      { label: "Customers", href: "/admin/clients" },
      { label: "Proposals", href: "/admin/proposals" },
    ],
  },
  {
    heading: "Run the business",
    items: [
      { label: "Finances", href: "/admin/finances" },
      { label: "Settings", href: "/admin/settings" },
    ],
  },
];

type SidebarProps = {
  variant: "client" | "admin";
  brandName: string;
  user: { name: string; label: string };
  // Client nav scope, derived from profiles.brand (see navModeForBrand):
  //   'full'          → Arno: the complete client nav (incl. the franchise item)
  //   'leadsOnly'     → wash staff: just the Leads page
  //   'franchiseOnly' → Marissa: just the Sparkling Franchise Leads page
  navMode?: NavMode;
  // Admin only: which business workspace is active. Drives the brand, nav and theme.
  business?: BusinessKey;
};

export function Sidebar({ variant, brandName, user, navMode = "full", business = "arqud" }: SidebarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isSae = variant === "admin" && business === "sa_equipment";

  const clientGroups: readonly NavGroup[] =
    navMode === "leadsOnly"
      ? [{ heading: "Menu", items: [{ label: "Leads", href: "/client/leads" }] }]
      : navMode === "franchiseOnly"
        ? [{ heading: "Menu", items: [FRANCHISE_ITEM] }]
        : CLIENT_GROUPS;
  const adminGroups = isSae ? SAE_GROUPS : ADMIN_GROUPS;
  const groups = variant === "client" ? clientGroups : adminGroups;
  const clientHome =
    navMode === "franchiseOnly" ? "/client/franchise-leads" : navMode === "leadsOnly" ? "/client/leads" : "/client/dashboard";
  const homeHref = variant === "client" ? clientHome : "/admin/overview";
  const initials = user.name.charAt(0).toUpperCase() || "?";
  const mobileWord = isSae ? "SA EQUIPMENT" : "ARQUD";

  const itemBox = "flex items-center gap-[11px] text-[13px] px-3 py-[10px] rounded-control transition-colors duration-150";
  const iconBox = "w-4 h-4 rounded-[5px] border-[1.5px] shrink-0";

  // ARQUD keeps its filled-gold active state; SA Equipment gets a refined light-
  // premium treatment (faint amber wash + amber text) that reads cleanly on cream.
  const activeItem = isSae
    ? "bg-arqud-gold/12 text-arqud-gold font-semibold"
    : "bg-gradient-to-r from-arqud-gold to-arqud-gold-soft text-arqud-bg font-semibold shadow-[0_6px_18px_rgba(200,169,110,0.25)]";
  const activeIcon = isSae ? "border-arqud-gold bg-arqud-gold/25" : "border-arqud-bg bg-arqud-bg/25";

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
                className={cn(itemBox, isActive ? activeItem : "text-arqud-bone-dim hover:bg-arqud-gold/5 hover:text-arqud-bone")}
              >
                <span
                  className={cn(iconBox, isActive ? activeIcon : "border-current opacity-70")}
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
        <Link href={homeHref} className={cn("font-display text-arqud-gold", isSae ? "text-sm tracking-[0.14em]" : "text-lg tracking-[0.28em]")}>
          {mobileWord}
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
          "w-[228px] shrink-0 flex flex-col bg-gradient-to-b from-arqud-bg-2 to-arqud-bg border-r border-arqud-line p-4",
          // The admin drawer leads with the workspace switcher; on mobile it must clear
          // the fixed 56px top bar (z-50) so the switcher isn't tucked behind it. Desktop
          // (md:static, no top bar) keeps the original pt-6. Client drawer is unchanged.
          variant === "admin" ? "pt-[72px] md:pt-6" : "pt-6",
          "fixed inset-y-0 left-0 z-40 transition-transform duration-200 md:static md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {variant === "admin" ? (
          <BusinessSwitcher current={business} />
        ) : (
          <Link href={homeHref} className="group block px-2 pb-[22px]">
            <span className="block font-display text-[20px] tracking-[0.3em] text-arqud-gold group-hover:text-arqud-gold-soft transition-colors duration-150">
              ARQUD
            </span>
            <span className="mt-2 block text-[10px] uppercase tracking-[0.12em] text-arqud-muted leading-snug line-clamp-2">
              {brandName}
            </span>
          </Link>
        )}

        {navList}

        <div className="mt-auto pt-2.5 border-t border-arqud-line">
          <div className="flex items-center gap-2.5">
            <Avatar initials={initials} />
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] text-arqud-bone leading-tight truncate">{user.name}</p>
              <p className="text-[10.5px] text-arqud-muted leading-tight truncate">{user.label}</p>
            </div>
            {/* SA Equipment is a fixed light-premium brand — no dark/light toggle there. */}
            {!isSae && <ThemeToggle />}
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
