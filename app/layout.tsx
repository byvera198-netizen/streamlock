import type { Metadata } from "next";
import "./globals.css";
import SupportWhatsApp from "./components/support-whatsapp";
import Link from "next/link";

export const metadata: Metadata = {
  title: "StreamLock — Negocios verificados",
  description: "Comercio social protegido para vendedores y compradores.",
  icons: {
    icon: "/streamlock-logo.jpg",
    shortcut: "/streamlock-logo.jpg",
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
