"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  submitCard,
  submitCardPayment,
  submitLoan,
  submitLoanMovement,
  type ActionResult,
} from "@/features/finance/actions";
import type {
  CardBalanceRow,
  CompanyFinanceSummary,
  LoanBalanceRow,
  MonthlyMovementRow,
} from "@/features/finance/ledger";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatMonthKey } from "@/lib/format";
import { cn } from "@/lib/utils";

const today = () => new Date().toISOString().slice(0, 10);

type FinanceManagerProps = {
  summary: CompanyFinanceSummary;
  cards: CardBalanceRow[];
  loans: LoanBalanceRow[];
  payableContractors: number;
  monthlyMovements: MonthlyMovementRow[];
};

export function FinanceManager({
  summary,
  cards,
  loans,
  payableContractors,
  monthlyMovements,
}: FinanceManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Formularios
  const [newCardName, setNewCardName] = useState("");
  const [payCardId, setPayCardId] = useState("");
  const [payCardDate, setPayCardDate] = useState(today);
  const [payCardAmount, setPayCardAmount] = useState("");

  const [newLoanName, setNewLoanName] = useState("");
  const [newLoanLender, setNewLoanLender] = useState("");

  const [movLoanId, setMovLoanId] = useState("");
  const [movType, setMovType] = useState<"disbursement" | "payment">("disbursement");
  const [movDate, setMovDate] = useState(today);
  const [movAmount, setMovAmount] = useState("");

  const cardsPayable = summary.cardsPayable;
  const loansPayable = summary.loansPayable;
  const totalPayable = cardsPayable + loansPayable + payableContractors;

  function run(action: () => Promise<ActionResult>, onOk?: () => void) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      onOk?.();
      router.refresh();
    });
  }

  function fd(values: Record<string, string>) {
    const form = new FormData();
    for (const [key, value] of Object.entries(values)) form.set(key, value);
    return form;
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Resumen */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Caja (efectivo)" value={summary.cash} tone={summary.cash < 0 ? "negative" : "positive"} />
        <SummaryCard label="Por cobrar (facturas)" value={summary.receivable} tone="neutral" />
        <SummaryCard label="Tarjetas por pagar" value={cardsPayable} tone={cardsPayable > 0 ? "negative" : "neutral"} />
        <SummaryCard label="Préstamos por pagar" value={loansPayable} tone={loansPayable > 0 ? "negative" : "neutral"} />
      </div>
      <div className="rounded-lg border border-border/50 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
        Cuentas por pagar totales (contratistas + tarjetas + préstamos):{" "}
        <span className="font-mono font-semibold text-foreground">{formatCurrency(totalPayable)}</span>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Tarjetas */}
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Tarjetas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tarjeta</TableHead>
                  <TableHead className="text-right">Gastado</TableHead>
                  <TableHead className="text-right">Pagado</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cards.map((card) => (
                  <TableRow key={card.cardId}>
                    <TableCell>{card.name}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{formatCurrency(card.charged)}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{formatCurrency(card.paid)}</TableCell>
                    <TableCell className={cn("text-right font-mono tabular-nums font-semibold", card.balance > 0 && "text-red-500")}>
                      {formatCurrency(card.balance)}
                    </TableCell>
                  </TableRow>
                ))}
                {cards.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                      No hay tarjetas registradas.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            {/* Agregar tarjeta */}
            <div className="flex flex-wrap items-end gap-3 border-t border-border/50 pt-4">
              <Field className="min-w-[200px] flex-1">
                <FieldLabel>Nueva tarjeta</FieldLabel>
                <Input
                  placeholder="Ej. Visa Popular"
                  value={newCardName}
                  onChange={(e) => setNewCardName(e.target.value)}
                />
              </Field>
              <Button
                type="button"
                disabled={isPending || newCardName.trim().length < 2}
                onClick={() =>
                  run(
                    () => submitCard(fd({ name: newCardName })),
                    () => setNewCardName(""),
                  )
                }
              >
                Agregar tarjeta
              </Button>
            </div>

            {/* Pagar tarjeta */}
            {cards.length > 0 && (
              <div className="grid gap-3 rounded-lg border border-border/50 bg-muted/20 p-4 sm:grid-cols-2">
                <p className="sm:col-span-2 text-sm font-medium">Registrar pago de tarjeta</p>
                <Field>
                  <FieldLabel>Tarjeta</FieldLabel>
                  <Select value={payCardId} onValueChange={(v) => setPayCardId(v ?? "")}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecciona">
                        {cards.find((c) => c.cardId === payCardId)?.name ?? "Selecciona"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {cards.map((c) => (
                          <SelectItem key={c.cardId} value={c.cardId}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel>Fecha</FieldLabel>
                  <Input type="date" value={payCardDate} onChange={(e) => setPayCardDate(e.target.value)} />
                </Field>
                <Field>
                  <FieldLabel>Monto</FieldLabel>
                  <Input
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    value={payCardAmount}
                    onChange={(e) => setPayCardAmount(e.target.value)}
                  />
                </Field>
                <div className="flex items-end">
                  <Button
                    type="button"
                    disabled={isPending || !payCardId || !payCardAmount}
                    onClick={() =>
                      run(
                        () =>
                          submitCardPayment(
                            fd({ cardId: payCardId, date: payCardDate, amount: payCardAmount }),
                          ),
                        () => setPayCardAmount(""),
                      )
                    }
                  >
                    Registrar pago
                  </Button>
                </div>
                <p className="sm:col-span-2 text-xs text-muted-foreground">
                  El pago baja la caja (efectivo) y reduce el saldo por pagar de la tarjeta.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Préstamos */}
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Préstamos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Préstamo</TableHead>
                  <TableHead className="text-right">Recibido</TableHead>
                  <TableHead className="text-right">Abonado</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loans.map((loan) => (
                  <TableRow key={loan.loanId}>
                    <TableCell>
                      {loan.name}
                      {loan.lender ? (
                        <span className="block text-xs text-muted-foreground">{loan.lender}</span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{formatCurrency(loan.disbursed)}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{formatCurrency(loan.paid)}</TableCell>
                    <TableCell className={cn("text-right font-mono tabular-nums font-semibold", loan.balance > 0 && "text-red-500")}>
                      {formatCurrency(loan.balance)}
                    </TableCell>
                  </TableRow>
                ))}
                {loans.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                      No hay préstamos registrados.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            {/* Agregar préstamo */}
            <div className="grid gap-3 border-t border-border/50 pt-4 sm:grid-cols-2">
              <Field>
                <FieldLabel>Nuevo préstamo</FieldLabel>
                <Input
                  placeholder="Ej. Préstamo capital de trabajo"
                  value={newLoanName}
                  onChange={(e) => setNewLoanName(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel>Prestamista (opcional)</FieldLabel>
                <Input
                  placeholder="Ej. Banco Popular"
                  value={newLoanLender}
                  onChange={(e) => setNewLoanLender(e.target.value)}
                />
              </Field>
              <div className="flex items-end sm:col-span-2">
                <Button
                  type="button"
                  disabled={isPending || newLoanName.trim().length < 2}
                  onClick={() =>
                    run(
                      () => submitLoan(fd({ name: newLoanName, lender: newLoanLender })),
                      () => {
                        setNewLoanName("");
                        setNewLoanLender("");
                      },
                    )
                  }
                >
                  Agregar préstamo
                </Button>
              </div>
            </div>

            {/* Movimiento de préstamo */}
            {loans.length > 0 && (
              <div className="grid gap-3 rounded-lg border border-border/50 bg-muted/20 p-4 sm:grid-cols-2">
                <p className="sm:col-span-2 text-sm font-medium">Registrar movimiento</p>
                <Field>
                  <FieldLabel>Préstamo</FieldLabel>
                  <Select value={movLoanId} onValueChange={(v) => setMovLoanId(v ?? "")}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecciona">
                        {loans.find((l) => l.loanId === movLoanId)?.name ?? "Selecciona"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {loans.map((l) => (
                          <SelectItem key={l.loanId} value={l.loanId}>
                            {l.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel>Tipo</FieldLabel>
                  <Select value={movType} onValueChange={(v) => setMovType((v as "disbursement" | "payment") ?? "disbursement")}>
                    <SelectTrigger className="w-full">
                      <SelectValue>
                        {movType === "disbursement" ? "Préstamo recibido" : "Abono al préstamo"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="disbursement">Préstamo recibido</SelectItem>
                        <SelectItem value="payment">Abono al préstamo</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel>Fecha</FieldLabel>
                  <Input type="date" value={movDate} onChange={(e) => setMovDate(e.target.value)} />
                </Field>
                <Field>
                  <FieldLabel>Monto</FieldLabel>
                  <Input
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    value={movAmount}
                    onChange={(e) => setMovAmount(e.target.value)}
                  />
                </Field>
                <div className="flex items-end sm:col-span-2">
                  <Button
                    type="button"
                    disabled={isPending || !movLoanId || !movAmount}
                    onClick={() =>
                      run(
                        () =>
                          submitLoanMovement(
                            fd({ loanId: movLoanId, type: movType, date: movDate, amount: movAmount }),
                          ),
                        () => setMovAmount(""),
                      )
                    }
                  >
                    Registrar movimiento
                  </Button>
                </div>
                <p className="sm:col-span-2 text-xs text-muted-foreground">
                  Recibir un préstamo sube la caja; abonar baja la caja. Ambos ajustan el saldo por pagar.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Movimientos mensuales */}
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Movimientos mensuales</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mes</TableHead>
                <TableHead className="text-right">Ventas (facturado)</TableHead>
                <TableHead className="text-right">Cobros</TableHead>
                <TableHead className="text-right">Gastos</TableHead>
                <TableHead className="text-right">Pagos tarjeta</TableHead>
                <TableHead className="text-right">Préstamos recibidos</TableHead>
                <TableHead className="text-right">Abonos préstamo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {monthlyMovements.map((row) => (
                <TableRow key={row.monthKey}>
                  <TableCell className="capitalize">{formatMonthKey(row.monthKey)}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{formatCurrency(row.ventas)}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums text-emerald-600">{formatCurrency(row.cobros)}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{formatCurrency(row.gastos)}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{formatCurrency(row.pagosTarjeta)}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{formatCurrency(row.prestamosRecibidos)}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{formatCurrency(row.abonosPrestamo)}</TableCell>
                </TableRow>
              ))}
              {monthlyMovements.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-6 text-center text-muted-foreground">
                    Aún no hay movimientos.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "positive" | "negative" | "neutral";
}) {
  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
      <CardContent className="p-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
        <p
          className={cn(
            "mt-1 font-heading text-2xl font-semibold tabular-nums",
            tone === "negative" && "text-red-500",
            tone === "positive" && "text-emerald-600",
          )}
        >
          {formatCurrency(value)}
        </p>
      </CardContent>
    </Card>
  );
}
