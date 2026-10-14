"use client";

import { FormEvent, useState } from "react";
import { readJson } from "../../lib/client-json";

export default function ProductCodeSearch() {
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const normalized = code.trim().toUpperCase();
    const response = await fetch(`/api/products/search?code=${encodeURIComponent(normalized)}`);
    const payload = await readJson(response);
    if (response.ok && payload.checkoutUrl) {
      window.location.assign(payload.checkoutUrl);
      return;
    }
    setBusy(false);
    setMessage(payload.error ?? "No encontramos ese producto.");
  }

  return <form className="product-code-search" onSubmit={search}>
    <label>Código del producto<input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="SL-A7K9P2" autoComplete="off" required /></label>
    <button disabled={busy}>{busy ? "Buscando…" : "Buscar producto →"}</button>
    {message && <output>{message}</output>}
  </form>;
}
