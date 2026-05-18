import { verifySession } from "@/lib/auth/session";
import { SettingsClient } from "./SettingsClient";

export default async function SettingsPage() {
  const { user, profile } = await verifySession("admin");
  return (
    <main className="min-h-screen px-8 py-12">
      <h1 className="text-5xl tracking-wide mb-8">Settings</h1>
      <SettingsClient userId={user.id} email={user.email ?? ""} fullName={profile.full_name ?? ""} />
    </main>
  );
}
