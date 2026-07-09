import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Cormorant_Garamond, Jost } from "next/font/google";
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

export const metadata: Metadata = {
  metadataBase: new URL("https://arqudportal.co.za"),
  title: { default: "ARQUD Portal", template: "%s · ARQUD" },
  description: "Agency dashboard and client portal for ARQUD (PTY) LTD.",
  robots: { index: false, follow: false },
  icons: {
    icon: [
      { url: "/brand/arqud/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/arqud/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/brand/arqud/apple-touch-icon.png",
  },
  openGraph: {
    title: "ARQUD Portal",
    description: "Agency dashboard and client portal.",
    url: "https://arqudportal.co.za",
    siteName: "ARQUD",
    images: ["/brand/arqud/og.png"],
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "ARQUD Portal", description: "Agency dashboard and client portal.", images: ["/brand/arqud/og.png"] },
};

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
