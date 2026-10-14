import Link from "next/link";

export default function GlobalQuickNav() {
  return <nav className="global-quick-nav" aria-label="Accesos rápidos"><Link href="/" prefetch={false}>Inicio</Link><Link href="/my-orders" prefetch={false}>Mis compras</Link><Link href="/profile" prefetch={false}>Mi perfil</Link><Link href="/terms" prefetch={false}>Ayuda y reglas</Link></nav>;
}
