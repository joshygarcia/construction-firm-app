import { BudgetVsActualChart } from "@/components/reports/budget-vs-actual-chart";
import { CashflowChart } from "@/components/reports/cashflow-chart";
import { CategorySpendChart } from "@/components/reports/category-spend-chart";
import { ExportButtons } from "@/components/shared/export-buttons";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getDashboardSnapshot } from "@/features/finance/store";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export default async function ProjectReportsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const snapshot = getDashboardSnapshot(projectId);

  if (!snapshot) {
    return null;
  }

  const monthlyRows = snapshot.projectOverview.budgetVsActualMonthly;

  // Collect all unique months across all rows, sorted chronologically
  const allMonths = [
    ...new Set(monthlyRows.flatMap((row) => Object.keys(row.months))),
  ].sort();

  // Month display labels (e.g. "2026-03" → "MAR 26")
  const monthLabels = new Map(
    allMonths.map((m) => {
      const [year, month] = m.split("-");
      const label = new Date(Number(year), Number(month) - 1)
        .toLocaleString("es-DO", { month: "short" })
        .toUpperCase();
      return [m, `${label} ${year.slice(2)}`];
    }),
  );

  // Grand totals for the monthly table
  const grandBudgeted = monthlyRows.reduce((s, r) => s + r.budgeted, 0);
  const grandActual = monthlyRows.reduce((s, r) => s + r.totalActual, 0);
  const grandDifference = grandBudgeted - grandActual;

  return (
    <>
      <PageHeader
        description="Reportes generados desde los registros estructurados del ledger."
        eyebrow="Reportes"
        title={`Reportes · ${snapshot.projectOverview.project.name}`}
        actions={<ExportButtons projectId={projectId} type="report" />}
      />
      <div className="flex flex-col gap-6 px-4 py-6 md:px-6">
        {/* Charts row */}
        <div className="grid gap-6 xl:grid-cols-2">
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Presupuesto vs Real</CardTitle>
            </CardHeader>
            <CardContent>
              <BudgetVsActualChart data={snapshot.projectOverview.budgetVsActual} />
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Flujo de caja</CardTitle>
            </CardHeader>
            <CardContent>
              <CashflowChart data={snapshot.projectOverview.cashflow} />
            </CardContent>
          </Card>
        </div>

        {/* Budget vs Actual Monthly Table */}
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Presupuesto vs Real — Desglose mensual</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 z-10 bg-card/95 backdrop-blur-sm">Categoría</TableHead>
                  <TableHead className="sticky left-0 z-10 bg-card/95 backdrop-blur-sm">Subcategoría</TableHead>
                  <TableHead className="text-right">Presupuesto</TableHead>
                  {allMonths.map((m) => (
                    <TableHead key={m} className="text-right whitespace-nowrap">
                      {monthLabels.get(m)}
                    </TableHead>
                  ))}
                  <TableHead className="text-right">Total Real</TableHead>
                  <TableHead className="text-right">Diferencia</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthlyRows.map((row) => {
                  const diff = row.budgeted - row.totalActual;
                  return (
                    <TableRow key={row.key}>
                      <TableCell className="text-[13px] text-muted-foreground whitespace-nowrap">
                        {row.categoryName}
                      </TableCell>
                      <TableCell className="text-[13px] whitespace-nowrap">
                        {row.subcategoryName}
                      </TableCell>
                      <TableCell className="text-right font-mono text-[13px] tabular-nums">
                        {formatCurrency(row.budgeted)}
                      </TableCell>
                      {allMonths.map((m) => {
                        const val = row.months[m] ?? 0;
                        return (
                          <TableCell
                            key={m}
                            className="text-right font-mono text-[13px] tabular-nums"
                          >
                            {val > 0 ? formatCurrency(val) : "—"}
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-right font-mono tabular-nums font-medium">
                        {formatCurrency(row.totalActual)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right font-mono tabular-nums font-medium",
                          diff < 0 && "text-red-500",
                          diff > 0 && "text-emerald-600 dark:text-emerald-400",
                        )}
                      >
                        {formatCurrency(diff)}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {monthlyRows.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={4 + allMonths.length}
                      className="py-8 text-center text-muted-foreground"
                    >
                      No hay datos presupuestarios registrados.
                    </TableCell>
                  </TableRow>
                )}
                {/* Grand total row */}
                {monthlyRows.length > 0 && (
                  <TableRow className="border-t-2 border-copper/30 bg-copper/5">
                    <TableCell colSpan={2} className="text-right font-semibold uppercase text-copper">
                      Total general
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums font-bold text-copper">
                      {formatCurrency(grandBudgeted)}
                    </TableCell>
                    {allMonths.map((m) => {
                      const monthTotal = monthlyRows.reduce(
                        (s, r) => s + (r.months[m] ?? 0),
                        0,
                      );
                      return (
                        <TableCell
                          key={m}
                          className="text-right font-mono text-[13px] tabular-nums font-semibold"
                        >
                          {monthTotal > 0 ? formatCurrency(monthTotal) : "—"}
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-right font-mono tabular-nums font-bold">
                      {formatCurrency(grandActual)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-mono tabular-nums font-bold",
                        grandDifference < 0 && "text-red-500",
                        grandDifference > 0 && "text-emerald-600 dark:text-emerald-400",
                      )}
                    >
                      {formatCurrency(grandDifference)}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Category spend + Monthly control */}
        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Top 5 por gasto</CardTitle>
            </CardHeader>
            <CardContent>
              <CategorySpendChart data={snapshot.categorySpend} />
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Control mensual</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Detalle</TableHead>
                    <TableHead>Suplidor</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {snapshot.projectOverview.monthlyControl.map((row) => (
                    <TableRow key={row.transactionId}>
                      <TableCell className="font-mono text-[13px]">{formatDate(row.transactionDate)}</TableCell>
                      <TableCell>{row.subcategoryName}</TableCell>
                      <TableCell>{row.detail}</TableCell>
                      <TableCell className="text-muted-foreground">{row.vendor}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {formatCurrency(row.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
