import { env } from "cloudflare:workers";
import { redirect } from "next/navigation";
import AdminTransfersClient from "./transfers-client";
import AdminDisputesClient from "./disputes-client";
import AdminWithdrawalsClient from "./withdrawals-client";
import AdminWithdrawalHistoryClient from "./withdrawal-history-client";
import AdminDeliveriesClient from "./deliveries-client";
import AdminProfilesClient from "./profiles-client";
import AdminBankAccountsClient from "./bank-accounts-client";
import AdminStoresClient from "./stores-client";
import AdminWhatsAppEventsClient from "./whatsapp-events-client";
import AdminPaymentMethodsClient from "./payment-methods-client";
import AdminPayoutAccountsClient from "./payout-accounts-client";
import AdminOverview from "./admin-overview";
import { getChatGPTUser } from "../chatgpt-auth";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getChatGPTUser();
  const adminEmail = env.STREAMLOCK_ADMIN_EMAIL?.trim().toLowerCase();
  if (!user || !adminEmail || user.email.trim().toLowerCase() !== adminEmail) redirect("/");

  return <><AdminOverview /><div id="payment-reviews"><AdminTransfersClient /></div><div id="bank-receiving"><AdminBankAccountsClient /></div><div id="identity-reviews"><AdminProfilesClient /></div><div id="payout-reviews"><AdminPayoutAccountsClient /></div><div id="store-reviews"><AdminStoresClient /></div><div id="disputes"><AdminDisputesClient /></div><div id="deliveries"><AdminDeliveriesClient /></div><div id="withdrawals"><AdminWithdrawalsClient /><AdminWithdrawalHistoryClient /></div><div id="integrations"><AdminWhatsAppEventsClient /><AdminPaymentMethodsClient /></div></>;
}
