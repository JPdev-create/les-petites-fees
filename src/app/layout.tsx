import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { Poppins } from "next/font/google";
import { Toaster } from "@/components/toaster";
import { ConfirmHost } from "@/components/confirm";
import { PwaRegister } from "@/components/pwa";
import "./globals.css";

const poppins = Poppins({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-poppins", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Les Petites Fées — Planning nettoyage", template: "%s · Les Petites Fées" },
  description: "Encodez vos dates de nettoyage en 30 secondes. Gîtes, bureaux et locations de vacances — Marche-en-Famenne.",
  applicationName: "Les Petites Fées",
  appleWebApp: { capable: true, title: "Petites Fées", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
  icons: { icon: `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/icons/icon-192.png`, apple: `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/icons/apple-touch-icon.png` },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#275963" },
    { media: "(prefers-color-scheme: dark)", color: "#143238" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Applique le thème avant l'affichage (évite le flash clair/sombre)
const themeScript = `try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning className={`${GeistSans.variable} ${poppins.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh font-sans">
        {children}
        <Toaster />
        <ConfirmHost />
        <PwaRegister />
      </body>
    </html>
  );
}
