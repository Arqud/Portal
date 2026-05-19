import { verifySession } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { TopNav } from "@/components/TopNav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await verifySession("admin");
  const admin = createSupabaseAdminClient();
  const { data } = await admin.from("profiles").select("avatar_url").eq("id", user.id).single();

  return (
    <>
      <TopNav
        variant="agency"
        user={{
          name: profile.full_name ?? "Admin",
          label: "Admin",
          avatarUrl: data?.avatar_url ?? undefined,
        }}
      />
      {children}
    </>
  );
}
