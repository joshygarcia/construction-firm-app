import Link from "next/link";
import {
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
  ClipboardListIcon,
  PlusIcon,
  ReceiptTextIcon,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button-variants";
import type {
  BudgetLine,
  BudgetVsActualRow,
  CashflowRow,
  ContractorBalanceRow,
  Project,
  ProjectSummary,
  Transaction,
} from "@/features/finance/ledger";
import { formatCurrency, formatDate } from "@/lib/format";
import { BudgetVsActualChart } from "@/components/reports/budget-vs-actual-chart";
import { CashflowChart } from "@/components/reports/cashflow-chart";
import { cn } from "@/lib/utils";

export function ProjectDetailView({
  project,
  summary,
  transactions,
  budgetVsActual,
  cashflow,
}: {
  project: Project;
  summary: ProjectSummary;
  budgetLines?: BudgetLine[];
  transactions: Transaction[];
  contractorBalances?: ContractorBalanceRow[];
  budgetVsActual: BudgetVsActualRow[];
  cashflow: CashflowRow[];
}) {
  const base = `/projects/${project.id}`;
  const executedPercent =
    summary.totalBudget > 0
      ? Math.min((summary.totalExpenses / summary.totalBudget) * 100, 100)
      : 0;
  const recent = transactions.slice(0, 6);

  const actions = [
    { href: `${base}/registrar`, label: "Registrar movimiento", icon: PlusIcon, primary: true },
    { href: `${base}/budgets`, label: "Ver presupuesto", icon: ClipboardListIcon },
    { href: `${base}/invoices`, label: "Facturas y recibos", icon: ReceiptTextIcon },
  ];

  return (
    <div className="flex flex-col gap-6 px-4 py-6 md:px-8">
      {/* Acciones rápidas */}
      <div className="flex flex-wrap gap-3">
        {actions.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className={cn(
              buttonVariants({ variant: a.primary ? "default" : "outline", size: "lg" }),
              "gap-2 rounded-xl",
            )}
          >
            <a.icon className="size-4" />
            {a.label}
          </Link>
        ))}
      </div>

      {/* Números que importan */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Caja del proyecto" value={summary.cashAvailable} hint="Ingresos menos gastos en efectivo" tone={summary.cashAvailable < 0 ? "negative" : "positive"} />
        <StatCard label="Ingresos recibidos" value={summary.totalIncome} hint="Cobros del cliente" tone="positive" />
        <StatCard label="Gastado" value={summary.totalExpenses} hint="Costo acumulado del proyecto" />
        <StatCard label="Por pagar a contratistas" value={summary.pendingContractorBalances} hint="Saldo pendiente" tone={summary.pendingContractorBalances > 0 ? "negative" : "neutral"} />
      </div>

      {/* Avance del presupuesto */}
      <Card>
        <CardHeader>
          <CardTitle>Avance del presupuesto</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Gastado</p>
              <p className="font-heading text-2xl font-semibold tabular-nums">
                {formatCurrency(summary.totalExpenses)}
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  de {formatCurrency(summary.totalBudget)}
                </span>
              </p>
            </div>
            <p className="font-heading text-2xl font-semibold tabular-nums text-copper">
              {executedPercent.toFixed(0)}%
            </p>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full",
                executedPercent >= 100 ? "bg-[var(--negative)]" : "bg-copper",
              )}
              style={{ width: `${executedPercent}%` }}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Te queda{" "}
            <span className={cn("font-medium", summary.budgetRemaining < 0 ? "text-[var(--negative)]" : "text-foreground")}>
              {formatCurrency(summary.budgetRemaining)}
            </span>{" "}
            del presupuesto.
          </p>
        </CardContent>
      </Card>

      {/* Movimientos recientes + gráficos */}
      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Movimientos recientes</CardTitle>
            <Link href={`${base}/transactions`} className="text-sm font-medium text-copper hover:underline">
              Ver todos
            </Link>
          </CardHeader>
          <CardContent className="space-y-1">
            {recent.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Aún no hay movimientos. Toca “Registrar movimiento” para empezar.
              </p>
            ) : (
              recent.map((t) => {
                const isIncome = t.transactionType === "income";
                return (
                  <div key={t.id} className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-muted/50">
                    <div
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-full",
                        isIncome ? "bg-[var(--positive)]/12 text-[var(--positive)]" : "bg-[var(--negative)]/10 text-[var(--negative)]",
                      )}
                    >
                      {isIncome ? <ArrowDownLeftIcon className="size-4" /> : <ArrowUpRightIcon className="size-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{t.detail || (isIncome ? "Ingreso" : "Gasto")}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {t.payeeOrSource || "—"} · {formatDate(t.transactionDate)}
                      </p>
                    </div>
                    <p
                      className={cn(
                        "shrink-0 font-medium tabular-nums",
                        isIncome ? "text-[var(--positive)]" : "text-foreground",
                      )}
                    >
                      {isIncome ? "+" : "−"}
                      {formatCurrency(t.amount)}
                    </p>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Presupuesto vs Real</CardTitle>
          </CardHeader>
          <CardContent>
            <BudgetVsActualChart data={budgetVsActual} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Flujo de caja mensual</CardTitle>
        </CardHeader>
        <CardContent>
          <CashflowChart data={cashflow} />
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: number;
  hint: string;
  tone?: "positive" | "negative" | "neutral";
}) {
  return (
    <Card className="gap-2">
      <CardContent className="space-y-1.5 pt-1">
        <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
        <p
          className={cn(
            "font-heading text-[26px] font-semibold tabular-nums tracking-tight",
            tone === "negative" && "text-[var(--negative)]",
            tone === "positive" && "text-[var(--positive)]",
          )}
        >
          {formatCurrency(value)}
        </p>
        <p className="text-[13px] text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}
