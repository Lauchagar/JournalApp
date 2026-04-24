import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";
import { Trade, FundingAccount } from "@/lib/types";
import { format, parseISO, addMonths } from "date-fns";
import { es } from "date-fns/locale";

// ── Shared types (imported by audit-export-button) ───────────────────────────
export type ContentNode =
  | { type: "text"; text: string }
  | { type: "image"; src: string };

export type AuditTrade = Omit<Trade, "comments" | "photo_urls"> & {
  contentNodes: ContentNode[];
};

export type AuditDailyNote = {
  id: string;
  date: string;
  contentNodes: ContentNode[];
};

// ── Constants ────────────────────────────────────────────────────────────────
const GREEN = "#16a34a";
const RED = "#dc2626";
const BUY_COLOR = "#2563eb";
const SELL_COLOR = "#ea580c";
const GRAY = "#6b7280";
const LIGHT_GRAY = "#f3f4f6";
const BORDER = "#e5e7eb";
const DARK = "#111827";
const MID = "#374151";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    backgroundColor: "#ffffff",
    paddingTop: 48,
    paddingBottom: 48,
    paddingHorizontal: 48,
    color: DARK,
  },
  coverTitle: {
    fontSize: 30,
    fontFamily: "Helvetica-Bold",
    color: DARK,
    marginBottom: 6,
  },
  coverSubtitle: {
    fontSize: 14,
    color: GRAY,
    marginBottom: 4,
  },
  coverAccount: {
    fontSize: 12,
    color: GRAY,
    marginBottom: 32,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    marginBottom: 28,
  },
  summaryGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 32,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: LIGHT_GRAY,
    borderRadius: 6,
    padding: 14,
  },
  summaryLabel: {
    fontSize: 9,
    color: GRAY,
    marginBottom: 4,
    fontFamily: "Helvetica",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  summaryValue: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
  },
  summaryValueSm: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
  },
  coverFooter: {
    position: "absolute",
    bottom: 32,
    left: 48,
    right: 48,
    fontSize: 9,
    color: GRAY,
    textAlign: "center",
  },
  tradeCard: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 6,
    marginBottom: 20,
    overflow: "hidden",
  },
  tradeHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: LIGHT_GRAY,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  tradeNumber: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: DARK,
    minWidth: 24,
  },
  tradeDate: {
    fontSize: 10,
    color: MID,
    flex: 1,
  },
  tradeDirection: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tradePnl: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    minWidth: 70,
    textAlign: "right",
  },
  tradeBody: {
    padding: 14,
  },
  detailsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: "row",
    gap: 4,
  },
  detailLabel: {
    fontSize: 9,
    color: GRAY,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    fontFamily: "Helvetica",
  },
  detailValue: {
    fontSize: 9,
    color: MID,
    fontFamily: "Helvetica-Bold",
  },
  contentSection: {
    marginBottom: 4,
  },
  contentSectionLabel: {
    fontSize: 9,
    color: GRAY,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 6,
    fontFamily: "Helvetica",
  },
  contentText: {
    fontSize: 10,
    color: MID,
    lineHeight: 1.5,
    marginBottom: 6,
  },
  contentImage: {
    width: "100%",
    borderRadius: 4,
    objectFit: "contain",
    marginBottom: 8,
  },
  pageHeader: {
    fontSize: 10,
    color: GRAY,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    paddingBottom: 8,
  },
});

function formatCurrency(value: number): string {
  const abs = Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return value < 0 ? `-$${abs}` : `$${abs}`;
}

interface TradeMetrics {
  winners: number;
  losers: number;
  profitFactor: number | null;
  expectancy: number;
  maxConsecWins: number;
  maxConsecLosses: number;
  avgConsecWins: number;
  avgConsecLosses: number;
}

