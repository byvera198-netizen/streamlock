import type { Metadata } from "next";
import "./globals.css";
import SupportWhatsApp from "./components/support-whatsapp";

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
      </body>
    </html>
  );
}
