import { QuickEntryPanel } from "@/features/finance/components/quick-entry-panel";
import { KpiCard } from "@/components/shared/kpi-card";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getProjectOverview, getReferenceData } from "@/features/finance/store";
import { formatCurrency, formatDate } from "@/lib/format";

export default async function ProjectIncomePage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const reference = getReferenceData();
  const overview = getProjectOverview(projectId);

  if (!overview) {
    return null;
  }

  const incomeTransactions = overview.transactions
    .filter((t) => t.transactionType === "income")
    .sort((a, b) => a.transactionDate.localeCompare(b.transactionDate));

  const totalIncome = incomeTransactions.reduce((sum, t) => sum + t.amount, 0);
  const totalBudget = overview.summary.totalBudget;
  const totalExpenses = overview.summary.totalExpenses;
  const cashAvailable = totalIncome - totalExpenses;
  const executedPercent = totalBudget > 0 ? (totalExpenses / totalBudget) * 100 : 0;

  return (
    <>
      <PageHeader
        description="Desembolsos del cliente y flujo de fondos del proyecto."
        eyebrow="Ingresos"
        title={`Ingresos · ${overview.project.name}`}
      />
      <div className="flex flex-col gap-6 px-4 py-6 md:px-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            title="Presupuesto total"
            value={totalBudget}
            hint="Análisis de costo aprobado"
          />
          <KpiCard
            title="Total desembolsos"
            value={totalIncome}
            hint={`${incomeTransactions.length} desembolso${incomeTransactions.length !== 1 ? "s" : ""} recibidos`}
            trend="positive"
          />
          <KpiCard
            title="Efectivo disponible"
            value={cashAvailable}
            hint="Ingresos - gastos ejecutados"
            trend={cashAvailable > 0 ? "positive" : "negative"}
          />
          <KpiCard
            title="% Ejecutado"
            value={totalExpenses}
            hint={`${executedPercent.toFixed(1)}% del presupuesto`}
            delta={executedPercent}
            trend={executedPercent > 80 ? "negative" : "neutral"}
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <QuickEntryPanel
            availableModes={["income"]}
            budgetLines={reference.budgetLines}
            budgetRows={reference.budgetRows}
            budgetVersions={reference.budgetVersions}
            categories={reference.categories}
            contractorBalances={reference.contractorBalances}
            contractors={reference.contractors}
            contracts={overview.contracts}
            defaultMode="income"
            defaultProjectId={projectId}
            projectSummaries={reference.projectSummaries}
            projects={reference.projects.filter((p) => p.id === projectId)}
            subcategories={reference.subcategories}
            suggestionOptions={reference.suggestionOptions}
          />

          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Registro de desembolsos</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Detalle</TableHead>
                    <TableHead>Fuente</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incomeTransactions.map((txn, index) => (
                    <TableRow key={txn.id}>
                      <TableCell>
                        <Badge variant="secondary" className="font-mono text-[11px]">
                          {index + 1}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-[13px]">
                        {formatDate(txn.transactionDate)}
                      </TableCell>
                      <TableCell>{txn.detail}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {txn.payeeOrSource}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {txn.paymentMethod}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums font-medium text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(txn.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {incomeTransactions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                        No hay desembolsos registrados.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              {incomeTransactions.length > 0 && (
                <div className="mt-4 flex justify-end border-t border-border/50 pt-4">
                  <p className="font-mono text-sm tabular-nums">
                    Total:{" "}
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(totalIncome)}
                    </span>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
