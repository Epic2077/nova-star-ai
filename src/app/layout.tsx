import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { UserProvider } from "@/hooks/useUser";
import "./globals.css";
import { ThemeProvider } from "@/components/themeProvider";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ProfileProvider } from "@/hooks/useProfile";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://nova-star-ai.vercel.app",
  ),
  title: {
    default: "Nova Star AI",
    template: "%s | Nova Star AI",
  },
  description:
    "Nova Star AI is a relationship-aware personal assistant that helps you communicate better, stay organized, and keep meaningful conversations in one place.",
  applicationName: "Nova Star AI",
  keywords: [
    "Nova Star AI",
    "AI assistant",
    "personal assistant",
    "relationship assistant",
    "chat assistant",
  ],
  authors: [{ name: "Ashkan Sadeghi" }],
  creator: "Ashkan Sadeghi",
  publisher: "Ashkan Sadeghi",
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/logo/logo.png",
    apple: "/logo/logo.png",
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Nova Star AI",
    title: "Nova Star AI",
    description:
      "A relationship-aware personal assistant that helps you with thoughtful conversations and better connection.",
    images: [
      {
        url: "/logo/logo.png",
        width: 1200,
        height: 630,
        alt: "Nova Star AI",
      },
    ],
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Nova Star AI",
    description:
      "A relationship-aware personal assistant for meaningful conversations.",
    images: ["/logo/logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          themes={[
            "light",
            "dark",
            "system",
            "ocean",
            "forest",
            "custom-theme",
          ]}
        >
          <UserProvider>
            <ProfileProvider>
              {children}
              <SpeedInsights />
              <Toaster position="top-center" />
            </ProfileProvider>
          </UserProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
