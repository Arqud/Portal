import Link from "next/link";

type AgencySection = "Overview" | "Clients" | "Campaigns" | "Finances" | "Files";
type ClientSection = "Dashboard" | "Campaigns" | "Invoices" | "Reports" | "Documents";

const AGENCY_ROUTES: Record<AgencySection, string> = {
  Overview: "/admin/overview",
  Clients: "/admin/clients",
  Campaigns: "/admin/campaigns",
  Finances: "/admin/finances",
  Files: "/admin/files",
};

const CLIENT_ROUTES: Record<ClientSection, string> = {
  Dashboard: "/client/dashboard",
  Campaigns: "/client/campaigns",
  Invoices: "/client/invoices",
  Reports: "/client/reports",
  Documents: "/client/documents",
};

const AGENCY_SECTIONS: AgencySection[] = ["Overview", "Clients", "Campaigns", "Finances", "Files"];
const CLIENT_SECTIONS: ClientSection[] = ["Dashboard", "Campaigns", "Invoices", "Reports", "Documents"];

type UserPill = { name: string; label: string };

type TopNavProps =
  | { variant: "agency"; brandName?: never; user?: UserPill }
  | { variant: "client"; brandName: string; user?: UserPill };

export function TopNav(props: TopNavProps) {
  const sections = props.variant === "agency" ? AGENCY_SECTIONS : CLIENT_SECTIONS;
  const routes = props.variant === "agency" ? AGENCY_ROUTES : CLIENT_ROUTES;
  const wordmark = props.variant === "agency" ? "ARQUD" : props.brandName;
  const homeRoute = props.variant === "agency" ? "/admin/overview" : "/client/dashboard";

  return (
    <nav
      aria-label="Primary"
      className="flex items-center justify-between border-b border-arqud-ink bg-arqud-night px-8 py-4"
    >
      <Link
        href={homeRoute}
        className="text-2xl tracking-[0.25em] text-arqud-gold hover:text-arqud-gold-soft"
      >
        {wordmark}
      </Link>
      <ul className="flex gap-8">
        {sections.map((section) => (
          <li key={section}>
            <Link
              href={routes[section as keyof typeof routes]}
              className="text-sm uppercase tracking-widest text-arqud-bone hover:text-arqud-gold"
            >
              {section}
            </Link>
          </li>
        ))}
      </ul>
      {props.user && (
        <div className="flex items-center gap-4">
          <span className="text-sm text-arqud-bone">
            {props.user.name} · {props.user.label}
          </span>
          <form action="/logout" method="POST">
            <button
              type="submit"
              className="text-sm uppercase tracking-widest text-arqud-muted hover:text-arqud-gold"
            >
              Logout
            </button>
          </form>
        </div>
      )}
    </nav>
  );
}
