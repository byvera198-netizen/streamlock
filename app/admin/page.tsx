import AdminTransfersClient from "./transfers-client";
import AdminDisputesClient from "./disputes-client";
import AdminWithdrawalsClient from "./withdrawals-client";
import AdminDeliveriesClient from "./deliveries-client";
import AdminProfilesClient from "./profiles-client";

export const dynamic = "force-dynamic";

export default function AdminPage() {
  return <><AdminTransfersClient /><AdminProfilesClient /><AdminDisputesClient /><AdminDeliveriesClient /><AdminWithdrawalsClient /></>;
}
