"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Trade } from "@/lib/types";
import {
  createTrade,
  updateTrade,
  deleteTrade,
  upsertDailyNote,
} from "@/lib/actions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { NotionSingleSelect, NotionMultiSelect } from "@/components/notion-select";
import { NotionEditor } from "@/components/notion-editor";

interface TradeModalProps {
  date: Date;
  trades: Trade[];
  dailyNoteContent?: string;
  onClose: () => void;
  onRefresh: () => void;
}

const directionOptions = [
  { value: "Buy", label: "Buy", color: "bg-emerald-500/20 text-emerald-400" },
  { value: "Sell", label: "Sell", color: "bg-red-500/20 text-red-400" },
];

const resultOptions = [
  { value: "Stop Loss", label: "Stop Loss", color: "bg-red-500/20 text-red-400" },
  { value: "Stop Loss - Error", label: "SL - Error", color: "bg-red-800/20 text-red-300" },
  { value: "Profit", label: "Profit", color: "bg-emerald-500/20 text-emerald-400" },
  { value: "Stop Loss - Positivo", label: "SL - Positivo", color: "bg-amber-500/20 text-amber-400" },
  { value: "BE", label: "BE", color: "bg-blue-500/20 text-blue-400" },
];

const entryOptions = [
  { value: "OB", label: "OB" },
  { value: "FVG", label: "FVG" },
  { value: "IFVG", label: "IFVG" },
  { value: "CISD", label: "CISD" },
  { value: "SMT", label: "SMT" },
  { value: "SWEEP", label: "SWEEP" },
  { value: "Vela Superada", label: "Vela Superada" },
];

const operationOptions = [
  { value: "Demo", label: "Demo", color: "bg-purple-500/20 text-purple-400" },
  { value: "PA", label: "PA", color: "bg-emerald-500/20 text-emerald-400" },
];

interface TradeFormState {
  units: string;
  direction: string;
  result: string;
  pnl: string;
  entryType: string[];
  entryTime: string;
  operationType: string;
  comments: string;
}

function emptyForm(): TradeFormState {
  return {
    units: "",
    direction: "",
    result: "",
    pnl: "",
    entryType: [],
    entryTime: "",
    operationType: "",
    comments: "",
  };
}

function tradeToForm(trade: Trade): TradeFormState {
  return {
    units: String(trade.units),
    direction: trade.direction,
    result: trade.result,
    pnl: String(trade.pnl),
    entryType: Array.isArray(trade.entry_type) ? trade.entry_type : [trade.entry_type],
    entryTime: trade.entry_time?.slice(0, 5) || "",
    operationType: trade.operation_type,
    comments: trade.comments || "",
  };
}

