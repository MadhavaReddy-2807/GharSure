import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ReferralParamCapturer } from "@/components/referral-param-capturer";

export const metadata: Metadata = {
  title: "GharSure - Mobile Household Intelligence",
  description: "Unbiased product teardowns, water intelligence, and product trials for your home.",
  manifest: "/manifest.json",
  icons: {
    icon: "/logo.jpeg",
    apple: "/logo.jpeg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full bg-white">
      <body className="min-h-full flex flex-col bg-white antialiased text-slate-800">
        <ReferralParamCapturer />
        <main className="flex-1 flex flex-col">{children}</main>
      </body>
    </html>
  );
}
