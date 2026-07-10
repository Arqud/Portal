import { verifySession } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/ui";
import { SettingsClient } from "./SettingsClient";
import { IntegrationsCard } from "./IntegrationsCard";
import { getSetting } from "@/lib/settings/query";

export default async function SettingsPage() {
  const { user, profile } = await verifySession("admin");
  const admin = createSupabaseAdminClient();
  const [{ data }, gcalUrl, fwdUrl, fwdSecret, notifyWeWash, notifySparkling, resendKey] = await Promise.all([
    admin.from("profiles").select("avatar_url").eq("id", user.id).single(),
    getSetting("google_calendar_ics_url"),
    getSetting("lead_forward_url"),
    getSetting("lead_forward_secret"),
    getSetting("lead_notify_email_we_wash"),
    getSetting("lead_notify_email_sparkling"),
    getSetting("resend_api_key"),
  ]);

  return (
    <main className="min-h-screen px-4 sm:px-8 py-8 sm:py-10 space-y-8 animate-fade-up">
      <PageHeader title="Settings" />
      <SettingsClient
        userId={user.id}
        email={user.email ?? ""}
        fullName={profile.full_name ?? ""}
        avatarUrl={data?.avatar_url ?? null}
      />
      <IntegrationsCard
        initialUrl={gcalUrl}
        initialForwardUrl={fwdUrl}
        initialForwardSecret={fwdSecret}
        initialNotifyWeWash={notifyWeWash}
        initialNotifySparkling={notifySparkling}
        initialResendKey={resendKey}
      />
    </main>
  );
}
