import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ChatPresence } from "@/components/layout/ChatPresence";
import { SiteAnalytics } from "@/components/site/SiteAnalytics";
import { MaintenanceWrapper } from "@/components/site/MaintenanceWrapper";
import { CustomHeadHtml } from "@/components/site/CustomHeadHtml";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { FooterVisibility } from "@/components/layout/FooterVisibility";
import { MainWrapper } from "@/components/layout/MainWrapper";
import { OnboardingRedirect } from "@/components/layout/OnboardingRedirect";
import { PendingRedirectHandler } from "@/components/layout/PendingRedirectHandler";
import { PageAccessGuard } from "@/components/layout/PageAccessGuard";
import { SessionSync } from "@/components/layout/SessionSync";
import { EmailVerificationBanner } from "@/components/layout/EmailVerificationBanner";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { PushNotificationSetup } from "@/components/layout/PushNotificationSetup";
import { CookieConsent } from "@/components/layout/CookieConsent";
import { fetchPublicSiteSettings } from "@/lib/site-settings";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
});

export async function generateMetadata(): Promise<Metadata> {
  const s = await fetchPublicSiteSettings();
  const title = s.metaTitle ?? `${s.siteName} — ${s.siteTagline ?? "Almanya Türkçe Topluluk"}`;
  const description =
    s.metaDescription ??
    "Almanya'daki Türkçe konuşanlar için şehir bazlı topluluk, etkinlik, soru-cevap ve güvenilir işletme rehberi.";

  return {
    title: {
      default: title,
      template: `%s | ${s.siteName}`,
    },
    description,
    manifest: "/manifest.webmanifest",
    appleWebApp: {
      capable: true,
      title: s.siteName,
      statusBarStyle: "black-translucent",
    },
    icons: {
      apple: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
      icon: [
        { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
        { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
    },
    keywords: s.metaKeywords?.split(",").map((k) => k.trim()).filter(Boolean),
    robots: s.robotsAllowIndex ? { index: true, follow: true } : { index: false, follow: false },
    metadataBase: s.canonicalUrl ? new URL(s.canonicalUrl) : undefined,
    openGraph: {
      title,
      description,
      siteName: s.siteName,
      images: s.ogImageUrl ? [{ url: s.ogImageUrl }] : undefined,
    },
    verification: s.googleSearchConsoleVerification
      ? { google: s.googleSearchConsoleVerification }
      : undefined,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await fetchPublicSiteSettings();

  return (
    <html lang="tr" className={`${inter.variable} h-dvh`} suppressHydrationWarning>
      <body
        className="min-h-full flex flex-col antialiased"
        suppressHydrationWarning
      >
        <ThemeProvider>
        <CustomHeadHtml html={settings.customHeadHtml} />
        <SiteAnalytics settings={settings} />
        <SessionSync />
        <PendingRedirectHandler />
        <OnboardingRedirect />
        <Header settings={settings} />
        <EmailVerificationBanner />
        <ChatPresence />
        <MainWrapper>
          <MaintenanceWrapper settings={settings}>
            <PageAccessGuard>{children}</PageAccessGuard>
          </MaintenanceWrapper>
        </MainWrapper>
        <FooterVisibility>
          <Footer settings={settings} />
        </FooterVisibility>
        <MobileBottomNav settings={settings} />
        <PushNotificationSetup />
        <CookieConsent />
        </ThemeProvider>
      </body>
    </html>
  );
}
