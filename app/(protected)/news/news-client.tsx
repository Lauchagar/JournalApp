"use client";

import { useState, useEffect, useMemo } from "react";
import { NewsEvent } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";

const impactColors: Record<string, string> = {
  High: "bg-red-500/20 text-red-400 border-red-500/30",
  Medium: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  Low: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  "Non-Economic": "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

const impactOptions = ["High", "Medium", "Low", "Non-Economic"];

export function NewsClient() {
  const [events, setEvents] = useState<NewsEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImpacts, setSelectedImpacts] = useState<Set<string>>(new Set());
  const [countryFilter, setCountryFilter] = useState("All");

  useEffect(() => {
    fetch("/api/news")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setEvents(data);
        }
      })
      .catch(() => setError("Error al cargar las noticias"))
      .finally(() => setLoading(false));
  }, []);

  const todayStr = format(new Date(), "yyyy-MM-dd");

  const todayEvents = useMemo(() => {
    return events.filter((e) => {
      if (!e.date) return false;
      return e.date === todayStr;
    });
  }, [events, todayStr]);

  const countries = useMemo(() => {
    const set = new Set(todayEvents.map((e) => e.country).filter(Boolean));
    return Array.from(set).sort();
  }, [todayEvents]);

  const toggleImpact = (impact: string) => {
    setSelectedImpacts((prev) => {
      const next = new Set(prev);
      if (next.has(impact)) {
        next.delete(impact);
      } else {
        next.add(impact);
      }
      return next;
    });
  };

  const filtered = useMemo(() => {
    return todayEvents.filter((e) => {
      if (selectedImpacts.size > 0) {
        const eventImpact = normalizeImpact(e.impact);
        if (!selectedImpacts.has(eventImpact)) return false;
      }
      if (countryFilter !== "All" && e.country !== countryFilter) return false;
      return true;
    });
  }, [todayEvents, selectedImpacts, countryFilter]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-red-500">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          Noticias — {format(new Date(), "EEEE d MMMM yyyy", { locale: undefined })}
        </h2>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">
          Impacto:
        </span>
        {impactOptions.map((impact) => {
          const isActive = selectedImpacts.has(impact);
          return (
            <button
              key={impact}
              onClick={() => toggleImpact(impact)}
              className={`px-3 py-1 rounded-md text-xs font-medium border transition-colors ${
                isActive
                  ? impactColors[impact] + " border-current"
                  : "border-border text-muted-foreground hover:bg-accent/50"
              }`}
            >
              {impact === "Non-Economic" ? "Non-Economic" : impact}
            </button>
          );
        })}
        {selectedImpacts.size > 0 && (
          <button
            onClick={() => setSelectedImpacts(new Set())}
            className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Limpiar
          </button>
        )}

        <span className="text-sm font-medium text-muted-foreground ml-4">
          País:
        </span>
        <select
          value={countryFilter}
          onChange={(e) => setCountryFilter(e.target.value)}
          className="border border-border rounded-md px-2 py-1 text-sm bg-card text-foreground"
        >
          <option value="All">Todos</option>
          {countries.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No hay eventos para hoy con los filtros seleccionados.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Hora</TableHead>
              <TableHead>Moneda</TableHead>
              <TableHead>Impacto</TableHead>
              <TableHead>Evento</TableHead>
              <TableHead>Pronóstico</TableHead>
              <TableHead>Anterior</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((event, idx) => {
              const impact = normalizeImpact(event.impact);
              return (
                <TableRow key={idx}>
                  <TableCell className="whitespace-nowrap">
                    {event.time || "—"}
                  </TableCell>
                  <TableCell>{event.country}</TableCell>
                  <TableCell>
                    <Badge
                      className={`${impactColors[impact] || "bg-gray-500/20 text-gray-400"}`}
                    >
                      {impact}
                    </Badge>
                  </TableCell>
                  <TableCell>{event.title}</TableCell>
                  <TableCell>{event.forecast || "—"}</TableCell>
                  <TableCell>{event.previous || "—"}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

function normalizeImpact(raw: string): string {
  if (!raw) return "Non-Economic";
  const lower = raw.toLowerCase();
  if (lower === "high") return "High";
  if (lower === "medium") return "Medium";
  if (lower === "low") return "Low";
  if (lower.includes("non") || lower === "holiday") return "Non-Economic";
  return raw;
}
