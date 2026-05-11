type AgencySection =
  | "Overview"
  | "Clients"
  | "Campaigns"
  | "Finances"
  | "Files";

type ClientSection =
  | "Dashboard"
  | "Campaigns"
  | "Invoices"
  | "Reports"
  | "Documents";

const AGENCY_SECTIONS: AgencySection[] = [
  "Overview",
  "Clients",
  "Campaigns",
  "Finances",
  "Files",
];

const CLIENT_SECTIONS: ClientSection[] = [
  "Dashboard",
  "Campaigns",
  "Invoices",
  "Reports",
  "Documents",
];

type TopNavProps =
  | { variant: "agency"; brandName?: never }
  | { variant: "client"; brandName: string };

export function TopNav(props: TopNavProps) {
  const sections =
    props.variant === "agency" ? AGENCY_SECTIONS : CLIENT_SECTIONS;
  const wordmark = props.variant === "agency" ? "ARQUD" : props.brandName;

  return (
    <nav
      aria-label="Primary"
      className="flex items-center justify-between border-b border-arqud-ink bg-arqud-night px-8 py-4"
    >
      <div className="text-2xl tracking-[0.25em] text-arqud-gold">
        {wordmark}
      </div>
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
    </nav>
  );
}
