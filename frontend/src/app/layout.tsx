import { Metadata } from 'next';
import { Urbanist } from "next/font/google";
import "./globals.css";

const urbanist = Urbanist({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
    title: "Qremix - Ethereum IDE",
    description: "Qremix Online IDE by Quranium is a powerful toolset for developing, deploying, debugging, and testing Ethereum and EVM-compatible smart contracts.",
    keywords: "Qremix, Ethereum, Web3, Smart Contracts, EVM, DApp, MetaMask, Remix IDE",
    authors: [{ name: "Quranium", url: "https://www.quranium.org/" }],
    creator: "Quranium",
    publisher: "Quranium",
    openGraph: {
      type: "website",
      locale: "en_US",
      url: "https://www.quranium.org/",
      siteName: "Qremix - Ethereum IDE",
      title: "Qremix - Ethereum IDE",
      description: "Qremix Online IDE by Quranium is a powerful toolset for developing, deploying, debugging, and testing Ethereum and EVM-compatible smart contracts.",
      images: [
        {
          url: "/og-image.png",
          width: 1200,
          height: 630,
          alt: "Qremix IDE Screenshot",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "Qremix - Ethereum IDE",
      description: "Qremix Online IDE by Quranium is a powerful toolset for developing, deploying, debugging, and testing Ethereum and EVM-compatible smart contracts.",
      creator: "@yourtwitter",
      images: ["/twitter-image.png"],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    viewport: "width=device-width, initial-scale=1",
    themeColor: "#ffffff",
    alternates: {
      canonical: "https://www.quranium.org/",
    },
    category: "Technology",
  };
  

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="light">
      <head>
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "Solidity IDE",
              "operatingSystem": "Web",
              "applicationCategory": "DeveloperApplication",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
              },
              "aggregateRating": {
                "@type": "AggregateRating",
                "ratingValue": "4.8",
                "ratingCount": "1024"
              }
            })
          }}
        />
      </head>
      <body className={urbanist.className}>
        {children}
      </body>
    </html>
  );
}