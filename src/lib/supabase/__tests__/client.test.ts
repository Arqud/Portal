import { describe, expect, it, beforeEach } from "vitest";

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
});

describe("supabase browser client", () => {
  it("creates a client with auth.getSession defined", async () => {
    const { createSupabaseBrowserClient } = await import(
      "@/lib/supabase/client"
    );
    const client = createSupabaseBrowserClient();
    expect(client).toBeDefined();
    expect(typeof client.auth.getSession).toBe("function");
  });

  it("throws a clear error when NEXT_PUBLIC_SUPABASE_URL is missing", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    const { createSupabaseBrowserClient } = await import(
      "@/lib/supabase/client"
    );
    expect(() => createSupabaseBrowserClient()).toThrow(
      /NEXT_PUBLIC_SUPABASE_URL/,
    );
  });

  it("throws a clear error when NEXT_PUBLIC_SUPABASE_ANON_KEY is missing", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const { createSupabaseBrowserClient } = await import(
      "@/lib/supabase/client"
    );
    expect(() => createSupabaseBrowserClient()).toThrow(
      /NEXT_PUBLIC_SUPABASE_ANON_KEY/,
    );
  });
});
