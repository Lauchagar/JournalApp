import { NextResponse } from "next/server";
import { XMLParser } from "fast-xml-parser";
import { formatInTimeZone, toDate } from "date-fns-tz";
import { es } from "date-fns/locale";

/** Zona del feed (XML suele estar en GMT/UTC). Ajustá si los horarios no calzan. */
const SOURCE_TZ =
  process.env.NEWS_CALENDAR_SOURCE_TIMEZONE?.trim() || "Etc/UTC";
/** Zona local del usuario: Argentina (GMT-3, sin DST). */
const DISPLAY_TZ =
  process.env.NEWS_CALENDAR_DISPLAY_TIMEZONE?.trim() ||
  "America/Argentina/Buenos_Aires";

/** FF calendar usa MM-DD-YYYY; unificamos a yyyy-MM-dd para el cliente. */
function normalizeFfDate(raw: string): string {
  if (!raw) return "";
  const trimmed = String(raw).trim();
  const us = trimmed.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (us) {
    const [, mm, dd, yyyy] = us;
    return `${yyyy}-${mm}-${dd}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  return trimmed;
}

/** Convierte "6:29am" / "11:50pm" a reloj 24h. */
function parseFfTime12h(raw: string): { h: number; m: number } | null {
  const s = String(raw).trim().toLowerCase().replace(/\s+/g, " ");
  if (!s) return null;
  const m = s.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const ap = m[3];
  if (ap === "pm" && h !== 12) h += 12;
  if (ap === "am" && h === 12) h = 0;
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return { h, m: min };
}

/**
 * Hora del XML interpretada en SOURCE_TZ → texto en DISPLAY_TZ (GMT-3 Argentina).
 */
function formatTimeInUserZone(dateYmd: string, timeRaw: string): string {
  if (!dateYmd || !timeRaw?.trim()) return timeRaw || "";
  const parsed = parseFfTime12h(timeRaw);
  if (!parsed) return timeRaw.trim();

  const isoLocal = `${dateYmd}T${String(parsed.h).padStart(2, "0")}:${String(parsed.m).padStart(2, "0")}:00`;
  const instant = toDate(isoLocal, { timeZone: SOURCE_TZ });
  if (Number.isNaN(instant.getTime())) return timeRaw.trim();

  return formatInTimeZone(instant, DISPLAY_TZ, "HH:mm", { locale: es });
}

export async function GET() {
  try {
    const res = await fetch(
      "https://nfs.faireconomy.media/ff_calendar_thisweek.xml",
      { next: { revalidate: 3600 } }
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to fetch ForexFactory calendar" },
        { status: 500 }
      );
    }

    const xml = await res.text();
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "",
    });
    const parsed = parser.parse(xml);

    const rawEvents = parsed?.weeklyevents?.event;
    if (!rawEvents) {
      return NextResponse.json([]);
    }

    const events = (Array.isArray(rawEvents) ? rawEvents : [rawEvents]).map(
      (event: Record<string, string>) => {
        const date = normalizeFfDate(event.date || "");
        const timeRaw = event.time || "";
        return {
          title: event.title || "",
          country: event.country || "",
          date,
          time: date ? formatTimeInUserZone(date, timeRaw) : timeRaw,
          impact: event.impact || "",
          forecast: event.forecast || "",
          previous: event.previous || "",
        };
      }
    );

    return NextResponse.json(events);
  } catch {
    return NextResponse.json(
      { error: "Error parsing ForexFactory data" },
      { status: 500 }
    );
  }
}
