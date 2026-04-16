"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  addMonths,
  subMonths,
  isSameDay,
  getISOWeek,
  parseISO,
} from "date-fns";
import { es } from "date-fns/locale";
import { Trade, FundingAccount, DailyNote } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { TradeModal } from "./trade-modal";

interface DayStats {
  pnl: number;
  count: number;
  wins: number;
}

export function CalendarClient() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [trades, setTrades] = useState<Trade[]>([]);
  const [accounts, setAccounts] = useState<FundingAccount[]>([]);
  const [dailyNotes, setDailyNotes] = useState<DailyNote[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth() + 1;
    try {
      const [tradesRes, accountsRes, notesRes] = await Promise.all([
        fetch(`/api/trades?year=${year}&month=${month}`),
        fetch("/api/funding-accounts"),
        fetch(`/api/daily-notes?year=${year}&month=${month}`),
      ]);
      const tradesData = await tradesRes.json();
      const accountsData = await accountsRes.json();
      const notesData = await notesRes.json();
      setTrades(Array.isArray(tradesData) ? tradesData : []);
      setAccounts(Array.isArray(accountsData) ? accountsData : []);
      setDailyNotes(Array.isArray(notesData) ? notesData : []);
    } catch {
      setTrades([]);
      setAccounts([]);
      setDailyNotes([]);
    }
    setLoading(false);
  }, [currentMonth]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  const getDayStats = (date: Date): DayStats => {
    const dateStr = format(date, "yyyy-MM-dd");
    const dayTrades = trades.filter((t) => t.date === dateStr);
    return {
      pnl: dayTrades.reduce((sum, t) => sum + Number(t.pnl), 0),
      count: dayTrades.length,
      wins: dayTrades.filter(
        (t) =>
          t.result === "Profit" || t.result === "Stop Loss - Positivo"
      ).length,
    };
  };

  const getWeekStats = (week: Date[]): DayStats => {
    return week.reduce<DayStats>(
      (acc, day) => {
        const ds = getDayStats(day);
        return {
          pnl: acc.pnl + ds.pnl,
          count: acc.count + ds.count,
          wins: acc.wins + ds.wins,
        };
      },
      { pnl: 0, count: 0, wins: 0 }
    );
  };

  const getDayMarkers = (date: Date) => {
    const markers: { type: "start" | "expiry"; account: FundingAccount }[] = [];
    for (const acc of accounts) {
      const start = parseISO(acc.start_date);
      if (isSameDay(date, start)) {
        markers.push({ type: "start", account: acc });
      }
      if (acc.account_type === "Evaluación") {
        const expiry = addMonths(start, 1);
        if (isSameDay(date, expiry)) {
          markers.push({ type: "expiry", account: acc });
        }
      }
    }
    return markers;
  };

  const noteByDate = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const n of dailyNotes) map.set(n.date, n.content);
    return map;
  }, [dailyNotes]);

  const dayHasNonEmptyNote = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const html = noteByDate.get(dateStr);
    if (!html) return false;
    const stripped = html.replace(/<(.|\n)*?>/g, "").trim();
    return stripped.length > 0;
  };

  const formatCurrency = (value: number) => {
    const formatted = Math.abs(value).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return value < 0 ? `-$${formatted}` : `$${formatted}`;
  };

  const winRateStr = (wins: number, total: number) =>
    total > 0 ? `${((wins / total) * 100).toFixed(0)}%` : "";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
        >
          ← Anterior
        </Button>
        <h2 className="text-xl font-semibold capitalize">
          {format(currentMonth, "MMMM yyyy", { locale: es })}
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
        >
          Siguiente →
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="grid grid-cols-8 bg-muted/50">
          {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((day) => (
            <div
              key={day}
              className="p-2 text-center text-sm font-medium text-muted-foreground"
            >
              {day}
            </div>
          ))}
          <div className="p-2 text-center text-sm font-medium text-muted-foreground">
            Semana
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            Cargando...
          </div>
        ) : (
          weeks.map((week, weekIdx) => {
            const ws = getWeekStats(week);
            return (
              <div key={weekIdx} className="grid grid-cols-8 border-t border-border/50">
                {week.map((day) => {
                  const ds = getDayStats(day);
                  const isCurrentMonth = isSameMonth(day, currentMonth);
                  const isToday = isSameDay(day, new Date());
                  const markers = getDayMarkers(day);
                  const hasNote = ds.count === 0 && dayHasNonEmptyNote(day);
                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => setSelectedDate(day)}
                      className={`p-1.5 min-h-[90px] text-left border-r border-border/50 last:border-r-0 transition-colors hover:bg-accent/50 ${
                        !isCurrentMonth ? "opacity-30" : ""
                      } ${isToday ? "bg-primary/10 ring-1 ring-inset ring-primary/30" : ""}`}
                    >
                      <div
                        className={`text-sm font-medium ${isToday ? "text-primary font-bold" : ""}`}
                      >
                        {format(day, "d")}
                      </div>
                      {ds.count > 0 && (
                        <div className="mt-0.5 space-y-0.5">
                          <div
                            className={`text-xs font-semibold ${ds.pnl > 0 ? "text-emerald-400" : ds.pnl < 0 ? "text-red-400" : "text-muted-foreground"}`}
                          >
                            {formatCurrency(ds.pnl)}
                          </div>
                          <div className="text-[10px] text-muted-foreground leading-tight">
                            {ds.count} trade{ds.count !== 1 ? "s" : ""} · {winRateStr(ds.wins, ds.count)} WR
                          </div>
                        </div>
                      )}
                      {markers.map((m, i) => (
                        <div
                          key={i}
                          className={`text-[10px] mt-0.5 px-1 py-0.5 rounded truncate ${
                            m.type === "start"
                              ? "bg-blue-500/20 text-blue-400"
                              : "bg-amber-500/20 text-amber-400"
                          }`}
                          title={
                            m.type === "start"
                              ? `Inicio: ${m.account.name}`
                              : `Expira: ${m.account.name}`
                          }
                        >
                          {m.type === "start" ? "▶" : "⏰"} {m.account.name.slice(0, 10)}
                        </div>
                      ))}
                      {hasNote && (
                        <div
                          className="text-[12px] mt-0.5"
                          title="📝 Nota del día (sin trades)"
                        >
                          📝
                        </div>
                      )}
                    </button>
                  );
                })}
                <div className="p-1.5 min-h-[90px] flex flex-col items-center justify-center bg-muted/20">
                  <div className="text-xs text-muted-foreground">
                    S{getISOWeek(week[0])}
                  </div>
                  {ws.count > 0 && (
                    <div className="mt-1 text-center space-y-0.5">
                      <div
                        className={`text-xs font-semibold ${ws.pnl > 0 ? "text-emerald-400" : ws.pnl < 0 ? "text-red-400" : "text-muted-foreground"}`}
                      >
                        {formatCurrency(ws.pnl)}
                      </div>
                      <div className="text-[10px] text-muted-foreground leading-tight">
                        {ws.count}t · {winRateStr(ws.wins, ws.count)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {selectedDate && (
        <TradeModal
          date={selectedDate}
          trades={trades.filter(
            (t) => t.date === format(selectedDate, "yyyy-MM-dd")
          )}
          dailyNoteContent={
            dayHasNonEmptyNote(selectedDate)
              ? noteByDate.get(format(selectedDate, "yyyy-MM-dd")) || ""
              : ""
          }
          onClose={() => setSelectedDate(null)}
          onRefresh={fetchData}
        />
      )}
    </div>
  );
}
