// Authentication for the inbound lead webhook. This endpoint fires real SMS to
// real customers, so it MUST fail closed: a request is processed only when it
// proves it came from someone we trust. Two callers are legitimate today —
// Meta posting natively (signed), and Make.com forwarding on our behalf (which
// cannot sign, so it carries a shared token instead).

import { signBody } from "@/lib/leads/forward";

/** Header Make.com (or any trusted forwarder) presents instead of a signature. */
export const INGEST_TOKEN_HEADER = "x-arqud-ingest-token";

/** Header Meta signs its native deliveries with. */
export const META_SIGNATURE_HEADER = "x-hub-signature-256";

/**
 * Constant-time string comparison via double-HMAC.
 *
 * Both values are hashed under a single-use random key before being compared,
 * so the comparison always runs over two equal, fixed-length digests. This is
 * what `===` cannot give us: a plain compare exits at the first differing byte,
 * and that timing difference is enough to recover a secret one byte at a time.
 * Hashing first also means the comparison leaks nothing about the secret's
 * length, which a bare length check would.
 */
async function safeEqual(a: string, b: string): Promise<boolean> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    crypto.getRandomValues(new Uint8Array(32)),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const [da, db] = await Promise.all([
    crypto.subtle.sign("HMAC", key, enc.encode(a)),
    crypto.subtle.sign("HMAC", key, enc.encode(b)),
  ]);
  const va = new Uint8Array(da);
  const vb = new Uint8Array(db);
  let diff = 0;
  for (let i = 0; i < va.length; i++) diff |= va[i] ^ vb[i];
  return diff === 0;
}

/**
 * Path A — verify Meta's `x-hub-signature-256` as HMAC-SHA256 over the EXACT raw
 * body. Re-serialising the parsed JSON would change bytes and break the digest,
 * which is why the caller must hand us the untouched string.
 *
 * An empty secret verifies nothing: without a key there is no proof to check, so
 * the only safe answer is false.
 */
export async function verifyMetaSignature(
  rawBody: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  if (!secret || !signature) return false;
  return safeEqual(await signBody(rawBody, secret), signature);
}

/**
 * Decide whether an inbound webhook request is authentic.
 *
 * Either path is sufficient, neither is required to be configured — but if no
 * path validates the answer is false. That last clause is the whole point: the
 * previous implementation skipped verification entirely when the secret was
 * unset, which left the endpoint open to anyone who knew the URL. Secrets are
 * read per-call rather than at module load so a value added in the host's
 * environment takes effect on the next request, not the next cold start.
 */
export async function authorizeIngest(rawBody: string, headers: Headers): Promise<boolean> {
  const appSecret = process.env.META_APP_SECRET ?? "";
  const makeToken = process.env.MAKE_INGEST_TOKEN ?? "";

  const signature = headers.get(META_SIGNATURE_HEADER) ?? "";
  if (appSecret && signature && (await verifyMetaSignature(rawBody, signature, appSecret))) {
    return true;
  }

  const presented = headers.get(INGEST_TOKEN_HEADER) ?? "";
  if (makeToken && presented && (await safeEqual(presented, makeToken))) {
    return true;
  }

  return false;
}
