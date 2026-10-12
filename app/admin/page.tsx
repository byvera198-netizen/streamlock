import AdminTransfersClient from "./transfers-client";
import AdminDisputesClient from "./disputes-client";

export const dynamic = "force-dynamic";

export default function AdminPage() {
  return <><AdminTransfersClient /><AdminDisputesClient /></>;
}
