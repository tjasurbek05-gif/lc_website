import type { Metadata } from "next";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { ThemeProvider } from "next-themes";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Modern display face for headings / brand (paired with Geist for body text).
const displayGrotesk = Space_Grotesk({
  variable: "--font-display-grotesk",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Brian — Platform for Learning Centers",
  description:
    "Students see their marks and progress. Teachers grade in seconds. Admins run everything from one place.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} ${displayGrotesk.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full">
        <NextIntlClientProvider>
          <ThemeProvider
            attribute={["class", "data-theme"]}
            defaultTheme="orange"
            themes={["orange", "light", "dark"]}
            enableSystem={false}
            disableTransitionOnChange
          >
            {children}
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
