import type { Metadata } from "next";
import { Geist, Geist_Mono, Great_Vibes, Playfair_Display } from "next/font/google";
import { canonicalAppUrl } from "@/lib/publicPledgeMetadata";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair-display",
  subsets: ["latin"],
});

const greatVibes = Great_Vibes({
  variable: "--font-great-vibes",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(canonicalAppUrl()),
  title: {
    default: "Smart Event Pass — Digital Wedding & Event Guest Management in Tanzania",
    template: "%s · Smart Event Pass",
  },
  description:
    "Digital wedding & event invitations, RSVP, QR check-in and online pledge tracking for Tanzania. Mfumo wa mialiko ya harusi, RSVP na michango ya harusi mtandaoni.",
  applicationName: "Smart Event Pass",
  keywords: [
    "Smart Event Pass",
    "digital wedding invitations Tanzania",
    "mfumo wa mialiko ya harusi",
    "wedding invitation system Tanzania",
    "michango ya harusi online",
    "event guest management Tanzania",
    "QR check-in system",
    "WhatsApp wedding invitations",
    "event management software Dar es Salaam",
  ],
  authors: [{ name: "Smart Event Pass" }],
  creator: "Smart Event Pass",
  publisher: "Smart Event Pass",
  formatDetection: { email: false, address: false, telephone: false },
  // Default-deny: most routes in this app are the authenticated dashboard or
  // carry a private per-guest/per-contributor token (invite/[token], r/[token],
  // support/[token], meeting-map/[token], contributions/manage/[token]) and must
  // never be indexed. Only the marketing homepage overrides this to index:true.
  robots: { index: false, follow: false },
  openGraph: {
    type: "website",
    siteName: "Smart Event Pass",
    locale: "en_US",
    alternateLocale: ["sw_TZ"],
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${playfairDisplay.variable} ${greatVibes.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
