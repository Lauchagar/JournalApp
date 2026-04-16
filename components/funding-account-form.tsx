"use client";

import { useState } from "react";
import { FundingAccount } from "@/lib/types";
import { createFundingAccount, deleteFundingAccount } from "@/lib/actions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Card, CardContent } from "@/components/ui/card";
import { format, parseISO, addMonths } from "date-fns";
import { es } from "date-fns/locale";
import { useRouter } from "next/navigation";

interface FundingAccountFormProps {
  accounts: FundingAccount[];
}

export function FundingAccountForm({ accounts }: FundingAccountFormProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [balance, setBalance] = useState("");
  const [accountType, setAccountType] = useState("");
  const [startDate, setStartDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const router = useRouter();

  const resetForm = () => {
    setName("");
    setBalance("");
    setAccountType("");
    setStartDate("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountType) return;
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.set("name", name);
      formData.set("initial_balance", balance);
      formData.set("account_type", accountType);
      formData.set("start_date", startDate);

      await createFundingAccount(formData);
      resetForm();
      setOpen(false);
      router.refresh();
    } catch (err) {
      console.error("Error creating funding account:", err);
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await deleteFundingAccount(id);
      router.refresh();
    } catch (err) {
      console.error("Error deleting funding account:", err);
    }
    setDeleting(null);
  };

  const formatCurrency = (value: number) => {
    return `$${Math.abs(value).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Cuentas de Fondeo</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">+ Nueva Cuenta</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Nueva Cuenta de Fondeo</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="acc-name">Nombre</Label>
                <Input
                  id="acc-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: FTMO Challenge 100k"
                  required
                />
              </div>

              <div>
                <Label htmlFor="acc-balance">Balance Inicial</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input
                    id="acc-balance"
                    type="number"
                    step="0.01"
                    min="0"
                    value={balance}
                    onChange={(e) => setBalance(e.target.value)}
                    required
                    className="pl-7"
                    placeholder="100000.00"
                  />
                </div>
              </div>

              <div>
                <Label>Tipo de Cuenta</Label>
                <ToggleGroup
                  type="single"
                  value={accountType}
                  onValueChange={(val) => { if (val) setAccountType(val); }}
                  className="justify-start mt-1"
                >
                  <ToggleGroupItem value="Evaluación" className="px-4">
                    Evaluación
                  </ToggleGroupItem>
                  <ToggleGroupItem value="PA" className="px-4">
                    PA
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>

              <div>
                <Label htmlFor="acc-start">Fecha de Inicio</Label>
                <Input
                  id="acc-start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={submitting || !accountType}>
                {submitting ? "Guardando..." : "Crear Cuenta"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {accounts.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No hay cuentas de fondeo registradas.
        </p>
      ) : (
        <div className="grid gap-3">
          {accounts.map((acc) => {
            const start = parseISO(acc.start_date);
            const isEval = acc.account_type === "Evaluación";
            const expiry = isEval ? addMonths(start, 1) : null;

            return (
              <Card key={acc.id} className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold truncate">{acc.name}</span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            isEval
                              ? "bg-amber-500/20 text-amber-400"
                              : "bg-emerald-500/20 text-emerald-400"
                          }`}
                        >
                          {acc.account_type}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                        <span>Balance: {formatCurrency(Number(acc.initial_balance))}</span>
                        <span>
                          Inicio: {format(start, "d MMM yyyy", { locale: es })}
                        </span>
                        {expiry && (
                          <span className="text-amber-400">
                            Expira: {format(expiry, "d MMM yyyy", { locale: es })}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(acc.id)}
                      disabled={deleting === acc.id}
                    >
                      {deleting === acc.id ? "..." : "Eliminar"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
