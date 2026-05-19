import { headers } from "next/headers";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { signInWithPassword, sendMagicLink } from "./actions";

type SearchParams = Promise<{
  error?: string;
  magic?: string;
  email?: string;
  next?: string;
}>;

async function getSubdomainBranding() {
  const headersList = await headers();
  const host = headersList.get("host") ?? "";
  const subdomain = host.split(".")[0];

  if (!subdomain || subdomain === "arqudportal" || subdomain === "www" || subdomain === "localhost:3000" || subdomain === "localhost") {
    return { wordmark: "ARQUD", tagline: "Sign in to your portal", isClient: false };
  }

  const admin = createSupabaseAdminClient();
  const { data: client } = await admin
    .from("clients")
    .select("company, name")
    .eq("subdomain_slug", subdomain)
    .single();

  if (client) {
    const name = (client.company ?? client.name).toUpperCase();
    return { wordmark: name, tagline: "Sign in to your client portal", isClient: true };
  }

  return { wordmark: "ARQUD", tagline: "Sign in to your portal", isClient: false };
}

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const error = params.error;
  const magicSent = params.magic === "sent";
  const sentToEmail = params.email ? decodeURIComponent(params.email) : "";
  const next = params.next ?? "";
  const { wordmark, tagline } = await getSubdomainBranding();

  return (
    <div
      className="relative flex min-h-screen items-center justify-center px-4"
      style={{ background: "var(--color-arqud-black)" }}
    >
      {/* Atmospheric glow */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: "20%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "600px",
          height: "400px",
          borderRadius: "50%",
          background: "radial-gradient(ellipse, rgba(200,169,110,0.06) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div className="relative w-full max-w-sm space-y-8 animate-fade-up">
        {/* Wordmark */}
        <div className="text-center space-y-2">
          <p
            className="font-display text-5xl text-arqud-gold"
            style={{ letterSpacing: "0.25em" }}
          >
            {wordmark}
          </p>
          <p className="text-xs uppercase tracking-widest text-arqud-muted">{tagline}</p>
        </div>

        {magicSent ? (
          <div className="card p-6 text-center space-y-4">
            <p className="text-arqud-bone text-sm">
              Check your inbox — we sent a sign-in link to{" "}
              <span className="text-arqud-gold">{sentToEmail}</span>.
            </p>
            <a
              href="/login"
              className="text-xs uppercase tracking-widest text-arqud-muted hover:text-arqud-gold transition-colors"
            >
              ← Back to sign in
            </a>
          </div>
        ) : (
          <div className="space-y-6">
            {(error === "invalid_credentials" || error === "no_profile" || error === "server_error") && (
              <p className="text-center text-xs uppercase tracking-widest text-red-400">
                {error === "invalid_credentials" && "Email or password incorrect."}
                {error === "no_profile" && "Account not set up. Contact support."}
                {error === "server_error" && "Server error — please try again."}
              </p>
            )}

            {/* Password sign-in */}
            <div className="card p-6 space-y-4">
              <p className="text-xs uppercase tracking-widest text-arqud-muted">Sign in with password</p>
              <form action={signInWithPassword} className="space-y-4">
                <input type="hidden" name="next" value={next} />
                <div>
                  <label htmlFor="email-pw" className="mb-1.5 block text-xs uppercase tracking-widest text-arqud-muted">
                    Email
                  </label>
                  <input
                    id="email-pw"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    className="w-full border border-arqud-ink bg-arqud-night px-4 py-3 text-arqud-bone placeholder-arqud-muted focus:border-arqud-gold focus:outline-none transition-colors"
                    placeholder="you@example.com"
                  />
                </div>
                <div>
                  <label htmlFor="password" className="mb-1.5 block text-xs uppercase tracking-widest text-arqud-muted">
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    autoComplete="current-password"
                    className="w-full border border-arqud-ink bg-arqud-night px-4 py-3 text-arqud-bone placeholder-arqud-muted focus:border-arqud-gold focus:outline-none transition-colors"
                    placeholder="••••••••"
                  />
                </div>
                <button type="submit" className="btn-gold w-full justify-center">
                  Sign in
                </button>
              </form>
              <p className="text-center">
                <a
                  href="/auth/forgot-password"
                  className="text-xs uppercase tracking-widest text-arqud-muted hover:text-arqud-gold transition-colors"
                >
                  Forgot password?
                </a>
              </p>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-4">
              <div className="h-px flex-1" style={{ background: "var(--color-arqud-ink)" }} />
              <span className="text-xs uppercase tracking-widest text-arqud-muted">or</span>
              <div className="h-px flex-1" style={{ background: "var(--color-arqud-ink)" }} />
            </div>

            {/* Magic link */}
            <form action={sendMagicLink} className="space-y-4">
              <input type="hidden" name="next" value={next} />
              <div>
                <label htmlFor="email-ml" className="mb-1.5 block text-xs uppercase tracking-widest text-arqud-muted">
                  Email
                </label>
                <input
                  id="email-ml"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  className="w-full border border-arqud-ink bg-arqud-night px-4 py-3 text-arqud-bone placeholder-arqud-muted focus:border-arqud-gold focus:outline-none transition-colors"
                  placeholder="you@example.com"
                />
              </div>
              <button type="submit" className="btn-outline w-full justify-center hover:text-arqud-bone">
                Send magic link
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
