import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Pull Up Coffee — Curbside Coffee, Instantly",
  description: "Order from local cafes and pick up curbside. No queues, no parking, no hassle. Australia's curbside coffee platform.",
  metadataBase: new URL("https://pullupcoffee.com"),
  openGraph: {
    title: "Pull Up Coffee — Curbside Coffee, Instantly",
    description: "Order from local cafes and pick up curbside. No queues, no parking, no hassle.",
    url: "https://pullupcoffee.com",
    siteName: "Pull Up Coffee",
    locale: "en_AU",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Analytics />
      </body>
    </html>
  );
}
