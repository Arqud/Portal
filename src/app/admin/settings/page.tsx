import { verifySession } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/ui";
import { SettingsClient } from "./SettingsClient";

export default async function SettingsPage() {
  const { user, profile } = await verifySession("admin");
  const admin = createSupabaseAdminClient();
  const { data } = await admin.from("profiles").select("avatar_url").eq("id", user.id).single();

  return (
    <main className="min-h-screen px-8 py-10 space-y-8 animate-fade-up">
      <PageHeader title="Settings" />
      <SettingsClient
        userId={user.id}
        email={user.email ?? ""}
        fullName={profile.full_name ?? ""}
        avatarUrl={data?.avatar_url ?? null}
      />
    </main>
  );
}
