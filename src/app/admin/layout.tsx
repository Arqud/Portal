import { verifySession } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { Sidebar } from "@/components/ui/Sidebar";
import { getActiveBusiness } from "@/lib/business/active";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await verifySession("admin");
  const admin = createSupabaseAdminClient();
  await admin.from("profiles").select("avatar_url").eq("id", user.id).single();

  const business = await getActiveBusiness();
  const isSae = business === "sa_equipment";

  // SA Equipment is the light-premium workspace: forcing data-theme="light" +
  // data-business on this wrapper re-skins the whole subtree (sidebar + content)
  // via the existing CSS-variable theme, regardless of the user's global toggle.
  // ARQUD (the default) adds no attributes and renders exactly as before.
  return (
    <div
      className="flex min-h-screen bg-arqud-bg"
      {...(isSae ? { "data-theme": "light", "data-business": "sa_equipment" } : {})}
    >
      <Sidebar
        variant="admin"
        business={business}
        brandName={isSae ? "SA Equipment" : "ARQUD"}
        user={{
          name: profile.full_name ?? "Admin",
          label: "Admin",
        }}
      />
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
