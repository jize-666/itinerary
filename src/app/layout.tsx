import type { Metadata, Viewport } from "next";
import "@fontsource-variable/fraunces/full.css";
import "@fontsource-variable/fraunces/full-italic.css";
import "@fontsource-variable/manrope";
import "./globals.css";
import { LangToggle } from "@/components/LangToggle";
import { Curtain } from "@/components/motion/Curtain";
import { SoundToggle } from "@/components/SoundToggle";

// Situs privat: jangan pernah diindeks (PRD FR-06). Link preview netral tanpa data pribadi.
export const metadata: Metadata = {
  title: "A Three-Day Lakon · Solo",
  description: "A private invitation.",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
  referrer: "no-referrer",
};

export const viewport: Viewport = {
  themeColor: "#0a0c18",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {children}
        <LangToggle />
        <SoundToggle />
        <Curtain />
      </body>
    </html>
  );
}
