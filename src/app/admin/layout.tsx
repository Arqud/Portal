import { verifySession } from "@/lib/auth/session";
import { TopNav } from "@/components/TopNav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await verifySession("admin");
  return (
    <>
      <TopNav variant="agency" user={{ name: profile.full_name ?? "Admin", label: "Admin" }} />
      {children}
    </>
  );
}
