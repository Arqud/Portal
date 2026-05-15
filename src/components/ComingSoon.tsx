type ComingSoonProps = {
  section: string;
  phase: number;
  bullets: string[];
};

export function ComingSoon({ section, phase, bullets }: ComingSoonProps) {
  return (
    <main className="min-h-screen px-8 py-16">
      <h1 className="text-5xl tracking-wide">{section}</h1>
      <p className="mt-4 text-sm uppercase tracking-widest text-arqud-gold">
        Coming Soon — Phase {phase}
      </p>
      <ul className="mt-8 space-y-3">
        {bullets.map((bullet) => (
          <li key={bullet} className="flex items-start gap-3 text-arqud-bone">
            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-arqud-gold" />
            {bullet}
          </li>
        ))}
      </ul>
    </main>
  );
}
