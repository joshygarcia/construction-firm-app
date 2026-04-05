import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRightIcon } from "lucide-react";

import { CategorySpendChart } from "@/components/reports/category-spend-chart";
import { BudgetVsActualChart } from "@/components/reports/budget-vs-actual-chart";
import { CashflowChart } from "@/components/reports/cashflow-chart";
import { KpiCard } from "@/components/shared/kpi-card";
import { PageHeader } from "@/components/shared/page-header";
import { buttonVariants } from "@/components/ui/button-variants";
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
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

export default async function ProjectDashboardPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const snapshot = getDashboardSnapshot(projectId);

  if (!snapshot) {
    notFound();
  }

  const { projectOverview, categorySpend } = snapshot;
  const summary = projectOverview.summary;

  return (
    <>
      <PageHeader
        actions={
          <Link
            className={cn(buttonVariants({ variant: "default" }))}
            href={`/projects/${projectId}/transactions`}
          >
            Abrir entrada rápida
            <ArrowRightIcon data-icon="inline-end" />
          </Link>
        }
        description="KPIs operativos, consumo presupuestario y cashflow del proyecto."
        eyebrow="Panel"
        title={projectOverview.project.name}
      />
      <div className="flex flex-col gap-6 px-4 py-6 md:px-6">
        {/* KPI row */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <KpiCard hint="Presupuesto activo" title="Presupuesto total" value={summary.totalBudget} />
          <KpiCard hint="Gasto real acumulado" title="Total gastado" trend="negative" value={summary.totalExpenses} />
          <KpiCard hint="Ingresos registrados" title="Total ingresos" trend="positive" value={summary.totalIncome} />
          <KpiCard hint="Caja disponible" title="Caja disponible" value={summary.cashAvailable} />
          <KpiCard hint="Pendiente de contratistas" title="Balance pendiente" value={summary.pendingContractorBalances} />
        </div>

        {/* Charts row 1 */}
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Presupuesto vs Real</CardTitle>
            </CardHeader>
            <CardContent>
              <BudgetVsActualChart data={projectOverview.budgetVsActual} />
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Top categorías de gasto</CardTitle>
            </CardHeader>
            <CardContent>
              <CategorySpendChart data={categorySpend} />
            </CardContent>
          </Card>
        </div>

        {/* Charts row 2 */}
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Ingresos vs Egresos</CardTitle>
            </CardHeader>
            <CardContent>
              <CashflowChart data={projectOverview.cashflow} />
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Partidas sobre presupuesto</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Partida</TableHead>
                    <TableHead className="text-right">Real</TableHead>
                    <TableHead className="text-right">Restante</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projectOverview.budgetVsActual
                    .filter((row) => row.remaining < 0)
                    .slice(0, 5)
                    .map((row) => (
                      <TableRow key={row.key}>
                        <TableCell>{row.subcategoryName}</TableCell>
                        <TableCell className="text-right font-mono tabular-nums">
                          {formatCurrency(row.actual)}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums text-destructive">
                          {formatCurrency(row.remaining)}
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
