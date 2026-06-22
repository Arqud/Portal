import { verifySession } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { Sidebar } from "@/components/ui/Sidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await verifySession("admin");
  const admin = createSupabaseAdminClient();
  const { data } = await admin.from("profiles").select("avatar_url").eq("id", user.id).single();

  return (
    <div className="flex min-h-screen">
      <Sidebar
        variant="admin"
        brandName="ARQUD"
        user={{
          name: profile.full_name ?? "Admin",
          label: "Admin",
        }}
      />
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
