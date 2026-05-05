import type { Metadata } from "next";
import Script from "next/script"; // On ajoute cet outil spécial
import "./globals.css";
import "mapbox-gl/dist/mapbox-gl.css";

export const metadata: Metadata = {
  title: {
    default: "SokoDeal — Marketplace N°1 en Afrique",
    template: "%s | SokoDeal"
  },
  description: "Achetez, vendez et louez facilement en Afrique. Immobilier, vehicules, electronique, emploi et plus encore.",
  keywords: ["annonces", "Rwanda", "Kigali", "immobilier", "voitures", "emploi", "marketplace", "Afrique"],
  authors: [{ name: "SokoDeal" }],
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "fr_RW",
    url: "https://sokodeal.app",
    siteName: "SokoDeal",
    title: "SokoDeal — Marketplace N°1 en Afrique",
    description: "Achetez, vendez et louez facilement en Afrique.",
    images: [{ url: "https://sokodeal.app/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "SokoDeal — Marketplace N°1 en Afrique",
    description: "Achetez, vendez et louez facilement en Afrique.",
    images: ["https://sokodeal.app/og-image.png"],
  },
  manifest: "/manifest.json",
  icons: { icon: "/favicon.ico", apple: "/favicon.ico" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"/>
        <meta name="theme-color" content="#0f5233"/>
        <meta name="mobile-web-app-capable" content="yes"/>
        <meta name="apple-mobile-web-app-capable" content="yes"/>
        <meta name="apple-mobile-web-app-status-bar-style" content="default"/>
        <meta name="apple-mobile-web-app-title" content="SokoDeal"/>
        <link rel="manifest" href="/manifest.json"/>
        <link rel="preconnect" href="https://fonts.googleapis.com"/>
        <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet"/>
      </head>
      <body style={{margin:0, padding:0, paddingBottom:'env(safe-area-inset-bottom)', background:'#f5f7f5', overflowX:'hidden', maxWidth:'100vw'}}>
        {children}
        
        {/* On a déplacé le script ici avec le bon outil de Next.js */}
        <Script id="register-sw" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js');
              });
            }
          `}
        </Script>
      </body>
    </html>
  )
}
