type AgencySection = "Overview" | "Clients" | "Campaigns" | "Finances" | "Files";
type ClientSection = "Dashboard" | "Campaigns" | "Invoices" | "Reports" | "Documents";

const AGENCY_SECTIONS: AgencySection[] = ["Overview", "Clients", "Campaigns", "Finances", "Files"];
const CLIENT_SECTIONS: ClientSection[] = ["Dashboard", "Campaigns", "Invoices", "Reports", "Documents"];

type UserPill = { name: string; label: string };

type TopNavProps =
  | { variant: "agency"; brandName?: never; user?: UserPill }
  | { variant: "client"; brandName: string; user?: UserPill };

export function TopNav(props: TopNavProps) {
  const sections = props.variant === "agency" ? AGENCY_SECTIONS : CLIENT_SECTIONS;
  const wordmark = props.variant === "agency" ? "ARQUD" : props.brandName;

  return (
    <nav
      aria-label="Primary"
      className="flex items-center justify-between border-b border-arqud-ink bg-arqud-night px-8 py-4"
    >
      <div className="text-2xl tracking-[0.25em] text-arqud-gold">{wordmark}</div>
      <ul className="flex gap-8">
        {sections.map((section) => (
          <li
            key={section}
            className="cursor-pointer text-sm uppercase tracking-widest text-arqud-bone hover:text-arqud-gold"
          >
            {section}
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
