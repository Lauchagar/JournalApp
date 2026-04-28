"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { format, addMonths, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Trade, FundingAccount } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { FundingAccountForm } from "@/components/funding-account-form";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const AuditExportButton = dynamic(
  () => import("@/components/audit-export-button"),
  { ssr: false }
);

interface DashboardClientProps {
  initialTrades: Trade[];
  accounts: FundingAccount[];
}

function accountEndDate(account: FundingAccount): string {
  if (account.account_type === "Evaluación") {
    return format(addMonths(parseISO(account.start_date), 1), "yyyy-MM-dd");
  }
  return format(new Date(), "yyyy-MM-dd");
}

function CustomTooltip({
  active,
  payload,
  label,
  formatCurrency,
  initialBalance,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
  formatCurrency: (v: number) => string;
  initialBalance: number;
}) {
  if (!active || !payload || !payload.length || !label) return null;
  const value = payload[0].value;
  const pnlAccum = value - initialBalance;
  return (
    <div className="rounded-lg border border-border/50 bg-card px-3 py-2 shadow-lg">
      <p className="text-xs text-muted-foreground mb-1">
        {format(parseISO(String(label)), "dd MMMM yyyy", { locale: es })}
      </p>
      <p className={`text-sm font-bold ${pnlAccum >= 0 ? "text-emerald-400" : "text-red-400"}`}>
        {formatCurrency(pnlAccum)}
      </p>
    </div>
  );
}

export function DashboardClient({ initialTrades, accounts }: DashboardClientProps) {
  const [selectedAccountId, setSelectedAccountId] = useState<string>(
    accounts.length > 0 ? accounts[0].id : ""
  );
  const [trades, setTrades] = useState<Trade[]>(initialTrades);
  const [loadingTrades, setLoadingTrades] = useState(false);

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId) || null;

  const fetchTradesForAccount = useCallback(async (account: FundingAccount) => {
    setLoadingTrades(true);
    try {
      const endDate = accountEndDate(account);
      const params = new URLSearchParams({
        startDate: account.start_date,
        endDate,
      });
      const res = await fetch(`/api/trades?${params.toString()}`);
      const data = await res.json();
      setTrades(Array.isArray(data) ? data : []);
    } catch {
      setTrades([]);
    } finally {
      setLoadingTrades(false);
    }
  }, []);

  // Skip the first render (initialTrades already loaded by the server for the first account)
  const isFirstRender = useMemo(() => ({ current: true }), []);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (!selectedAccount) return;
    fetchTradesForAccount(selectedAccount);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAccountId]);

  const totalPnl = trades.reduce((sum, t) => sum + Number(t.pnl), 0);
  const totalTrades = trades.length;
  const wins = trades.filter(
    (t) => t.result === "Profit" || t.result === "Stop Loss - Positivo"
  ).length;
  const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
  const initialBalance = selectedAccount ? Number(selectedAccount.initial_balance) : 0;
  const currentBalance = initialBalance + totalPnl;

  const chartData = useMemo(() => {
    const data: { date: string; balance: number }[] = [];

    if (selectedAccount) {
      data.push({ date: selectedAccount.start_date, balance: initialBalance });
    }

    let running = initialBalance;
    for (const trade of trades) {
      running += Number(trade.pnl);
      data.push({ date: trade.date, balance: running });
    }

    return data;
  }, [trades, selectedAccount, initialBalance]);

  const formatCurrency = (value: number) => {
    const formatted = Math.abs(value).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return value < 0 ? `-$${formatted}` : `$${formatted}`;
  };

  const lastBalance = chartData.length > 0 ? chartData[chartData.length - 1].balance : initialBalance;
  const isPositive = lastBalance >= initialBalance;

  return (
    <div className="space-y-6">
      {/* Account selector + export */}
      {accounts.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">Cuenta:</span>
          <select
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            className="border border-border rounded-md px-3 py-1.5 text-sm bg-card text-foreground"
          >
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name} — {acc.account_type} — ${Number(acc.initial_balance).toLocaleString()}
              </option>
            ))}
          </select>
          {selectedAccount && (
            <AuditExportButton account={selectedAccount} />
          )}
        </div>
      )}

      {loadingTrades ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-40" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[400px] w-full" />
            </CardContent>
          </Card>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Balance Actual
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-2xl font-bold ${currentBalance >= initialBalance ? "text-emerald-400" : "text-red-400"}`}>
                  {formatCurrency(currentBalance)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total PnL
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-2xl font-bold ${totalPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {formatCurrency(totalPnl)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Win Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{winRate.toFixed(1)}%</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Trades
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{totalTrades}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Evolución del Capital</CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length === 0 ? (
                <div className="flex items-center justify-center h-64 text-muted-foreground">
                  {accounts.length === 0
                    ? "Agrega una cuenta de fondeo para ver la evolución."
                    : "No hay trades registrados para esta cuenta."}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="gradGreen" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradRed" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f87171" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="date"
                      tickFormatter={(val) =>
                        format(parseISO(val), "dd MMM", { locale: es })
                      }
                      fontSize={12}
                      stroke="hsl(215 20% 55%)"
                    />
                    <YAxis
                      tickFormatter={(val) => `$${Number(val).toLocaleString()}`}
                      fontSize={12}
                      stroke="hsl(215 20% 55%)"
                      domain={["dataMin - 100", "dataMax + 100"]}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => (
                        <CustomTooltip
                          active={active}
                          payload={payload as unknown as Array<{ value: number }>}
                          label={label as string}
                          formatCurrency={formatCurrency}
                          initialBalance={initialBalance}
                        />
                      )}
                    />
                    <Area
                      type="monotone"
                      dataKey="balance"
                      stroke={isPositive ? "#34d399" : "#f87171"}
                      fillOpacity={1}
                      fill={isPositive ? "url(#gradGreen)" : "url(#gradRed)"}
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <Separator />

      <FundingAccountForm accounts={accounts} />
    </div>
  );
}
