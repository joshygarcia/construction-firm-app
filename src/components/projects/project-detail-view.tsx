"use client";

import {
  Badge,
} from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  BudgetLine,
  BudgetVsActualRow,
  CashflowRow,
  ContractorBalanceRow,
  Project,
  ProjectSummary,
  Transaction,
} from "@/features/finance/ledger";
import { TransactionsTable } from "@/features/finance/components/transactions-table";
import { BudgetLinesTable } from "@/features/finance/components/budget-lines-table";
import { formatCurrency, formatDate, formatMonthKey } from "@/lib/format";
import { BudgetVsActualChart } from "@/components/reports/budget-vs-actual-chart";
import { CashflowChart } from "@/components/reports/cashflow-chart";
import { KpiCard } from "@/components/shared/kpi-card";

export function ProjectDetailView({
  project,
  summary,
  budgetLines,
  transactions,
  contractorBalances,
  budgetVsActual,
  cashflow,
}: {
  project: Project;
  summary: ProjectSummary;
  budgetLines: BudgetLine[];
  transactions: Transaction[];
  contractorBalances: ContractorBalanceRow[];
  budgetVsActual: BudgetVsActualRow[];
  cashflow: CashflowRow[];
}) {
  return (
    <div className="flex flex-col gap-6 px-4 py-6 md:px-6">
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard hint="Presupuesto activo" title="Presupuesto total" value={summary.totalBudget} />
        <KpiCard hint="Gasto acumulado" title="Gastado" trend="negative" value={summary.totalExpenses} />
        <KpiCard hint="Ingresos registrados" title="Ingresos" trend="positive" value={summary.totalIncome} />
        <KpiCard hint="Caja disponible" title="Caja" value={summary.cashAvailable} />
        <KpiCard hint="Pendiente por pagar" title="Contratistas" value={summary.pendingContractorBalances} />
        <KpiCard hint={project.location} title="Restante" value={summary.budgetRemaining} />
      </div>

      <Tabs defaultValue="summary">
        <TabsList>
          <TabsTrigger value="summary">Resumen</TabsTrigger>
          <TabsTrigger value="budget">Presupuesto</TabsTrigger>
          <TabsTrigger value="transactions">Transacciones</TabsTrigger>
          <TabsTrigger value="contractors">Contratistas</TabsTrigger>
          <TabsTrigger value="reports">Reportes</TabsTrigger>
        </TabsList>
        <TabsContent className="space-y-6" value="summary">
          <div className="grid gap-6 xl:grid-cols-2">
            <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Presupuesto vs Real</CardTitle>
              </CardHeader>
              <CardContent>
                <BudgetVsActualChart data={budgetVsActual} />
              </CardContent>
            </Card>
            <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Cashflow mensual</CardTitle>
              </CardHeader>
              <CardContent>
                <CashflowChart data={cashflow} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="budget">
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Líneas presupuestarias</CardTitle>
            </CardHeader>
            <CardContent>
              <BudgetLinesTable budgetLines={budgetLines} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="transactions">
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Ledger del proyecto</CardTitle>
            </CardHeader>
            <CardContent>
              <TransactionsTable transactions={transactions} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="contractors">
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Balances de contratistas</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contratista</TableHead>
                    <TableHead>Alcance</TableHead>
                    <TableHead>Último pago</TableHead>
                    <TableHead className="text-right">Pagado</TableHead>
                    <TableHead className="text-right">Pendiente</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contractorBalances.map((contract) => (
                    <TableRow key={contract.contractorContractId}>
                      <TableCell className="font-medium">{contract.contractorName}</TableCell>
                      <TableCell className="text-muted-foreground">{contract.scopeDescription}</TableCell>
                      <TableCell className="font-mono text-[13px]">
                        {contract.lastPaymentDate ? formatDate(contract.lastPaymentDate) : "Sin pagos"}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {formatCurrency(contract.totalPaid)}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {formatCurrency(contract.pendingBalance)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="reports">
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Control mensual</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mes</TableHead>
                    <TableHead className="text-right">Ingresos</TableHead>
                    <TableHead className="text-right">Gastos</TableHead>
                    <TableHead className="text-right">Neto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cashflow.map((row) => (
                    <TableRow key={row.monthKey}>
                      <TableCell>{formatMonthKey(row.monthKey)}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {formatCurrency(row.totalIncome)}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {formatCurrency(row.totalExpense)}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {formatCurrency(row.netCashflow)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
