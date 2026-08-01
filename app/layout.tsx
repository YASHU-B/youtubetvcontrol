import type { Metadata } from "next";
import { Inter } from "next/font/google";
import GoogleAdsense from "@/components/GoogleAdsense";
import SEOFooter from "@/components/SEOFooter";
import { PLAYLIST } from "@/data/playlist";
import { getWebsiteSchema, getOrganizationSchema, getMusicPlaylistSchema, SITE_URL } from "@/lib/seo";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Telugu & Tamil Songs Online - 24/7 Live Music TV & Hit Playlist | YashuBeatz TV",
    template: "%s | YashuBeatz TV"
  },
  description: "Listen to top Telugu & Tamil songs online 24/7! Watch trending Telugu video songs (Oo Antava, Butta Bomma, Naatu Naatu, Chuttamalle) and Tamil hit songs (Arabic Kuthu, Rowdy Baby, Ranjithame, Kaavaalaa) with non-stop HD streaming.",
  keywords: [
    "Telugu songs", "Tamil songs", "Telugu video songs", "Tamil hit songs",
    "Latest Telugu songs 2026", "Latest Tamil songs 2026", "Telugu music online",
    "Tamil music streaming", "Pushpa songs", "Oo Antava song", "Butta Bomma",
    "Arabic Kuthu", "Rowdy Baby", "Ranjithame", "Naatu Naatu RRR", "Chuttamalle Devara",
    "Kaavaalaa Jailer", "Anirudh Tamil songs", "Devi Sri Prasad Telugu hits",
    "YashuBeatz TV", "Telugu DJ songs", "Tamil 4K video songs"
  ],
  authors: [{ name: "YashuBeatz TV" }],
  creator: "YashuBeatz TV",
  publisher: "YashuBeatz TV",
  alternates: {
    canonical: SITE_URL,
    languages: {
      "en": SITE_URL,
      "te": `${SITE_URL}/telugu-songs`,
      "ta": `${SITE_URL}/tamil-songs`
    }
  },
  openGraph: {
    title: "Telugu & Tamil Songs Online - 24/7 Live Music TV | YashuBeatz TV",
    description: "Stream continuous top Telugu and Tamil video songs 24/7. Non-stop hit South Indian movie songs, HD videos, and lyrics.",
    url: SITE_URL,
    siteName: "YashuBeatz TV",
    images: [
      {
        url: `${SITE_URL}/icons/icon-512.png`,
        width: 512,
        height: 512,
        alt: "YashuBeatz TV - Telugu & Tamil Songs"
      }
    ],
    locale: "en_US",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "Telugu & Tamil Songs Online - 24/7 Live Music TV | YashuBeatz TV",
    description: "Listen to top Telugu & Tamil songs online 24/7! HD music videos & playlists.",
    images: [`${SITE_URL}/icons/icon-512.png`]
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: "/icon.png", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/icon.png",
    apple: "/icons/icon-192.png",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "YashuBeatz TV",
  },
  other: {
    "google-adsense-account": "ca-pub-7624075828918805",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const websiteSchema = getWebsiteSchema();
  const organizationSchema = getOrganizationSchema();
  const playlistSchema = getMusicPlaylistSchema(PLAYLIST);

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(playlistSchema) }}
        />
      </head>
      <body className={`${inter.className} min-h-screen flex flex-col bg-black text-white antialiased`}>
        <GoogleAdsense />
        <div className="flex-1">
          {children}
        </div>
        <SEOFooter />
      </body>
    </html>
  );
}
