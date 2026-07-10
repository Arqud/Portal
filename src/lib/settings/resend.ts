import { getSetting } from "./query";

// The Vercel env var is the primary source, but this project has a history of
// UI-added env vars silently never reaching the runtime (ICAL_FEED_TOKEN, and
// on 2026-07-10 RESEND_API_KEY itself — lead emails died in prod). app_settings
// is the app's proven secret store (lead_forward_secret lives there), so it
// backstops the env var. Never log the returned value — only its source.
export async function getResendApiKey(): Promise<string | null> {
  return process.env.RESEND_API_KEY?.trim() || (await getSetting("resend_api_key"))?.trim() || null;
}
