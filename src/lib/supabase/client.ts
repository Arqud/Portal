import { createBrowserClient } from "@supabase/ssr";

export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url) {
    throw new Error(
      "Missing env var NEXT_PUBLIC_SUPABASE_URL — set it in .env.local",
    );
  }
  if (!anonKey) {
    throw new Error(
      "Missing env var NEXT_PUBLIC_SUPABASE_ANON_KEY — set it in .env.local",
    );
  }

  return createBrowserClient(url, anonKey);
}
