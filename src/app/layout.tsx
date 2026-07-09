import type { Metadata, Viewport } from "next";
import { cookies, headers } from "next/headers";
import { Cormorant_Garamond, Jost } from "next/font/google";
import { BRANDS, resolveBrandFromHost } from "@/lib/brand/brand-meta";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display-loaded",
  display: "swap",
});

const jost = Jost({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-body-loaded",
  display: "swap",
});

// Anonymous surfaces (login page + link-preview crawlers) resolve brand from the
// HOST — per-user branding lives on the authed /client/* routes, which a crawler
// never reaches. Arno's `arno.` subdomain → neutral "Client Portal" (no ARQUD).
export async function generateMetadata(): Promise<Metadata> {
  const host = (await headers()).get("host") ?? "arqudportal.co.za";
  const m = BRANDS[resolveBrandFromHost(host)];
  // Build the og:image as a SAME-HOST absolute URL so the crawler fetches it from
  // the exact host it is already crawling — a cross-host image can hit a redirect
  // and make WhatsApp fall back to the tiny square favicon (the cramped card bug).
  const origin = `${host.includes("localhost") ? "http" : "https"}://${host}`;
  const ogImage = `${origin}${m.iconDir}/og.png`;
  return {
    metadataBase: new URL("https://arqudportal.co.za"),
    title: { default: m.name, template: `%s · ${m.name}` },
    description: m.description,
    robots: { index: false, follow: false },
    icons: {
      icon: [
        { url: `${m.iconDir}/icon-32.png`, sizes: "32x32", type: "image/png" },
        { url: `${m.iconDir}/icon-192.png`, sizes: "192x192", type: "image/png" },
      ],
      apple: `${m.iconDir}/apple-touch-icon.png`,
    },
    openGraph: {
      title: m.name,
      description: m.description,
      url: origin,
      siteName: m.name,
      images: [{ url: ogImage, width: 1200, height: 630, alt: m.name }],
      type: "website",
    },
    twitter: { card: "summary_large_image", title: m.name, description: m.description, images: [ogImage] },
  };
}

export const viewport: Viewport = { themeColor: "#0b0b0c" };

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const theme = (await cookies()).get("theme")?.value === "light" ? "light" : "dark";
  return (
    <html lang="en" data-theme={theme} className={`${cormorant.variable} ${jost.variable}`}>
      <body>{children}</body>
    </html>
  );
}
