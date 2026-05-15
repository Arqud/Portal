export function roleForRedirect(role: "admin" | "client" | null | string): string {
  if (role === "admin") return "/admin/overview";
  if (role === "client") return "/client/dashboard";
  return "/login";
}
