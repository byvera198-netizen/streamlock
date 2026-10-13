"use client";

import { usePathname } from "next/navigation";
import { supportContact } from "../site-config";

function messageForPath(pathname: string) {
  if (pathname.startsWith("/checkout")) return "Hola, necesito ayuda con el checkout protegido de StreamLock.";
  if (pathname.startsWith("/my-orders") || pathname.startsWith("/orders")) return "Hola, necesito ayuda con un pedido de StreamLock.";
  if (pathname.startsWith("/profile")) return "Hola, necesito ayuda para completar mi perfil de StreamLock.";
  if (pathname.startsWith("/admin")) return "Hola, necesito soporte con la administración de StreamLock.";
  if (pathname.startsWith("/s/")) return "Hola, necesito ayuda con una compra en una vitrina de StreamLock.";
  return "Hola, necesito ayuda con StreamLock.";
}

export default function SupportWhatsApp() {
  const pathname = usePathname() ?? "/";
  const href = `${supportContact.whatsappUrl}?text=${encodeURIComponent(messageForPath(pathname))}`;

  return <a className="support-whatsapp" href={href} target="_blank" rel="noreferrer" aria-label={`Contactar al soporte de StreamLock por WhatsApp ${supportContact.whatsappDisplay}`}>
    <span className="support-whatsapp-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M20.52 3.48A11.85 11.85 0 0 0 12.08 0C5.54 0 .22 5.32.22 11.86c0 2.09.55 4.13 1.59 5.93L.12 24l6.35-1.67a11.84 11.84 0 0 0 5.6 1.41h.01c6.54 0 11.86-5.32 11.86-11.86 0-3.17-1.23-6.15-3.42-8.4Zm-8.44 18.22h-.01a9.84 9.84 0 0 1-5.02-1.37l-.36-.21-3.77.99 1-3.67-.23-.38a9.81 9.81 0 0 1-1.51-5.2c0-5.4 4.4-9.8 9.81-9.8 2.62 0 5.08 1.02 6.93 2.87a9.76 9.76 0 0 1 2.87 6.94c0 5.42-4.4 9.83-9.81 9.83Zm5.39-7.37c-.29-.15-1.73-.85-2-.95-.27-.1-.46-.15-.66.15-.2.29-.76.95-.93 1.15-.17.2-.34.22-.63.07-.29-.15-1.24-.46-2.36-1.46-.87-.78-1.46-1.74-1.63-2.03-.17-.29-.02-.45.13-.6.13-.13.29-.34.44-.51.15-.17.2-.29.3-.49.1-.2.05-.37-.02-.52-.07-.15-.66-1.59-.9-2.18-.24-.57-.48-.49-.66-.5h-.56c-.2 0-.51.07-.78.37-.27.29-1.02 1-1.02 2.44s1.05 2.83 1.2 3.03c.15.2 2.07 3.17 5.02 4.44.7.3 1.25.49 1.68.63.7.22 1.34.19 1.84.11.56-.08 1.73-.71 1.97-1.39.24-.68.24-1.27.17-1.39-.07-.12-.27-.2-.56-.35Z" /></svg></span>
    <span className="support-whatsapp-copy"><strong>Soporte</strong><small>WhatsApp</small></span>
  </a>;
}