function calcMetrics(trades: AuditTrade[]): TradeMetrics {
  const sorted = [...trades].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.trade_number - b.trade_number;
  });

  const winners = sorted.filter((t) => t.result !== "BE" && Number(t.pnl) > 0).length;
  const losers = sorted.filter((t) => t.result !== "BE" && Number(t.pnl) < 0).length;

  const grossProfit = sorted
    .filter((t) => t.result !== "BE" && Number(t.pnl) > 0)
    .reduce((sum, t) => sum + Number(t.pnl), 0);

  const grossLoss = Math.abs(
    sorted
      .filter((t) => t.result !== "BE" && Number(t.pnl) < 0)
      .reduce((sum, t) => sum + Number(t.pnl), 0)
  );

  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : null;

  const expectancy =
    sorted.length > 0
      ? sorted.reduce((sum, t) => sum + Number(t.pnl), 0) / sorted.length
      : 0;

  // Rachas: si el resultado es BE, no corta ni suma racha (aunque pnl no sea 0)
  let currentWinStreak = 0;
  let currentLossStreak = 0;
  const winStreaks: number[] = [];
  const lossStreaks: number[] = [];

  for (const t of sorted) {
    if (t.result === "BE") continue;
    const pnl = Number(t.pnl);
    if (pnl > 0) {
      currentWinStreak++;
      if (currentLossStreak > 0) {
        lossStreaks.push(currentLossStreak);
        currentLossStreak = 0;
      }
    } else if (pnl < 0) {
      currentLossStreak++;
      if (currentWinStreak > 0) {
        winStreaks.push(currentWinStreak);
        currentWinStreak = 0;
      }
    }
    // pnl === 0: neutral, no modifica ni corta la racha actual
  }
  if (currentWinStreak > 0) winStreaks.push(currentWinStreak);
  if (currentLossStreak > 0) lossStreaks.push(currentLossStreak);

  const maxConsecWins = winStreaks.length > 0 ? Math.max(...winStreaks) : 0;
  const maxConsecLosses =
    lossStreaks.length > 0 ? Math.max(...lossStreaks) : 0;

  const avgConsecWins =
    winStreaks.length > 0
      ? winStreaks.reduce((a, b) => a + b, 0) / winStreaks.length
      : 0;
  const avgConsecLosses =
    lossStreaks.length > 0
      ? lossStreaks.reduce((a, b) => a + b, 0) / lossStreaks.length
      : 0;

  return {
    winners,
    losers,
    profitFactor,
    expectancy,
    maxConsecWins,
    maxConsecLosses,
    avgConsecWins,
    avgConsecLosses,
  };
}

interface Props {
  trades: AuditTrade[];
  account: FundingAccount;
  dailyNotes: AuditDailyNote[];
}

