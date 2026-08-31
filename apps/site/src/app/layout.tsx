import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";

import "./globals.css";

import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { site } from "@/content/meta";

/**
 * The two families the token file names first.
 *
 * `apps/ui/src/theme/tokens.ts` asks for Inter and JetBrains Mono and then
 * lists the system fonts to fall back to, because the desktop app has no font
 * loader and takes whatever the machine has. A web page can do better, so
 * these are loaded properly and bound to the two variables `globals.css`
 * points the `font-sans` and `font-mono` utilities at.
 */
const sans = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jetbrains-mono",
});

const url =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://mino-workbench.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(url),
  title: {
    default: `${site.name} — ${site.tagline}`,
    template: `%s — ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  icons: { icon: "/favicon.svg" },
  openGraph: {
    type: "website",
    url,
    siteName: site.name,
    title: `${site.name} — ${site.tagline}`,
    description: site.description,
  },
  twitter: {
    card: "summary_large_image",
    title: `${site.name} — ${site.tagline}`,
    description: site.description,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body>
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
