import { Card, Input, Button } from "@/components/ui";
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
    <div
      className="relative flex min-h-screen items-center justify-center px-4"
      style={{ background: "radial-gradient(ellipse 80% 60% at 50% 0%, var(--color-arqud-bg-2), var(--color-arqud-bg))" }}
    >
      <div className="relative w-full max-w-sm space-y-8 animate-fade-up">
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

        <Card className="p-6 space-y-4">
          <form action={updatePassword} className="space-y-4">
            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-xs uppercase tracking-widest text-arqud-muted"
              >
                New password
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                className="w-full"
                placeholder="At least 8 characters"
              />
            </div>
            <div>
              <label
                htmlFor="confirm"
                className="mb-1.5 block text-xs uppercase tracking-widest text-arqud-muted"
              >
                Confirm password
              </label>
              <Input
                id="confirm"
                name="confirm"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                className="w-full"
                placeholder="Repeat your new password"
              />
            </div>
            <Button type="submit" className="w-full justify-center">
              Set new password
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
