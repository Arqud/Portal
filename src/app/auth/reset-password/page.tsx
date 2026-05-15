import { updatePassword } from "./actions";

type SearchParams = Promise<{ error?: string }>;

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const error = params.error;

  const errorMessages: Record<string, string> = {
    mismatch: "Passwords do not match.",
    too_short: "Password must be at least 8 characters.",
    failed: "Could not update password. The link may have expired — request a new one.",
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-arqud-black px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <p className="font-display text-4xl tracking-[0.25em] text-arqud-gold">ARQUD</p>
          <p className="mt-2 text-sm uppercase tracking-widest text-arqud-muted">
            Set new password
          </p>
        </div>

        {error && (
          <p className="text-center text-sm text-red-400">
            {errorMessages[error] ?? "Something went wrong."}
          </p>
        )}

        <form action={updatePassword} className="space-y-4">
          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-xs uppercase tracking-widest text-arqud-muted"
            >
              New password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full border border-arqud-ink bg-arqud-night px-4 py-3 text-arqud-bone placeholder-arqud-muted focus:border-arqud-gold focus:outline-none"
              placeholder="At least 8 characters"
            />
          </div>
          <div>
            <label
              htmlFor="confirm"
              className="mb-1 block text-xs uppercase tracking-widest text-arqud-muted"
            >
              Confirm password
            </label>
            <input
              id="confirm"
              name="confirm"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full border border-arqud-ink bg-arqud-night px-4 py-3 text-arqud-bone placeholder-arqud-muted focus:border-arqud-gold focus:outline-none"
              placeholder="Repeat your new password"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-arqud-gold py-3 text-sm font-semibold uppercase tracking-widest text-arqud-black hover:bg-arqud-gold-soft"
          >
            Set new password
          </button>
        </form>
      </div>
    </div>
  );
}
