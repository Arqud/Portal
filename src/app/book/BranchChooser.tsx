// Shared layout for the /book/* branch chooser pages. Meta lead-form ending
// screens link here: the visitor has JUST submitted a lead form, so the page's
// only job is one tap → their branch's HighLevel booking calendar. Static server
// component, plain anchors (same-tab — in-app webviews handle that best), no JS.

export type Branch = {
  name: string;
  area?: string;
  url: string;
};

type Accent = "gold" | "blue";

// Full literal class names per accent — Tailwind can't see dynamically-built
// class strings, so every variant lives here verbatim.
const ACCENT = {
  gold: {
    heading: "text-arqud-gold",
    chevron: "text-arqud-gold",
    cardBorder: "border-arqud-line hover:border-arqud-gold/50 active:border-arqud-gold/50",
    topedge: "gold-topedge",
    footer: "text-arqud-gold",
  },
  blue: {
    heading: "text-arqud-blue",
    chevron: "text-arqud-blue",
    cardBorder: "border-arqud-line hover:border-arqud-blue/50 active:border-arqud-blue/50",
    topedge: "blue-topedge",
    footer: "text-arqud-blue",
  },
} as const satisfies Record<Accent, Record<string, string>>;

export default function BranchChooser({
  accent,
  logoSrc,
  logoAlt,
  heading,
  subline,
  branches,
  footerName,
}: {
  accent: Accent;
  logoSrc: string;
  logoAlt: string;
  heading: React.ReactNode;
  subline: string;
  branches: Branch[];
  footerName: string;
}) {
  const a = ACCENT[accent];
  return (
    <main
      className="flex min-h-screen flex-col"
      style={{ background: "radial-gradient(ellipse 90% 50% at 50% 0%, var(--color-arqud-bg-2), var(--color-arqud-bg))" }}
    >
      <div className="mx-auto w-full max-w-md flex-1 px-5 pt-10 pb-14 sm:pt-14">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoSrc} alt={logoAlt} className="mx-auto mb-7 w-[190px] max-w-[70%]" />

        <h1 className="text-center font-display text-3xl leading-tight text-arqud-bone sm:text-4xl">{heading}</h1>
        <p className="mx-auto mt-3 max-w-sm text-center text-[15px] leading-relaxed text-arqud-bone-dim">{subline}</p>

        <div className="mt-8 flex flex-col gap-3">
          {branches.map((b) => (
            <a
              key={b.url}
              href={b.url}
              className={`relative flex min-h-[64px] items-center justify-between gap-3 overflow-hidden rounded-card border px-5 py-4 panel-gradient transition-colors ${a.topedge} ${a.cardBorder}`}
            >
              <span className="min-w-0">
                <span className="block text-[17px] font-medium leading-snug text-arqud-bone">{b.name}</span>
                {b.area && <span className="mt-0.5 block text-[13px] text-arqud-muted">{b.area}</span>}
              </span>
              <span aria-hidden className={`shrink-0 text-xl ${a.chevron}`}>
                →
              </span>
            </a>
          ))}
        </div>

        <p className="mt-7 text-center text-[13px] text-arqud-muted">
          Tap your branch to pick a time — it takes under a minute.
        </p>
      </div>

      <footer className="border-t border-arqud-line px-5 py-8 text-center">
        <p className={`font-display text-lg tracking-[0.2em] ${a.footer}`}>{footerName}</p>
      </footer>
    </main>
  );
}
