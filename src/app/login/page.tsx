import { signInWithPassword, sendMagicLink } from "./actions";

type SearchParams = Promise<{
  error?: string;
  magic?: string;
  email?: string;
  next?: string;
}>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const error = params.error;
  const magicSent = params.magic === "sent";
  const sentToEmail = params.email ? decodeURIComponent(params.email) : "";
  const next = params.next ?? "";

  return (
    <div className="flex min-h-screen items-center justify-center bg-arqud-black px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <p className="font-display text-4xl tracking-[0.25em] text-arqud-gold">ARQUD</p>
          <p className="mt-2 text-sm uppercase tracking-widest text-arqud-muted">
            Sign in to your portal
          </p>
        </div>

        {magicSent ? (
          <div className="rounded border border-arqud-ink bg-arqud-night p-6 text-center">
            <p className="text-arqud-bone">
              Check your inbox — we sent a sign-in link to{" "}
              <span className="text-arqud-gold">{sentToEmail}</span>.
            </p>
            <a
              href="/login"
              className="mt-4 inline-block text-sm text-arqud-muted hover:text-arqud-gold"
            >
              Back to sign in
            </a>
          </div>
        ) : (
          <div className="space-y-6">
            {error === "invalid_credentials" && (
              <p className="text-center text-sm text-red-400">
                Email or password incorrect.
              </p>
            )}
            {error === "no_profile" && (
              <p className="text-center text-sm text-red-400">
                Account not fully set up — profile missing. Contact support.
              </p>
            )}
            {error === "server_error" && (
              <p className="text-center text-sm text-red-400">
                Server error — please try again in a moment.
              </p>
            )}

            <form action={signInWithPassword} className="space-y-4">
              <input type="hidden" name="next" value={next} />
              <div>
                <label
                  htmlFor="email-pw"
                  className="mb-1 block text-xs uppercase tracking-widest text-arqud-muted"
                >
                  Email
                </label>
                <input
                  id="email-pw"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  className="w-full border border-arqud-ink bg-arqud-night px-4 py-3 text-arqud-bone placeholder-arqud-muted focus:border-arqud-gold focus:outline-none"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label
                  htmlFor="password"
                  className="mb-1 block text-xs uppercase tracking-widest text-arqud-muted"
                >
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  className="w-full border border-arqud-ink bg-arqud-night px-4 py-3 text-arqud-bone placeholder-arqud-muted focus:border-arqud-gold focus:outline-none"
                  placeholder="••••••••"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-arqud-gold py-3 text-sm font-semibold uppercase tracking-widest text-arqud-black hover:bg-arqud-gold-soft"
              >
                Sign in
              </button>
            </form>

            <div className="flex items-center gap-4">
              <div className="h-px flex-1 bg-arqud-ink" />
              <span className="text-xs uppercase tracking-widest text-arqud-muted">or</span>
              <div className="h-px flex-1 bg-arqud-ink" />
            </div>

            <form action={sendMagicLink} className="space-y-4">
              <input type="hidden" name="next" value={next} />
              <div>
                <label
                  htmlFor="email-ml"
                  className="mb-1 block text-xs uppercase tracking-widest text-arqud-muted"
                >
                  Email
                </label>
                <input
                  id="email-ml"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  className="w-full border border-arqud-ink bg-arqud-night px-4 py-3 text-arqud-bone placeholder-arqud-muted focus:border-arqud-gold focus:outline-none"
                  placeholder="you@example.com"
                />
              </div>
              <button
                type="submit"
                className="w-full border border-arqud-gold py-3 text-sm font-semibold uppercase tracking-widest text-arqud-gold hover:bg-arqud-gold hover:text-arqud-black"
              >
                Send magic link
              </button>
            </form>

            <p className="text-center text-sm">
              <a
                href="/auth/forgot-password"
                className="text-arqud-muted hover:text-arqud-gold"
              >
                Forgot password?
              </a>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
