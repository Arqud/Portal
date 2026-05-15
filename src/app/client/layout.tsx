import { verifySession } from "@/lib/auth/session";
import { getClientCompany } from "@/lib/auth/getClientCompany";
import { TopNav } from "@/components/TopNav";

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await verifySession("client");
  const company = await getClientCompany(profile.client_id);
  return (
    <>
      <TopNav
        variant="client"
        brandName={company ?? "CLIENT PORTAL"}
        user={{ name: profile.full_name ?? "Client", label: company ?? "Client" }}
      />
      {children}
    </>
  );
}
