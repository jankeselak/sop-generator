import type { Metadata } from "next";
import { Outfit, Geist_Mono } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SOP Creator — Document Any Process in 30 Seconds | Duvo",
  description:
    "Describe any operational process in plain English. Get a complete SOP with visual workflow, role assignments, time estimates, and a shareable link. Free, no sign-up required.",
  openGraph: {
    title: "SOP Creator by Duvo",
    description:
      "Document any operational process in 30 seconds. Get a visual SOP with role assignments, time estimates, and stakeholder validation. Free.",
    type: "website",
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
        className={`${outfit.variable} ${geistMono.variable}`}
      >
        {children}
      </body>
    </html>
  );
}
