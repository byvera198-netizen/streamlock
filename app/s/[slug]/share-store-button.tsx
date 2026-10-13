"use client";

import { useState } from "react";

export default function ShareStoreButton() {
  const [message, setMessage] = useState("Compartir vitrina");

  async function share() {
    const url = window.location.href;
    const title = document.title || "Vitrina StreamLock";
    try {
      if (navigator.share) {
        await navigator.share({ title, text: "Mira esta vitrina con compra protegida en StreamLock.", url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setMessage("Enlace copiado ✓");
      window.setTimeout(() => setMessage("Compartir vitrina"), 2200);
    } catch {
      setMessage("No se pudo compartir");
      window.setTimeout(() => setMessage("Compartir vitrina"), 2200);
    }
  }

  return <button type="button" className="storefront-share" onClick={() => void share()}>{message} ↗</button>;
}
