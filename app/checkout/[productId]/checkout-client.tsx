"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { readJson } from "../../../lib/client-json";

type Product = {
  id: number;
  title: string;
  description: string;
  brand: string;
  model: string;
  storage: string | null;
  color: string | null;
  condition: string;
  warrantyMonths: number;
  priceCents: number;
  stock: number;
  imageUrl: string | null;
};

type Store = { name: string; slug: string };
type BankAccount = { id: string; bank: string; accountType: string; accountNumber: string };

function conditionLabel(value: string) {
  return value === "used" ? "Usado" : value === "refurbished" ? "Reacondicionado" : "Nuevo";
}

export default function CheckoutClient({ product, store }: { product: Product; store: Store }) {
  const [quantity, setQuantity] = useState(1);
  const [deliveryMethod, setDeliveryMethod] = useState("courier");
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [bank, setBank] = useState("pichincha");
  const [reference, setReference] = useState("");
  const [receipt, setReceipt] = useState<File | null>(null);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [profileRequired, setProfileRequired] = useState(false);
  const [profileNotApproved, setProfileNotApproved] = useState(false);
  const subtotal = useMemo(() => product.priceCents * quantity, [product.priceCents, quantity]);
  const fee = Math.round(subtotal * 0.07);
  const productImage = product.imageUrl?.startsWith("r2://") ? `/api/products/media?key=${encodeURIComponent(product.imageUrl.slice(5))}` : product.imageUrl;
  const specs = [
    product.brand && product.model ? `${product.brand} ${product.model}` : product.brand || product.model,
    product.storage,
    product.color,
    conditionLabel(product.condition),
    product.warrantyMonths ? `${product.warrantyMonths} meses de garantía` : null,
  ].filter(Boolean) as string[];

  const loadAccounts = useCallback(async () => {
    if (accounts.length) return;
    const response = await fetch("/api/payments/bank-transfer");
    if (response.ok) setAccounts((await readJson(response)).accounts);
  }, [accounts.length]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadAccounts();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadAccounts]);

  async function createOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    if (!receipt) {
      setBusy(false);
      setMessage("Adjunta el comprobante del depósito o transferencia para continuar.");
      return;
    }

    const response = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: product.id, quantity, deliveryMethod }),
    });
    const payload = await readJson(response);
    setBusy(false);
    if (!response.ok) {
      setProfileRequired(payload.code === "PROFILE_REQUIRED");
      setProfileNotApproved(payload.code === "PROFILE_NOT_APPROVED");
      setMessage(payload.error ?? "No se pudo iniciar la orden.");
      return;
    }

    setProfileRequired(false);
    setProfileNotApproved(false);
    const transferData = new FormData();
    transferData.set("orderId", String(payload.order.id));
    transferData.set("bank", bank);
    transferData.set("reference", reference);
    transferData.set("receipt", receipt);
    const transfer = await fetch("/api/payments/bank-transfer", { method: "POST", body: transferData });
    const transferPayload = await readJson(transfer);
    setMessage(transfer.ok ? `Orden #${payload.order.id} creada. ${transferPayload.message}` : (transferPayload.error ?? "La orden fue creada, pero falta registrar el comprobante."));
  }

  return (
    <main className="checkout-shell">
      <header className="storefront-header">
        <Link href="/" prefetch={false} className="brand-logo"><img src="/streamlock-logo.jpg" alt="StreamLock" /></Link>
        <span className="secure-label">Checkout protegido · {store.name}</span>
      </header>
      <section className="checkout-card">
        <div className="checkout-product">
          <div className="checkout-image">{productImage ? <img src={productImage} alt={product.title} /> : product.title.slice(0, 1).toUpperCase()}</div>
          <p className="kicker">COMPRA PROTEGIDA</p>
          <h1>{product.title}</h1>
          {product.description && <p className="product-description">{product.description}</p>}
          {specs.length > 0 && <div className="checkout-specs" aria-label="Especificaciones del producto">{specs.map((spec) => <span key={spec}>{spec}</span>)}</div>}
          <p className="checkout-muted">Vendido por {store.name}. El vendedor no recibe los fondos hasta validar la entrega.</p>
          <strong className="checkout-price">${(product.priceCents / 100).toFixed(2)}</strong>
        </div>
        <form className="checkout-form" onSubmit={createOrder}>
          <label>Cantidad<select value={quantity} onChange={event => setQuantity(Number(event.target.value))}>{Array.from({ length: Math.min(product.stock, 20) }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}</select></label>
          <label>Entrega<select value={deliveryMethod} onChange={event => setDeliveryMethod(event.target.value)}><option value="courier">Courier / encomienda</option><option value="pickup">Entrega presencial</option></select></label>
          <label>Método de pago<select value={paymentMethod} onChange={event => { setPaymentMethod(event.target.value); if (event.target.value === "bank_transfer") void loadAccounts(); }}><option value="bank_transfer">Transferencia o depósito bancario</option><option value="card" disabled>Tarjeta (próximamente)</option></select></label>
          {paymentMethod === "bank_transfer" && <div className="bank-transfer-box"><b>Realiza el depósito a una de estas cuentas</b>{accounts.map(account => <button className={`bank-account ${bank === account.id ? "selected" : ""}`} type="button" key={account.id} onClick={() => setBank(account.id)}><span>{account.bank}</span><small>{account.accountType} · {account.accountNumber}</small></button>)}<label>Número de comprobante<input value={reference} onChange={event => setReference(event.target.value)} placeholder="Ej. 00458219" required /></label><label>Archivo del comprobante (PDF, JPG, PNG o WebP) *<input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={event => setReceipt(event.target.files?.[0] ?? null)} required /></label><small>Obligatorio · máximo 5 MB. La activación se confirma después de verificar el comprobante.</small></div>}
          <div className="checkout-summary"><span>Subtotal <b>${(subtotal / 100).toFixed(2)}</b></span><span>Servicio de custodia (7%) <b>${(fee / 100).toFixed(2)}</b></span><span>Total <b>${((subtotal + fee) / 100).toFixed(2)}</b></span></div>
          <button disabled={busy || product.stock < 1 || !reference.trim() || !receipt}>{busy ? "Registrando…" : "Registrar transferencia →"}</button>
          {message && <output>{message}</output>}
          {(profileRequired || profileNotApproved) && <Link prefetch={false} className="profile-required-link" href="/profile">Revisar mi perfil protegido →</Link>}
          <small>La orden permanece pendiente hasta que un administrador valide el comprobante. No envíes el producto antes de recibir la confirmación.</small>
        </form>
      </section>
    </main>
  );
}
