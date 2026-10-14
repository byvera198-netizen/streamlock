import type { Metadata } from "next";
import "./globals.css";
import "./identity.css";
import "./admin/overview.css";
import SupportWhatsApp from "./components/support-whatsapp";
import Link from "next/link";
import { getPublicUrl } from "./public-url";

export async function generateMetadata(): Promise<Metadata> {
  const publicUrl = getPublicUrl();
  return {
    metadataBase: new URL(publicUrl),
    title: "StreamLock — Negocios verificados",
    description: "Comercio social protegido para vendedores y compradores.",
    applicationName: "StreamLock",
    category: "shopping",
    icons: { icon: "/streamlock-mark.png", shortcut: "/streamlock-mark.png" },
    openGraph: {
      type: "website",
      siteName: "StreamLock",
      title: "StreamLock — Comercio social protegido",
      description: "Compra y vende desde redes sociales con comprobantes, entregas y soporte en un solo lugar.",
      images: [{ url: `${publicUrl}/streamlock-logo.png`, alt: "StreamLock" }],
    },
    twitter: {
      card: "summary",
      title: "StreamLock — Comercio social protegido",
      description: "Compra y vende desde redes sociales con comprobantes, entregas y soporte en un solo lugar.",
      images: [`${publicUrl}/streamlock-logo.png`],
    },
  };
}

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
