// Unguessable public share token: 32 lowercase hex chars (16 crypto-random
// bytes). The token IS the access control for /p/[token] — no enumeration
// route exists, and the column carries a unique index.
export function generateShareToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
