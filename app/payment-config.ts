import { env } from "cloudflare:workers";

type PaymentMethodStatus = "active" | "manual_review" | "not_configured" | "sandbox_ready";

export type PaymentMethodCapability = {
  id: "bank_transfer" | "paypal" | "cards";
  label: string;
  status: PaymentMethodStatus;
  automated: boolean;
  note: string;
};

const configured = (...names: string[]) => names.every((name) => Boolean((env as unknown as Record<string, string | undefined>)[name]?.trim()));

export function getPaymentCapabilities(): PaymentMethodCapability[] {
  const paypalReady = configured("PAYPAL_CLIENT_ID", "PAYPAL_CLIENT_SECRET", "PAYPAL_WEBHOOK_ID");
  const cardsReady = configured("STRIPE_PUBLISHABLE_KEY", "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET");
  return [
    { id: "bank_transfer", label: "Transferencia o depósito bancario", status: "manual_review", automated: false, note: "Activo. Se revisa el comprobante desde administración." },
    { id: "paypal", label: "PayPal", status: paypalReady ? "sandbox_ready" : "not_configured", automated: false, note: paypalReady ? "Credenciales detectadas; falta conectar el adaptador sandbox." : "Sin credenciales. No se solicita ni se activa ningún pago." },
    { id: "cards", label: "Tarjetas", status: cardsReady ? "sandbox_ready" : "not_configured", automated: false, note: cardsReady ? "Credenciales detectadas; falta conectar el adaptador sandbox." : "Sin credenciales. No se solicita ni se activa ningún pago." },
  ];
}
