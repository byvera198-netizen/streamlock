import AdminTransfersClient from "./transfers-client";
import AdminDisputesClient from "./disputes-client";
import AdminWithdrawalsClient from "./withdrawals-client";
import AdminDeliveriesClient from "./deliveries-client";
import AdminProfilesClient from "./profiles-client";
import AdminBankAccountsClient from "./bank-accounts-client";
import AdminStoresClient from "./stores-client";
import AdminWhatsAppEventsClient from "./whatsapp-events-client";

export const dynamic = "force-dynamic";

export default function AdminPage() {
  return <><AdminTransfersClient /><AdminBankAccountsClient /><AdminProfilesClient /><AdminStoresClient /><AdminDisputesClient /><AdminDeliveriesClient /><AdminWithdrawalsClient /><AdminWhatsAppEventsClient /></>;
}
