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
vi.mock("@/lib/auth/getProfile", () => ({
  getProfile: vi.fn(),
}));

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth/getProfile";
import { verifySession } from "@/lib/auth/session";

const mockRedirect = vi.mocked(redirect);
const mockCreateClient = vi.mocked(createSupabaseServerClient);
const mockGetProfile = vi.mocked(getProfile);

beforeEach(() => {
  vi.clearAllMocks();
  // Re-apply the throwing behaviour after clearAllMocks resets it
  mockRedirect.mockImplementation((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  });
});

describe("verifySession", () => {
  it("redirects to /login when no authenticated user", async () => {
    mockCreateClient.mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: null }, error: null }) },
    } as never);

    await expect(verifySession("admin")).rejects.toThrow("NEXT_REDIRECT:/login");
  });

  it("redirects to /login when profile is missing", async () => {
    mockCreateClient.mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: "u1" } }, error: null }) },
    } as never);
    mockGetProfile.mockResolvedValue(null);

    await expect(verifySession("admin")).rejects.toThrow("NEXT_REDIRECT:/login");
  });

  it("redirects to /client/dashboard when client tries to access admin route", async () => {
    mockCreateClient.mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: "u1" } }, error: null }) },
    } as never);
    mockGetProfile.mockResolvedValue({ role: "client", full_name: "Arno", client_id: "c1" });

    await expect(verifySession("admin")).rejects.toThrow("NEXT_REDIRECT:/client/dashboard");
  });

  it("returns user and profile when role matches", async () => {
    const user = { id: "u1", email: "Morne@arqud.com" };
    const profile = { role: "admin" as const, full_name: "Morne Swanepoel", client_id: null };
    mockCreateClient.mockResolvedValue({
      auth: { getUser: async () => ({ data: { user }, error: null }) },
    } as never);
    mockGetProfile.mockResolvedValue(profile);

    const result = await verifySession("admin");
    expect(result).toEqual({ user, profile });
  });
});
