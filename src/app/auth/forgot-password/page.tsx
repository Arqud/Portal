import { Card, Input, Button } from "@/components/ui";
import { requestPasswordReset } from "./actions";

type SearchParams = Promise<{ sent?: string }>;

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;

  if (params.sent) {
    return (
      <div
        className="relative flex min-h-screen items-center justify-center px-4"
        style={{ background: "radial-gradient(ellipse 80% 60% at 50% 0%, var(--color-arqud-bg-2), var(--color-arqud-bg))" }}
      >
        <div className="relative w-full max-w-sm space-y-6 text-center animate-fade-up">
          <p className="font-display text-4xl tracking-[0.25em] text-arqud-gold">
            ARQUD
          </p>
          <Card className="p-8 space-y-4">
            <p className="text-arqud-bone">Check your inbox</p>
            <p className="text-sm text-arqud-muted">
              If that email is registered, a reset link has been sent. Check
              your spam folder too.
            </p>
          </Card>
          <a
            href="/login"
            className="block text-xs uppercase tracking-widest text-arqud-muted hover:text-arqud-gold transition-colors"
          >
            Back to sign in
          </a>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative flex min-h-screen items-center justify-center px-4"
      style={{ background: "radial-gradient(ellipse 80% 60% at 50% 0%, var(--color-arqud-bg-2), var(--color-arqud-bg))" }}
    >
      <div className="relative w-full max-w-sm space-y-8 animate-fade-up">
        <div className="text-center">
          <p className="font-display text-4xl tracking-[0.25em] text-arqud-gold">
            ARQUD
          </p>
          <p className="mt-2 text-sm uppercase tracking-widest text-arqud-muted">
            Reset password
          </p>
        </div>

        <Card className="p-6 space-y-4">
          <form action={requestPasswordReset} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-xs uppercase tracking-widest text-arqud-muted"
              >
                Your email address
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="w-full"
                placeholder="your@email.com"
              />
            </div>
            <Button type="submit" className="w-full justify-center">
              Send reset link
            </Button>
          </form>
        </Card>

        <p className="text-center">
          <a
            href="/login"
            className="text-xs uppercase tracking-widest text-arqud-muted hover:text-arqud-gold transition-colors"
          >
            Back to sign in
          </a>
        </p>
      </div>
    </div>
  );
}
