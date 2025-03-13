import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { AuthProvider } from "@/contexts/auth-context";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/react";
import { Providers } from "@/components/providers";
import { NotificationsProvider } from "@/contexts/notifications-context";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Builders Central",
  description: "A centralized hub for managing and showcasing web applications",
  icons: {
    icon: [
      {
        url: "/logo.jpg",
        href: "/logo.jpg",
      },
    ],
  },
};

export default function RootLayout({
  children,
  session,
}: {
  children: React.ReactNode;
  session: any;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen flex flex-col`}>
        <Providers session={session}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <AuthProvider>
              <NotificationsProvider>
                <SiteHeader />
                <main className="flex-1">
                  <SpeedInsights />
                  {children}
                  <Analytics />
                </main>
                <SiteFooter />
                <Toaster />
              </NotificationsProvider>
            </AuthProvider>
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}
