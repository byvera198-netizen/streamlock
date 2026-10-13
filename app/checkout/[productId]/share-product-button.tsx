"use client";

import { useState } from "react";

export default function ShareProductButton({ productTitle }: { productTitle: string }) {
  const [message, setMessage] = useState("Compartir producto");

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${productTitle} · StreamLock`, text: "Compra este producto con fondos protegidos en StreamLock.", url });
      } else {
        await navigator.clipboard.writeText(url);
        setMessage("Enlace copiado ✓");
        window.setTimeout(() => setMessage("Compartir producto"), 2200);
      }
    } catch {
      setMessage("No se pudo compartir");
      window.setTimeout(() => setMessage("Compartir producto"), 2200);
    }
  }

  return <button type="button" className="storefront-share" onClick={() => void share()}>{message} ↗</button>;
}
