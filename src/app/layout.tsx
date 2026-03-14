import type { Metadata } from "next";
import { Outfit, JetBrains_Mono } from "next/font/google";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SessionProvider } from "@/components/auth/SessionProvider";
import { PostHogProvider } from "@/components/analytics/PostHogProvider";
import { ToastProvider } from "@/contexts/ToastContext";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "AdForge — AI-Powered Ad Intelligence",
    template: "%s | AdForge",
  },
  description:
    "Discover winning ads, decode what makes them work, and forge better creatives — powered by AI.",
  keywords: [
    "ad intelligence",
    "ad spy tool",
    "winning ads",
    "ad creative analysis",
    "AI ad generator",
    "Meta ad library",
    "TikTok ad research",
  ],
  authors: [{ name: "AdForge" }],
  creator: "AdForge",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  ),
  openGraph: {
    type: "website",
    locale: "en_US",
    title: "AdForge — AI-Powered Ad Intelligence",
    description:
      "Discover winning ads, decode what makes them work, and forge better creatives.",
    siteName: "AdForge",
  },
  twitter: {
    card: "summary_large_image",
    site: "@adforgeio",
    title: "AdForge — AI-Powered Ad Intelligence",
    description:
      "Discover winning ads, decode what makes them work, and forge better creatives.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  return (
    <html
      lang="en"
      className={`dark ${outfit.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background font-sans antialiased">
        <PostHogProvider>
          <SessionProvider session={session}>
            <ToastProvider>
              {children}
            </ToastProvider>
          </SessionProvider>
        </PostHogProvider>
      </body>
    </html>
  );
}
