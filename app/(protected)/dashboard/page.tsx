import { getAllTrades, getFundingAccounts } from "@/lib/actions";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
  const [trades, accounts] = await Promise.all([
    getAllTrades(),
    getFundingAccounts(),
  ]);
  return <DashboardClient trades={trades} accounts={accounts} />;
}
