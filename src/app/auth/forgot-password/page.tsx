import { requestPasswordReset } from "./actions";

type SearchParams = Promise<{ sent?: string }>;

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const sent = params.sent === "true";

  return (
    <div className="flex min-h-screen items-center justify-center bg-arqud-black px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <p className="font-display text-4xl tracking-[0.25em] text-arqud-gold">ARQUD</p>
          <p className="mt-2 text-sm uppercase tracking-widest text-arqud-muted">
            Reset your password
          </p>
        </div>

        {sent ? (
          <div className="rounded border border-arqud-ink bg-arqud-night p-6 text-center">
            <p className="text-arqud-bone">
              If that email is in our system, you'll receive a reset link shortly.
            </p>
            <a
              href="/login"
              className="mt-4 inline-block text-sm text-arqud-muted hover:text-arqud-gold"
            >
              Back to sign in
            </a>
          </div>
        ) : (
          <form action={requestPasswordReset} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="mb-1 block text-xs uppercase tracking-widest text-arqud-muted"
              >
                Email
              </label>
              <input
                id="email"
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
              className="w-full bg-arqud-gold py-3 text-sm font-semibold uppercase tracking-widest text-arqud-black hover:bg-arqud-gold-soft"
            >
              Send reset link
            </button>
            <p className="text-center">
              <a href="/login" className="text-sm text-arqud-muted hover:text-arqud-gold">
                Back to sign in
              </a>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