export function TradeModal({
  date,
  trades,
  dailyNoteContent,
  onClose,
  onRefresh,
}: TradeModalProps) {
  const [nextNumber, setNextNumber] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TradeFormState>(emptyForm());
  const [mode, setMode] = useState<"trade" | "note">(
    trades.length > 0 ? "trade" : "note"
  );
  const [noteHtml, setNoteHtml] = useState<string>(dailyNoteContent || "");

  // Reinicia el contenido cuando cambia el día (el componente se monta por día)
  useEffect(() => {
    setMode(trades.length > 0 ? "trade" : "note");
    setEditingId(null);
    setForm(emptyForm());
    setNoteHtml(dailyNoteContent || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  useEffect(() => {
    if (mode !== "trade") return;
    fetch("/api/counter")
      .then((res) => res.json())
      .then((data) => setNextNumber(data.next_number))
      .catch(() => setNextNumber(null));
  }, [mode, trades.length]);

  const updateField = <K extends keyof TradeFormState>(key: K, value: TradeFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const resetAndClose = () => {
    setForm(emptyForm());
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !form.direction ||
      !form.result ||
      form.entryType.length === 0 ||
      !form.operationType
    )
      return;

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.set("date", format(date, "yyyy-MM-dd"));
      formData.set("units", form.units);
      formData.set("direction", form.direction);
      formData.set("result", form.result);
      formData.set("pnl", form.pnl);
      formData.set("entry_type", JSON.stringify(form.entryType));
      formData.set("entry_time", form.entryTime);
      formData.set("operation_type", form.operationType);
      formData.set("comments", form.comments);

      if (editingId) {
        await updateTrade(editingId, formData);
      } else {
        await createTrade(formData);
      }

      resetAndClose();
      onRefresh();
      onClose();
    } catch (err) {
      console.error("Error saving trade:", err);
    }
    setSubmitting(false);
  };

  const handleEdit = (trade: Trade) => {
    setEditingId(trade.id);
    setForm(tradeToForm(trade));
  };

  const handleCancelEdit = () => {
    resetAndClose();
  };

  const handleSubmitNote = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const dateStr = format(date, "yyyy-MM-dd");
      await upsertDailyNote(dateStr, noteHtml);
      onRefresh();
      onClose();
    } catch (err) {
      console.error("Error saving daily note:", err);
    }
    setSubmitting(false);
  };

  const handleDelete = async (tradeId: string) => {
    setDeleting(tradeId);
    try {
      await deleteTrade(tradeId);
      if (editingId === tradeId) resetAndClose();
      onRefresh();
    } catch (err) {
      console.error("Error deleting trade:", err);
    }
    setDeleting(null);
  };

  const formatCurrency = (value: number) => {
    const formatted = Math.abs(value).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return value < 0 ? `-$${formatted}` : `$${formatted}`;
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto border-border/50 bg-card">
        <DialogHeader>
          <DialogTitle className="text-lg">
            {format(date, "EEEE d 'de' MMMM, yyyy", { locale: es })}
          </DialogTitle>
        </DialogHeader>

        {/* Selector Trade / Nada (si no hay trades, minimizamos la UI) */}
        {trades.length > 0 ? (
          <div className="flex gap-2 mb-3">
            <Button
              type="button"
              variant={mode === "trade" ? "default" : "outline"}
              className="flex-1"
              onClick={() => setMode("trade")}
            >
              Trade
            </Button>
            <Button
              type="button"
              variant={mode === "note" ? "default" : "outline"}
              className="flex-1"
              onClick={() => setMode("note")}
            >
              Nada
            </Button>
          </div>
        ) : mode === "note" ? (
          <div className="mb-3">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => setMode("trade")}
            >
              + Agregar Trade
            </Button>
          </div>
        ) : null}

        {mode === "note" ? (
          <form onSubmit={handleSubmitNote} className="space-y-1.5">
            <div className="space-y-1.5">
              <NotionEditor
                content={noteHtml}
                onChange={(html) => setNoteHtml(html)}
              />
            </div>
            <div className="flex gap-2 pt-3">
              <Button type="submit" className="flex-1" disabled={submitting}>
                {submitting ? "Guardando..." : "Guardar Nota del día"}
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-1">
            {/* Notion-style property rows */}
            <div className="space-y-0.5">
              {/* Fecha & Nombre - readonly */}
              <NotionRow label="Fecha">
                <span className="text-sm px-3 py-1.5 text-muted-foreground">
                  {format(date, "yyyy-MM-dd")}
                </span>
              </NotionRow>

              <NotionRow label="Nombre">
                <span className="text-sm px-3 py-1.5 text-muted-foreground">
                  #{editingId
                    ? trades.find((t) => t.id === editingId)?.trade_number
                    : nextNumber ?? "..."}
                </span>
              </NotionRow>

              <NotionRow label="Unidades">
                <Input
                  type="number"
                  min={1}
                  value={form.units}
                  onChange={(e) => updateField("units", e.target.value)}
                  required
                  placeholder="0"
                  className="border-0 bg-transparent shadow-none focus-visible:ring-0 h-9 text-sm"
                />
              </NotionRow>

              <NotionRow label="Dirección">
                <NotionSingleSelect
                  options={directionOptions}
                  value={form.direction}
                  onChange={(v) => updateField("direction", v)}
                  placeholder="Seleccionar..."
                />
              </NotionRow>

              <NotionRow label="Resultado">
                <NotionSingleSelect
                  options={resultOptions}
                  value={form.result}
                  onChange={(v) => updateField("result", v)}
                  placeholder="Seleccionar..."
                />
              </NotionRow>

              <NotionRow label="P/L">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                    $
                  </span>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.pnl}
                    onChange={(e) => updateField("pnl", e.target.value)}
                    required
                    className="border-0 bg-transparent shadow-none focus-visible:ring-0 h-9 text-sm pl-7"
                    placeholder="0.00"
                  />
                </div>
              </NotionRow>

              <NotionRow label="Entrada">
                <NotionMultiSelect
                  options={entryOptions}
                  value={form.entryType}
                  onChange={(v) => updateField("entryType", v)}
                  placeholder="Seleccionar entradas..."
                />
              </NotionRow>

              <NotionRow label="Horario">
                <Input
                  type="time"
                  value={form.entryTime}
                  onChange={(e) => updateField("entryTime", e.target.value)}
                  required
                  className="border-0 bg-transparent shadow-none focus-visible:ring-0 h-9 text-sm"
                />
              </NotionRow>

              <NotionRow label="Tipo Op.">
                <NotionSingleSelect
                  options={operationOptions}
                  value={form.operationType}
                  onChange={(v) => updateField("operationType", v)}
                  placeholder="Seleccionar..."
                />
              </NotionRow>
            </div>

            <Separator className="my-3 bg-border/50" />

            {/* Rich Text Editor */}
            <div className="space-y-1.5">
              <NotionEditor
                content={form.comments}
                onChange={(html) => updateField("comments", html)}
              />
            </div>

            <div className="flex gap-2 pt-3">
              {editingId && (
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={handleCancelEdit}
                >
                  Cancelar
                </Button>
              )}
              <Button type="submit" className="flex-1" disabled={submitting}>
                {submitting
                  ? "Guardando..."
                  : editingId
                    ? "Guardar Cambios"
                    : "Agregar Trade"}
              </Button>
            </div>
          </form>
        )}

        {trades.length > 0 && (
          <>
            <Separator className="my-2 bg-border/50" />
            <div>
              <h3 className="text-sm font-semibold mb-3 text-muted-foreground">
                Trades del día ({trades.length})
              </h3>
              <div className="space-y-1.5">
                {trades.map((trade) => {
                  const isEditing = editingId === trade.id;
                  const entryArr = Array.isArray(trade.entry_type)
                    ? trade.entry_type
                    : [trade.entry_type];

                  return (
                    <div
                      key={trade.id}
                      className={`flex items-center justify-between p-3 rounded-lg border text-sm transition-colors ${
                        isEditing
                          ? "border-primary/50 bg-primary/5"
                          : "border-border/50 bg-card hover:bg-accent/30"
                      }`}
                    >
                      <button
                        type="button"
                        className="flex items-center gap-2.5 flex-wrap text-left flex-1 min-w-0"
                        onClick={() => {
                          setMode("trade");
                          handleEdit(trade);
                        }}
                      >
                        <span className="font-semibold text-muted-foreground">
                          #{trade.trade_number}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                            trade.direction === "Buy"
                              ? "bg-emerald-500/20 text-emerald-400"
                              : "bg-red-500/20 text-red-400"
                          }`}
                        >
                          {trade.direction}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-secondary text-secondary-foreground">
                          {trade.result}
                        </span>
                        <span
                          className={`font-semibold ${Number(trade.pnl) >= 0 ? "text-emerald-400" : "text-red-400"}`}
                        >
                          {formatCurrency(Number(trade.pnl))}
                        </span>
                        {entryArr.map((e) => (
                          <span key={e} className="text-xs text-muted-foreground">
                            {e}
                          </span>
                        ))}
                      </button>
                      <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setMode("trade");
                            handleEdit(trade);
                          }}
                          className="text-xs h-7 px-2"
                        >
                          Editar
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(trade.id)}
                          disabled={deleting === trade.id}
                          className="text-xs h-7 px-2"
                        >
                          {deleting === trade.id ? "..." : "Eliminar"}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function NotionRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-0 hover:bg-accent/20 rounded-md transition-colors group">
      <div className="w-28 flex-shrink-0 px-2 py-1.5">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
