import { describe, expect, it } from "vitest";
import { roleForRedirect } from "@/lib/auth/redirects";

describe("roleForRedirect", () => {
  it("maps admin to /admin/overview", () => {
    expect(roleForRedirect("admin")).toBe("/admin/overview");
  });

  it("maps client to /client/dashboard", () => {
    expect(roleForRedirect("client")).toBe("/client/dashboard");
  });

  it("maps null to /login", () => {
    expect(roleForRedirect(null)).toBe("/login");
  });

  it("maps unknown string to /login", () => {
    expect(roleForRedirect("unknown" as "admin")).toBe("/login");
  });
});
