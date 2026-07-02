import { describe, expect, it, vi, beforeEach } from "vitest";

// redirect() in Next.js throws a NEXT_REDIRECT error to stop execution.
// Simulate that so verifySession flow is accurate in tests.
vi.mock("next/navigation", () => ({
  redirect: vi.fn().mockImplementation((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(),
}));

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { verifySession } from "@/lib/auth/session";

const mockRedirect = vi.mocked(redirect);
const mockCreateClient = vi.mocked(createSupabaseServerClient);

// Build a Supabase client stub matching how verifySession queries:
// supabase.auth.getUser() and supabase.from("profiles").select().eq().single().
function stubClient(user: unknown, profile: unknown) {
  return {
    auth: { getUser: async () => ({ data: { user }, error: null }) },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: profile, error: null }),
        }),
      }),
    }),
  } as never;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRedirect.mockImplementation((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  });
});

describe("verifySession", () => {
  it("redirects to /login when no authenticated user", async () => {
    mockCreateClient.mockResolvedValue(stubClient(null, null));
    await expect(verifySession("admin")).rejects.toThrow("NEXT_REDIRECT:/login");
  });

  it("redirects to /login when profile is missing", async () => {
    mockCreateClient.mockResolvedValue(stubClient({ id: "u1" }, null));
    await expect(verifySession("admin")).rejects.toThrow("NEXT_REDIRECT:/login");
  });

  it("redirects to /client/dashboard when client tries to access admin route", async () => {
    mockCreateClient.mockResolvedValue(
      stubClient({ id: "u1" }, { id: "u1", role: "client", full_name: "Arno", client_id: "c1" })
    );
    await expect(verifySession("admin")).rejects.toThrow("NEXT_REDIRECT:/client/dashboard");
  });

  it("returns user and profile when role matches", async () => {
    const user = { id: "u1", email: "Morne@arqud.com" };
    const profile = { id: "u1", role: "admin" as const, full_name: "Morne Swanepoel", client_id: null };
    mockCreateClient.mockResolvedValue(stubClient(user, profile));

    const result = await verifySession("admin");
    expect(result).toEqual({ user, profile });
  });
});
