import { verifySession } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { SettingsClient } from "./SettingsClient";

export default async function SettingsPage() {
  const { user, profile } = await verifySession("admin");
  const admin = createSupabaseAdminClient();
  const { data } = await admin.from("profiles").select("avatar_url").eq("id", user.id).single();

  return (
    <main className="min-h-screen px-8 py-12">
      <h1 className="font-display text-5xl font-normal mb-8" style={{ letterSpacing: "-0.02em" }}>Settings</h1>
      <SettingsClient
        userId={user.id}
        email={user.email ?? ""}
        fullName={profile.full_name ?? ""}
        avatarUrl={data?.avatar_url ?? null}
      />
    </main>
  );
}
