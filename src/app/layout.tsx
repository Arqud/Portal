import type { Metadata } from "next";
import { Cormorant_Garamond, Jost } from "next/font/google";
import { TopNav } from "@/components/TopNav";
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
  title: "ARQUD Portal",
  description: "Agency dashboard and client portal for ARQUD (PTY) LTD.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${cormorant.variable} ${jost.variable}`}>
      <body>
        <TopNav variant="agency" />
        {children}
      </body>
    </html>
  );
}
