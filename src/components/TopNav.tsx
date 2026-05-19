"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTransition } from "react";

const AGENCY_ROUTES = {
  Overview: "/admin/overview",
  Clients: "/admin/clients",
  Campaigns: "/admin/campaigns",
  Finances: "/admin/finances",
  Files: "/admin/files",
} as const;

const CLIENT_ROUTES = {
  Dashboard: "/client/dashboard",
  Campaigns: "/client/campaigns",
  Invoices: "/client/invoices",
  Reports: "/client/reports",
  Documents: "/client/documents",
} as const;

type UserPill = { name: string; label: string };
type TopNavProps =
  | { variant: "agency"; brandName?: never; user?: UserPill }
  | { variant: "client"; brandName: string; user?: UserPill };

export function TopNav(props: TopNavProps) {
  const pathname = usePathname();
  const [, start] = useTransition();
  const routes = props.variant === "agency" ? AGENCY_ROUTES : CLIENT_ROUTES;
  const wordmark = props.variant === "agency" ? "ARQUD" : props.brandName;
  const homeRoute = props.variant === "agency" ? "/admin/overview" : "/client/dashboard";

  return (
    <nav
      aria-label="Primary"
      style={{
        backgroundColor: "rgba(6,7,9,0.92)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(30,37,53,0.8)",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      <div className="flex items-center justify-between px-8 h-14">
        {/* Wordmark */}
        <Link
          href={homeRoute}
          className="font-display text-xl tracking-[0.3em] text-arqud-gold hover:text-arqud-gold-soft transition-colors duration-200"
          style={{ letterSpacing: "0.28em" }}
        >
          {wordmark}
        </Link>

        {/* Navigation links */}
        <ul className="flex items-center gap-1">
          {Object.entries(routes).map(([label, href]) => {
            const isActive = pathname.startsWith(href);
            return (
              <li key={label}>
                <Link
                  href={href}
                  className="relative flex items-center px-4 h-14 text-xs tracking-widest uppercase transition-colors duration-200"
                  style={{
                    color: isActive
                      ? "var(--color-arqud-bone)"
                      : "var(--color-arqud-muted)",
                    fontWeight: isActive ? 400 : 300,
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) (e.currentTarget as HTMLElement).style.color = "rgba(240,232,216,0.7)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) (e.currentTarget as HTMLElement).style.color = "var(--color-arqud-muted)";
                  }}
                >
                  {label}
                  {/* Active indicator */}
                  {isActive && (
                    <span
                      className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-arqud-gold"
                      style={{ boxShadow: "0 0 6px var(--color-arqud-gold)" }}
                    />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Right side */}
        {props.user && (
          <div className="flex items-center gap-5">
            {props.variant === "agency" && (
              <Link
                href="/admin/settings"
                className="text-xs uppercase tracking-widest transition-colors duration-200"
                style={{ color: "var(--color-arqud-muted)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--color-arqud-gold)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--color-arqud-muted)"; }}
              >
                Settings
              </Link>
            )}

            {/* User pill */}
            <div
              className="flex items-center gap-3 pl-5"
              style={{ borderLeft: "1px solid rgba(30,37,53,0.8)" }}
            >
              {/* Avatar */}
              <div
                className="flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold flex-shrink-0"
                style={{
                  background: "linear-gradient(135deg, rgba(200,169,110,0.2), rgba(200,169,110,0.05))",
                  border: "1px solid rgba(200,169,110,0.3)",
                  color: "var(--color-arqud-gold)",
                }}
              >
                {props.user.name.charAt(0).toUpperCase()}
              </div>

              <div className="hidden sm:block">
                <p className="text-xs text-arqud-bone leading-none">{props.user.name}</p>
                <p className="text-xs mt-0.5 leading-none" style={{ color: "var(--color-arqud-gold-dim)" }}>
                  {props.user.label}
                </p>
              </div>

              <form action="/logout" method="POST" className="ml-1">
                <button
                  type="submit"
                  className="text-xs uppercase tracking-widest transition-colors duration-200"
                  style={{ color: "var(--color-arqud-muted)" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#f87171"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--color-arqud-muted)"; }}
                >
                  Out
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