export function MonthlyAuditPDF({ trades, account, dailyNotes }: Props) {
  const startDate = parseISO(account.start_date);
  const endDate = addMonths(startDate, 1);

  const periodLabel = `${format(startDate, "d 'de' MMMM", { locale: es })} – ${format(endDate, "d 'de' MMMM yyyy", { locale: es })}`;

  const totalPnl = trades.reduce((sum, t) => sum + Number(t.pnl), 0);
  const wins = trades.filter(
    (t) => t.result === "Profit" || t.result === "Stop Loss - Positivo"
  ).length;
  const winRate = trades.length > 0 ? (wins / trades.length) * 100 : 0;

  const {
    winners,
    losers,
    profitFactor,
    expectancy,
    maxConsecWins,
    maxConsecLosses,
    avgConsecWins,
    avgConsecLosses,
  } = calcMetrics(trades);

  const generatedAt = format(new Date(), "dd/MM/yyyy HH:mm");

  return (
    <Document
      title={`Auditoría Mensual - ${account.name}`}
      author="Trading Journal"
    >
      {/* ── PAGE 1: Cover & Summary ─────────────────────────────────────────── */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.coverTitle}>Auditoría Mensual</Text>
        <Text style={styles.coverSubtitle}>{periodLabel}</Text>
        <Text style={styles.coverAccount}>
          {account.name} · {account.account_type} · Balance inicial:{" "}
          {formatCurrency(Number(account.initial_balance))}
        </Text>

        <View style={styles.divider} />

        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>PnL Total</Text>
            <Text style={[styles.summaryValue, { color: totalPnl >= 0 ? GREEN : RED }]}>
              {formatCurrency(totalPnl)}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Trades</Text>
            <Text style={[styles.summaryValue, { color: DARK }]}>
              {trades.length}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Win Rate</Text>
            <Text style={[styles.summaryValue, { color: winRate >= 50 ? GREEN : RED }]}>
              {winRate.toFixed(1)}%
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Balance Final</Text>
            <Text
              style={[
                styles.summaryValue,
                {
                  color:
                    Number(account.initial_balance) + totalPnl >=
                    Number(account.initial_balance)
                      ? GREEN
                      : RED,
                },
              ]}
            >
              {formatCurrency(Number(account.initial_balance) + totalPnl)}
            </Text>
          </View>
        </View>

        {/* ── Fila 2: Winners / Losers / Profit Factor / Expectancy ───────── */}
        <View style={[styles.summaryGrid, { marginBottom: 12 }]}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Winners</Text>
            <Text style={[styles.summaryValueSm, { color: GREEN }]}>
              {winners}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Losers</Text>
            <Text style={[styles.summaryValueSm, { color: RED }]}>
              {losers}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Profit Factor</Text>
            <Text
              style={[
                styles.summaryValueSm,
                {
                  color:
                    profitFactor === null
                      ? GRAY
                      : profitFactor >= 1
                      ? GREEN
                      : RED,
                },
              ]}
            >
              {profitFactor === null ? "N/A" : profitFactor.toFixed(2)}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Expectancy</Text>
            <Text
              style={[
                styles.summaryValueSm,
                { color: expectancy >= 0 ? GREEN : RED },
              ]}
            >
              {formatCurrency(expectancy)}
            </Text>
          </View>
        </View>

        {/* ── Fila 3: Rachas consecutivas ─────────────────────────────────── */}
        <View style={[styles.summaryGrid, { marginBottom: 28 }]}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Max. Consec. Wins</Text>
            <Text style={[styles.summaryValueSm, { color: GREEN }]}>
              {maxConsecWins}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Avg. Consec. Wins</Text>
            <Text style={[styles.summaryValueSm, { color: GREEN }]}>
              {avgConsecWins.toFixed(1)}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Max. Consec. Losses</Text>
            <Text style={[styles.summaryValueSm, { color: RED }]}>
              {maxConsecLosses}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Avg. Consec. Losses</Text>
            <Text style={[styles.summaryValueSm, { color: RED }]}>
              {avgConsecLosses.toFixed(1)}
            </Text>
          </View>
        </View>

        {/* Trade list overview */}
        <View style={styles.divider} />
        <Text style={{ fontSize: 11, fontFamily: "Helvetica-Bold", marginBottom: 12 }}>
          Listado de trades
        </Text>
        {trades.map((trade) => (
          <View
            key={trade.id}
            style={{
              flexDirection: "row",
              paddingVertical: 6,
              borderBottomWidth: 1,
              borderBottomColor: BORDER,
              alignItems: "center",
            }}
          >
            <Text style={{ fontSize: 9, color: GRAY, width: 24 }}>
              #{trade.trade_number}
            </Text>
            <Text style={{ fontSize: 9, color: MID, flex: 1 }}>
              {format(parseISO(trade.date), "dd/MM/yyyy")}
            </Text>
            <Text
              style={{
                fontSize: 9,
                fontFamily: "Helvetica-Bold",
                color: trade.direction === "Buy" ? BUY_COLOR : SELL_COLOR,
                width: 30,
              }}
            >
              {trade.direction}
            </Text>
            <Text style={{ fontSize: 9, color: GRAY, flex: 2 }}>
              {trade.result}
            </Text>
            <Text
              style={{
                fontSize: 9,
                fontFamily: "Helvetica-Bold",
                color: Number(trade.pnl) >= 0 ? GREEN : RED,
                width: 64,
                textAlign: "right",
              }}
            >
              {formatCurrency(Number(trade.pnl))}
            </Text>
          </View>
        ))}

        <Text style={styles.coverFooter}>
          Generado el {generatedAt} · Trading Journal
        </Text>
      </Page>

      {/* ── PAGES 2+: One page per trade ────────────────────────────────────── */}
      {trades.map((trade, idx) => {
        const pnl = Number(trade.pnl);
        const hasContent = trade.contentNodes.length > 0;

        return (
          <Page key={trade.id} size="A4" style={styles.page}>
            <Text style={styles.pageHeader}>
              Auditoría Mensual · {account.name} · {periodLabel}
            </Text>

            <View style={styles.tradeCard}>
              {/* Header */}
              <View style={styles.tradeHeader}>
                <Text style={styles.tradeNumber}>#{trade.trade_number}</Text>
                <Text style={styles.tradeDate}>
                  {format(parseISO(trade.date), "EEEE dd 'de' MMMM yyyy", { locale: es })}
                </Text>
                <Text
                  style={[
                    styles.tradeDirection,
                    {
                      color: trade.direction === "Buy" ? BUY_COLOR : SELL_COLOR,
                      backgroundColor: trade.direction === "Buy" ? "#dbeafe" : "#ffedd5",
                    },
                  ]}
                >
                  {trade.direction.toUpperCase()}
                </Text>
                <Text style={[styles.tradePnl, { color: pnl >= 0 ? GREEN : RED }]}>
                  {formatCurrency(pnl)}
                </Text>
              </View>

              {/* Body */}
              <View style={styles.tradeBody}>
                {/* Metadata */}
                <View style={styles.detailsRow}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Resultado:</Text>
                    <Text style={styles.detailValue}>{trade.result}</Text>
                  </View>
                  {trade.entry_time && (
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Horario:</Text>
                      <Text style={styles.detailValue}>{trade.entry_time}</Text>
                    </View>
                  )}
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Tipo:</Text>
                    <Text style={styles.detailValue}>{trade.operation_type}</Text>
                  </View>
                  {trade.units !== undefined && trade.units !== null && (
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Unidades:</Text>
                      <Text style={styles.detailValue}>{trade.units}</Text>
                    </View>
                  )}
                  {Array.isArray(trade.entry_type) && trade.entry_type.length > 0 && (
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Entrada:</Text>
                      <Text style={styles.detailValue}>
                        {trade.entry_type.join(", ")}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Inline content: text paragraphs and images in their original order */}
                {hasContent && (
                  <View style={styles.contentSection}>
                    <Text style={styles.contentSectionLabel}>Notas</Text>
                    {trade.contentNodes.map((node, i) =>
                      node.type === "text" ? (
                        <Text key={i} style={styles.contentText}>
                          {node.text}
                        </Text>
                      ) : (
                        // eslint-disable-next-line jsx-a11y/alt-text
                        <Image
                          key={i}
                          src={node.src}
                          style={styles.contentImage}
                          cache={false}
                        />
                      )
                    )}
                  </View>
                )}

                <Text
                  style={{
                    fontSize: 8,
                    color: LIGHT_GRAY,
                    marginTop: 8,
                    textAlign: "right",
                  }}
                >
                  {idx + 1} / {trades.length}
                </Text>
              </View>
            </View>
          </Page>
        );
      })}
      {/* ── DAILY NOTES pages ───────────────────────────────────────────────── */}
      {dailyNotes.length > 0 && (
        <>
          {/* Section cover page */}
          <Page size="A4" style={styles.page}>
            <Text style={styles.pageHeader}>
              Auditoría Mensual · {account.name} · {periodLabel}
            </Text>
            <Text
              style={{
                fontSize: 24,
                fontFamily: "Helvetica-Bold",
                color: DARK,
                marginBottom: 8,
              }}
            >
              Notas
            </Text>
            <Text style={{ fontSize: 12, color: GRAY, marginBottom: 28 }}>
              Días sin operaciones con anotaciones registradas
            </Text>
            <View style={styles.divider} />
            {dailyNotes.map((note) => (
              <View
                key={note.id}
                style={{
                  flexDirection: "row",
                  paddingVertical: 6,
                  borderBottomWidth: 1,
                  borderBottomColor: BORDER,
                  alignItems: "center",
                }}
              >
                <Text style={{ fontSize: 10, color: MID, flex: 1 }}>
                  {format(parseISO(note.date), "EEEE dd 'de' MMMM yyyy", { locale: es })}
                </Text>
                <Text style={{ fontSize: 9, color: GRAY }}>
                  {note.contentNodes.filter((n) => n.type === "image").length > 0
                    ? `${note.contentNodes.filter((n) => n.type === "image").length} imagen(es)`
                    : "Solo texto"}
                </Text>
              </View>
            ))}
          </Page>

          {/* One page per daily note */}
          {dailyNotes.map((note, idx) => (
            <Page key={`note-${note.id}`} size="A4" style={styles.page}>
              <Text style={styles.pageHeader}>
                Auditoría Mensual · {account.name} · {periodLabel}
              </Text>

              <View style={styles.tradeCard}>
                <View
                  style={[
                    styles.tradeHeader,
                    { backgroundColor: "#f0f9ff" },
                  ]}
                >
                  <Text
                    style={{
                      fontSize: 10,
                      fontFamily: "Helvetica-Bold",
                      color: "#0369a1",
                      flex: 1,
                    }}
                  >
                    {format(parseISO(note.date), "EEEE dd 'de' MMMM yyyy", { locale: es })}
                  </Text>
                  <Text style={{ fontSize: 9, color: GRAY }}>Sin operación</Text>
                </View>

                <View style={styles.tradeBody}>
                  <View style={styles.contentSection}>
                    <Text style={styles.contentSectionLabel}>Notas del día</Text>
                    {note.contentNodes.map((node, i) =>
                      node.type === "text" ? (
                        <Text key={i} style={styles.contentText}>
                          {node.text}
                        </Text>
                      ) : (
                        // eslint-disable-next-line jsx-a11y/alt-text
                        <Image
                          key={i}
                          src={node.src}
                          style={styles.contentImage}
                          cache={false}
                        />
                      )
                    )}
                  </View>

                  <Text
                    style={{
                      fontSize: 8,
                      color: LIGHT_GRAY,
                      marginTop: 8,
                      textAlign: "right",
                    }}
                  >
                    Nota {idx + 1} / {dailyNotes.length}
                  </Text>
                </View>
              </View>
            </Page>
          ))}
        </>
      )}
    </Document>
  );
}
