import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/bricolage-grotesque";
import "./globals.css";
import { Toaster } from "sonner";
import { Navbar } from "@/components/layout/navbar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { DraftProvider } from "@/components/draft/draft-provider";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
  title: { default: "TravelIo — Organizza il tuo prossimo viaggio", template: "%s · TravelIo" },
  description: "Trova la meta, confronta voli e alloggi, crea l'itinerario su mappa e tieni sotto controllo il budget. Tutto in un'unica app.",
  openGraph: { type: "website", locale: "it_IT", siteName: "TravelIo" },
};

export const viewport: Viewport = {
  themeColor: "#faf9f6",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className="h-full">
      <body className="flex min-h-full flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-white">
          Vai al contenuto
        </a>
        <DraftProvider>
          <Navbar />
          <main id="main" className="flex-1">
            {children}
          </main>
          <MobileNav />
        </DraftProvider>
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
