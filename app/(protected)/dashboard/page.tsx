import { format, addMonths, parseISO } from "date-fns";
import { getFundingAccounts, getTradesForAccountPeriod } from "@/lib/actions";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
  const accounts = await getFundingAccounts();

  let initialTrades: Awaited<ReturnType<typeof getTradesForAccountPeriod>> = [];

  if (accounts.length > 0) {
    const first = accounts[0];
    const endDate =
      first.account_type === "Evaluación"
        ? format(addMonths(parseISO(first.start_date), 1), "yyyy-MM-dd")
        : format(new Date(), "yyyy-MM-dd");

    initialTrades = await getTradesForAccountPeriod(first.start_date, endDate);
  }

  return (
    <DashboardClient initialTrades={initialTrades} accounts={accounts} />
  );
}
