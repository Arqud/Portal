import { verifySession } from "@/lib/auth/session";
import { getClientCompany } from "@/lib/auth/getClientCompany";
import { Sidebar } from "@/components/ui/Sidebar";

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await verifySession("client");
  const company = await getClientCompany(profile.client_id);
  return (
    <div className="flex min-h-screen">
      <Sidebar
        variant="client"
        brandName={company ?? "CLIENT PORTAL"}
        user={{ name: profile.full_name ?? "Client", label: company ?? "Client" }}
      />
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
