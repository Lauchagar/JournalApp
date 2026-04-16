"use client";

import { useState } from "react";
import { pdf } from "@react-pdf/renderer";
import { addMonths, format, parseISO } from "date-fns";
import { FundingAccount, Trade } from "@/lib/types";
import { createClient } from "@/lib/supabase";
import {
  MonthlyAuditPDF,
  ContentNode,
  AuditTrade,
  AuditDailyNote,
} from "./monthly-audit-pdf";

interface AuditExportButtonProps {
  account: FundingAccount;
}

function stripHtmlText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function fetchImageAsBase64(url: string): Promise<string | null> {
  // TradingView share links are not direct image files — skip them
  if (url.includes("tradingview.com/x/")) return null;

  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("FileReader error"));
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// Parses TipTap HTML into an ordered sequence of text and image nodes,
// preserving the original layout from the editor.
async function parseHtmlToContentNodes(
  html: string | null
): Promise<ContentNode[]> {
  if (!html) return [];

  const nodes: ContentNode[] = [];
  const imgRegex = /<img[^>]+src="([^"]+)"[^>]*>/gi;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = imgRegex.exec(html)) !== null) {
    // Text segment before this image
    const textBefore = stripHtmlText(html.slice(lastIndex, match.index));
    if (textBefore) nodes.push({ type: "text", text: textBefore });

    // Convert image URL to Base64
    const base64 = await fetchImageAsBase64(match[1]);
    if (base64) nodes.push({ type: "image", src: base64 });

    lastIndex = match.index + match[0].length;
  }

  // Remaining text after the last image
  const textAfter = stripHtmlText(html.slice(lastIndex));
  if (textAfter) nodes.push({ type: "text", text: textAfter });

  return nodes;
}

export default function AuditExportButton({ account }: AuditExportButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const startDate = account.start_date;
      const endDate = format(
        addMonths(parseISO(account.start_date), 1),
        "yyyy-MM-dd"
      );

      const { data, error: fetchError } = await supabase
        .from("trades")
        .select("*")
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date", { ascending: true });

      if (fetchError) throw new Error(fetchError.message);

      const rawTrades: Trade[] = (data ?? []) as Trade[];

      // Fetch daily notes for the same date range
      const { data: notesData } = await supabase
        .from("daily_notes")
        .select("id, date, content")
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date", { ascending: true });

      // Parse each trade's TipTap HTML into ordered content nodes (text + images),
      // converting image URLs to Base64 in their original position.
      const trades: AuditTrade[] = await Promise.all(
        rawTrades.map(async (trade) => {
          const contentNodes = await parseHtmlToContentNodes(trade.comments);
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { comments: _c, photo_urls: _p, ...rest } = trade;
          return { ...rest, contentNodes };
        })
      );

      // Build set of dates that already have trades to exclude them from notes
      const tradeDates = new Set(rawTrades.map((t) => t.date));

      const dailyNotes: AuditDailyNote[] = await Promise.all(
        (notesData ?? [])
          .filter(
            (n: { id: string; date: string; content: string | null }) =>
              !tradeDates.has(n.date) && !!n.content
          )
          .map(
            async (n: {
              id: string;
              date: string;
              content: string | null;
            }) => ({
              id: n.id,
              date: n.date,
              contentNodes: await parseHtmlToContentNodes(n.content),
            })
          )
      );

      const blob = await pdf(
        <MonthlyAuditPDF trades={trades} account={account} dailyNotes={dailyNotes} />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `auditoria-${account.name.replace(/\s+/g, "-").toLowerCase()}-${startDate}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error generando PDF:", err);
      setError("No se pudo generar el PDF. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        onClick={handleExport}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? (
          <>
            <svg
              className="h-4 w-4 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Generando PDF...
          </>
        ) : (
          <>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
              />
            </svg>
            Exportar Auditoría a PDF
          </>
        )}
      </button>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
