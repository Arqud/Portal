import type { Metadata, Viewport } from "next";
import { verifySession } from "@/lib/auth/session";
import { getClientCompany } from "@/lib/auth/getClientCompany";
import { Sidebar } from "@/components/ui/Sidebar";
import { BRANDS, resolveBrand } from "@/lib/brand/brand-meta";

export async function generateMetadata(): Promise<Metadata> {
  const { profile } = await verifySession("client");
  const m = BRANDS[resolveBrand({ role: (profile as { role?: string }).role, brand: profile.brand })];
  return {
    title: { default: m.name, template: `%s · ${m.name}` },
    icons: {
      icon: [
        { url: `${m.iconDir}/icon-32.png`, sizes: "32x32", type: "image/png" },
        { url: `${m.iconDir}/icon-192.png`, sizes: "192x192", type: "image/png" },
      ],
      apple: `${m.iconDir}/apple-touch-icon.png`,
    },
    openGraph: { title: m.name, siteName: m.name, images: [`${m.iconDir}/og.png`], type: "website" },
    twitter: { card: "summary_large_image", title: m.name, images: [`${m.iconDir}/og.png`] },
  };
}

export async function generateViewport(): Promise<Viewport> {
  const { profile } = await verifySession("client");
  const m = BRANDS[resolveBrand({ role: (profile as { role?: string }).role, brand: profile.brand })];
  return { themeColor: m.themeColor };
}

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await verifySession("client");
  const company = await getClientCompany(profile.client_id);
  return (
    <div className="flex min-h-screen">
      <Sidebar
        variant="client"
        brandName={profile.brand ? `${profile.brand} — Leads` : company ?? "CLIENT PORTAL"}
        leadsOnly={!!profile.brand}
        user={{ name: profile.full_name ?? "Client", label: profile.brand ? `${profile.brand} team` : company ?? "Client" }}
      />
      <main className="flex-1 min-w-0 pt-14 md:pt-0">{children}</main>
    </div>
  );
}
