"use client";

import type { QuickEntryPreview } from "@/features/finance/quick-entry-preview";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatMonthKey } from "@/lib/format";

export function QuickEntryImpactCard({
  preview,
}: {
  preview: QuickEntryPreview;
}) {
  return (
    <Card className="border-border/50 bg-muted/15 shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Impacto previsto</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="space-y-1">
          <p className="font-medium text-foreground">{preview.projectName}</p>
          <p className="text-muted-foreground">
            {preview.monthKey ? `Periodo ${formatMonthKey(preview.monthKey)}` : "Actualiza presupuesto"}
          </p>
        </div>

        <dl className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border/60 bg-background/70 p-3">
            <dt className="text-muted-foreground">Caja proyectada</dt>
            <dd className="mt-1 font-mono text-base text-foreground">
              {formatCurrency(preview.projectedCashAvailable)}
            </dd>
          </div>
          <div className="rounded-xl border border-border/60 bg-background/70 p-3">
            <dt className="text-muted-foreground">Delta inmediato</dt>
            <dd className="mt-1 font-mono text-base text-foreground">
              {formatCurrency(preview.cashDelta)}
            </dd>
          </div>
          <div className="rounded-xl border border-border/60 bg-background/70 p-3">
            <dt className="text-muted-foreground">Presupuesto total</dt>
            <dd className="mt-1 font-mono text-base text-foreground">
              {formatCurrency(preview.projectedBudgetTotal)}
            </dd>
          </div>
          <div className="rounded-xl border border-border/60 bg-background/70 p-3">
            <dt className="text-muted-foreground">Restante del proyecto</dt>
            <dd className="mt-1 font-mono text-base text-foreground">
              {formatCurrency(preview.projectedBudgetRemaining)}
            </dd>
          </div>
        </dl>

        {preview.categoryName || preview.subcategoryName ? (
          <div className="space-y-2 rounded-xl border border-border/60 bg-background/70 p-3">
            <p className="font-medium">
              {[preview.categoryName, preview.subcategoryName].filter(Boolean).join(" / ")}
            </p>
            {preview.projectedActual !== null ? (
              <p className="text-muted-foreground">
                Consumo proyectado: <span className="font-mono text-foreground">{formatCurrency(preview.projectedActual)}</span>
              </p>
            ) : null}
            {preview.projectedRemaining !== null ? (
              <p className="text-muted-foreground">
                Restante proyectado: <span className="font-mono text-foreground">{formatCurrency(preview.projectedRemaining)}</span>
              </p>
            ) : null}
            {preview.matchedBudgetLineDescription ? (
              <p className="text-muted-foreground">
                Linea vinculada: <span className="text-foreground">{preview.matchedBudgetLineDescription}</span>
              </p>
            ) : null}
          </div>
        ) : null}

        {preview.contractorName ? (
          <div className="space-y-2 rounded-xl border border-border/60 bg-background/70 p-3">
            <p className="font-medium">{preview.contractorName}</p>
            {preview.contractorPendingBalanceBefore !== null ? (
              <p className="text-muted-foreground">
                Balance actual: <span className="font-mono text-foreground">{formatCurrency(preview.contractorPendingBalanceBefore)}</span>
              </p>
            ) : null}
            {preview.contractorPendingBalanceAfter !== null ? (
              <p className="text-muted-foreground">
                Balance despues del pago: <span className="font-mono text-foreground">{formatCurrency(preview.contractorPendingBalanceAfter)}</span>
              </p>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
