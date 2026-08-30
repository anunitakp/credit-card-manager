import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/tracker/AppShell";
import { Providers } from "./providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Expense Tracker",
  description:
    "Personal expense tracker with credit-card and UPI spending in one place, synced across your devices.",
  applicationName: "Expense Tracker",
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    // iOS has no manifest: these are what make "Add to Home Screen" open the
    // app full-screen with the right name instead of in Safari.
    capable: true,
    title: "Expenses",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  /**
   * Declares that this app paints both schemes itself.
   *
   * Chrome on Android runs an "auto dark theme" that force-inverts sites it
   * believes have no dark mode of their own, and the check looks at the
   * document's declared colour scheme. Ours lives on a class (`.dark`), so in
   * light mode the root resolved to `color-scheme: light` and Chrome decided
   * the app needed rescuing — force-darkening the light theme into something
   * that was neither theme. This meta opts out of that; the CSS on `:root`
   * and `.dark` still decides which scheme is actually in effect.
   */
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#EEF3F8" },
    { media: "(prefers-color-scheme: dark)", color: "#0A0F14" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="font-sans">
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
