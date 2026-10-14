import type { Metadata } from "next";
import "./globals.css";
import SupportWhatsApp from "./components/support-whatsapp";
import Link from "next/link";

export const metadata: Metadata = {
  metadataBase: new URL("https://streamlock.profebyron.workers.dev"),
  title: "StreamLock — Negocios verificados",
  description: "Comercio social protegido para vendedores y compradores.",
  applicationName: "StreamLock",
  category: "shopping",
  icons: {
    icon: "/streamlock-logo.jpg",
    shortcut: "/streamlock-logo.jpg",
  },
  openGraph: {
    type: "website",
    siteName: "StreamLock",
    title: "StreamLock — Comercio social protegido",
    description: "Compra y vende desde redes sociales con comprobantes, entregas y soporte en un solo lugar.",
    images: [{ url: "/streamlock-logo.jpg", alt: "StreamLock" }],
  },
  twitter: {
    card: "summary",
    title: "StreamLock — Comercio social protegido",
    description: "Compra y vende desde redes sociales con comprobantes, entregas y soporte en un solo lugar.",
    images: ["/streamlock-logo.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased">
        {children}
        <SupportWhatsApp />
        <footer className="global-footer"><span>StreamLock · Comercio social protegido</span><nav><Link href="/terms">Términos</Link><Link href="/privacy">Privacidad</Link><Link href="/refunds">Reembolsos y disputas</Link></nav></footer>
      </body>
    </html>
  );
}
