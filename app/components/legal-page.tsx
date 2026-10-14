import Link from "next/link";
import { supportContact } from "../site-config";

type Section = { title: string; body: string[] };

export default function LegalPage({ eyebrow, title, intro, sections }: { eyebrow: string; title: string; intro: string; sections: Section[] }) {
  return <main className="legal-shell">
    <header className="legal-header"><Link href="/" className="brand-logo" prefetch={false}><img src="/streamlock-logo.png" alt="StreamLock" /></Link><Link href="/" className="legal-back">Volver a StreamLock</Link></header>
    <article className="legal-content"><p className="kicker">{eyebrow}</p><h1>{title}</h1><p className="legal-intro">{intro}</p><p className="legal-review">Documento inicial de operación · Requiere revisión jurídica local antes del lanzamiento comercial masivo.</p>{sections.map((section) => <section key={section.title}><h2>{section.title}</h2>{section.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</section>)}<section><h2>Contacto</h2><p>Para soporte operativo, escribe a <a href={`mailto:${supportContact.email}`}>{supportContact.email}</a> o por <a href={`${supportContact.whatsappUrl}?text=${encodeURIComponent("Hola, necesito ayuda con StreamLock.")}`} target="_blank" rel="noreferrer">WhatsApp {supportContact.whatsappDisplay}</a>.</p></section></article>
  </main>;
}
