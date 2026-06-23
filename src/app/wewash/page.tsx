import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "We Wash Cars — Premium Mobile Valet",
  description:
    "Premium car valet from We Wash Cars. Choose your nearest branch and we'll call you to book — Four of a Kind (R599) and Royal Flush (R999).",
};

const PACKAGES = [
  {
    name: "Four of a Kind",
    price: "R599",
    tagline: "The complete valet",
    items: [
      "Interior clean & vacuum",
      "Leather treatment",
      "Full exterior wash",
      "Tyre shine",
      "Drying & 2-stage polish",
    ],
  },
  {
    name: "Royal Flush",
    price: "R999",
    tagline: "The full detail",
    items: [
      "Everything in Four of a Kind",
      "Engine wash",
      "Chassis wash",
      "Showroom finish inside & out",
    ],
    feature: true,
  },
];

const STEPS = [
  { n: "1", title: "Choose your branch", text: "Pick the We Wash branch closest to you on our ad." },
  { n: "2", title: "We call or WhatsApp you", text: "Your nearest branch reaches out to confirm a time that suits you." },
  { n: "3", title: "We make it sparkle", text: "Sit back — your car gets the treatment it deserves." },
];

const BRANCHES = [
  "Eldo Glen (Centurion)",
  "Old Farm Road / Faerie Glen (Pretoria)",
  "Sunnyside (Pretoria)",
  "Greenhills (Randfontein)",
  "Maraisburg (Roodepoort)",
  "Sunward (Boksburg)",
  "Lagoon / Stamford Hill (Durban)",
];

export default function WeWashLandingPage() {
  return (
    <main className="min-h-screen overflow-hidden">
      {/* Hero */}
      <section
        className="relative px-5 pt-16 pb-20 text-center sm:pt-24 sm:pb-28"
        style={{ background: "radial-gradient(ellipse 90% 60% at 50% 0%, var(--color-arqud-bg-2), var(--color-arqud-bg))" }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[14%] h-[360px] w-[600px] max-w-[90vw] -translate-x-1/2"
          style={{ background: "radial-gradient(ellipse, rgba(200,169,110,0.10) 0%, transparent 70%)" }}
        />
        <div className="relative mx-auto max-w-2xl animate-fade-up">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/wewash-logo.png" alt="We Wash Cars" className="mx-auto mb-8 w-[280px] max-w-[80%] sm:w-[340px]" />
          <p className="text-xs uppercase tracking-[0.28em] text-arqud-muted">Premium Mobile Valet</p>
          <h1 className="mt-4 font-display text-4xl leading-tight text-arqud-bone sm:text-6xl">
            Your car deserves<br />the <span className="text-arqud-gold">Four of a Kind</span>
          </h1>
          <p className="mx-auto mt-5 max-w-lg text-[15px] leading-relaxed text-arqud-bone-dim">
            A showroom-quality valet from your nearest We Wash branch — inside and out. Pick your branch from our ad
            and we&apos;ll call you to book.
          </p>
          <div className="mt-8 inline-flex items-center gap-2 rounded-control border border-arqud-line bg-arqud-panel/60 px-5 py-3 text-sm text-arqud-bone-dim">
            <span className="text-arqud-gold">★</span> No payment online — we call you to confirm your booking
          </div>
        </div>
      </section>

      {/* Packages */}
      <section className="px-5 py-16 sm:py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center font-display text-3xl text-arqud-gold sm:text-4xl">Our Packages</h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {PACKAGES.map((p) => (
              <div
                key={p.name}
                className={`relative overflow-hidden rounded-card border p-7 panel-gradient gold-topedge ${
                  p.feature ? "border-arqud-gold/40" : "border-arqud-line"
                }`}
              >
                {p.feature && (
                  <span className="absolute right-5 top-6 rounded-full bg-arqud-gold/15 px-3 py-1 text-[10px] uppercase tracking-widest text-arqud-gold-soft">
                    Most popular
                  </span>
                )}
                <p className="text-xs uppercase tracking-[0.18em] text-arqud-muted">{p.tagline}</p>
                <h3 className="mt-2 font-display text-3xl text-arqud-bone">{p.name}</h3>
                <p className="stat-number mt-3 text-5xl">{p.price}</p>
                <ul className="mt-6 space-y-2.5">
                  {p.items.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-[14px] text-arqud-bone-dim">
                      <span className="mt-0.5 text-arqud-gold">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section
        className="px-5 py-16 sm:py-20"
        style={{ background: "linear-gradient(180deg, transparent, var(--color-arqud-bg-2), transparent)" }}
      >
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center font-display text-3xl text-arqud-gold sm:text-4xl">How it works</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-arqud-gold/40 font-display text-xl text-arqud-gold">
                  {s.n}
                </div>
                <h3 className="mt-4 font-display text-xl text-arqud-bone">{s.title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-arqud-bone-dim">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Branches */}
      <section className="px-5 py-16 sm:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-display text-3xl text-arqud-gold sm:text-4xl">Find your branch</h2>
          <p className="mt-3 text-[15px] text-arqud-bone-dim">Seven locations across South Africa — choose yours on our ad.</p>
          <div className="mt-9 flex flex-wrap justify-center gap-2.5">
            {BRANCHES.map((b) => (
              <span
                key={b}
                className="rounded-control border border-arqud-line bg-arqud-panel/50 px-4 py-2.5 text-[13px] text-arqud-bone-dim"
              >
                {b}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-arqud-line px-5 py-10 text-center">
        <p className="font-display text-xl tracking-[0.2em] text-arqud-gold">WE WASH CARS</p>
        <p className="mt-3 text-xs text-arqud-muted">
          © {new Date().getFullYear()} We Wash Cars ·{" "}
          <a href="/privacy" className="hover:text-arqud-gold transition-colors">
            Privacy Policy
          </a>
        </p>
      </footer>
    </main>
  );
}
