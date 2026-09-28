import type { Metadata } from "next";
import { IBM_Plex_Mono, Literata, Outfit } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });
const literata = Literata({ subsets: ["latin"], variable: "--font-literata" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: { default: "AceIt", template: "%s · AceIt" },
  description: "Build a profile, generate a portfolio, and practice the interview.",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const theme = (await cookies()).get("theme")?.value;
  return (
    <html lang="en" className={`${outfit.variable} ${literata.variable} ${mono.variable} ${theme === "light" ? "" : "dark"}`}>
      <body className="min-h-screen bg-bg text-ink antialiased">{children}</body>
    </html>
  );
}
