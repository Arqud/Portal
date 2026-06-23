import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — ARQUD Portal",
  description:
    "How ARQUD (PTY) LTD collects, uses, and protects personal information submitted through lead forms and the ARQUD client portal.",
};

const UPDATED = "23 June 2026";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="font-display text-2xl text-arqud-gold">{title}</h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-arqud-bone-dim">{children}</div>
    </section>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <main
      className="min-h-screen px-6 py-16"
      style={{ background: "radial-gradient(ellipse 80% 60% at 50% 0%, var(--color-arqud-bg-2), var(--color-arqud-bg))" }}
    >
      <article className="mx-auto w-full max-w-2xl space-y-10 animate-fade-up">
        <header className="space-y-3 border-b border-arqud-line pb-8">
          <Link href="/" className="font-display text-3xl tracking-[0.25em] text-arqud-gold">
            ARQUD
          </Link>
          <h1 className="font-display text-4xl text-arqud-bone">Privacy Policy</h1>
          <p className="text-xs uppercase tracking-widest text-arqud-muted">Last updated {UPDATED}</p>
        </header>

        <Section title="Who we are">
          <p>
            This Privacy Policy explains how <strong className="text-arqud-bone">ARQUD (PTY) LTD</strong> (&ldquo;ARQUD&rdquo;,
            &ldquo;we&rdquo;, &ldquo;us&rdquo;) collects and handles your personal information. ARQUD operates this portal
            (arqudportal.co.za) and runs digital marketing and lead-generation campaigns on behalf of its business clients.
          </p>
          <p>
            When you submit an enquiry through one of our advertising forms (for example a Facebook or Instagram lead form for a
            client such as We Wash Cars or Sparkling Auto Care Centres), your details are collected by ARQUD and shared with that
            specific business so they can respond to you.
          </p>
        </Section>

        <Section title="Information we collect">
          <p>When you complete a lead form or contact us, we may collect:</p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>Your name</li>
            <li>Your mobile / WhatsApp number</li>
            <li>Your email address (where provided)</li>
            <li>The branch or location you select</li>
            <li>The service or package you are interested in</li>
          </ul>
          <p>
            We do not collect payment card details, ID numbers, or other sensitive information through these lead forms.
          </p>
        </Section>

        <Section title="How we use your information">
          <p>We use the information you provide only to:</p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>Contact you by phone, WhatsApp, or email to respond to your enquiry and book your service</li>
            <li>Route your enquiry to the branch closest to you</li>
            <li>Keep a record of your enquiry for the relevant business</li>
          </ul>
          <p>
            We rely on your consent, given when you submit the form, as the lawful basis for processing your information under the
            Protection of Personal Information Act, 2013 (POPIA).
          </p>
        </Section>

        <Section title="Who we share it with">
          <p>
            Your details are shared with the specific business whose advertisement you responded to, so that their team can contact
            you. We use trusted service providers (such as Meta Platforms and our lead-routing and hosting providers) to deliver
            ads and process form submissions. We do not sell your personal information to anyone.
          </p>
        </Section>

        <Section title="How long we keep it">
          <p>
            We keep your enquiry information only as long as needed to respond to you and to meet legitimate business and legal
            requirements. You can ask us to delete your information at any time using the contact details below.
          </p>
        </Section>

        <Section title="Your rights">
          <p>Under POPIA you have the right to:</p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>Request access to the personal information we hold about you</li>
            <li>Ask us to correct or update it</li>
            <li>Ask us to delete it</li>
            <li>Object to or withdraw your consent to its processing</li>
          </ul>
          <p>To exercise any of these rights, contact us using the details below.</p>
        </Section>

        <Section title="Contact us">
          <p>
            For any privacy questions or requests, email{" "}
            <a href="mailto:info@arqud.com" className="text-arqud-gold hover:text-arqud-gold-soft transition-colors">
              info@arqud.com
            </a>
            .
          </p>
        </Section>

        <footer className="border-t border-arqud-line pt-8">
          <p className="text-xs text-arqud-muted">© {new Date().getFullYear()} ARQUD (PTY) LTD. All rights reserved.</p>
        </footer>
      </article>
    </main>
  );
}
