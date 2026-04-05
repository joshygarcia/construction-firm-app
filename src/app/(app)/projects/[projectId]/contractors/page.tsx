import { ContractorManager } from "@/features/finance/components/contractor-manager";
import { QuickEntryPanel } from "@/features/finance/components/quick-entry-panel";
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
import { getProjectOverview, getReferenceData } from "@/features/finance/store";
import { formatCurrency, formatDate } from "@/lib/format";

export default async function ProjectContractorsPage({
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

  return (
    <>
      <PageHeader
        description="Contratos, pagos y balances pendientes vinculados al ledger del proyecto."
        eyebrow="Contratistas"
        title={`Balances · ${overview.project.name}`}
      />
      <div className="flex flex-col gap-6 px-4 py-6 md:px-6">
        <ContractorManager
          projectId={projectId}
          contractors={reference.contractors}
          contracts={overview.contracts}
        />
      </div>
      <div className="grid gap-6 px-4 pb-6 md:px-6 xl:grid-cols-[0.95fr_1.05fr]">
        <QuickEntryPanel
          availableModes={["contractor_payment"]}
          budgetLines={reference.budgetLines}
          budgetRows={reference.budgetRows}
          budgetVersions={reference.budgetVersions}
          categories={reference.categories}
          contractorBalances={reference.contractorBalances}
          contractors={reference.contractors}
          contracts={overview.contracts}
          defaultMode="contractor_payment"
          defaultProjectId={projectId}
          projectSummaries={reference.projectSummaries}
          projects={reference.projects.filter((p) => p.id === projectId)}
          subcategories={reference.subcategories}
          suggestionOptions={reference.suggestionOptions}
        />
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Ledger de contratistas</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contratista</TableHead>
                  <TableHead>Alcance</TableHead>
                  <TableHead>Último pago</TableHead>
                  <TableHead className="text-right">Acordado</TableHead>
                  <TableHead className="text-right">Pagado</TableHead>
                  <TableHead className="text-right">Pendiente</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overview.contractorBalances.map((contract) => (
                  <TableRow key={contract.contractorContractId}>
                    <TableCell className="font-medium">{contract.contractorName}</TableCell>
                    <TableCell className="text-muted-foreground">{contract.scopeDescription}</TableCell>
                    <TableCell className="font-mono text-[13px]">
                      {contract.lastPaymentDate ? formatDate(contract.lastPaymentDate) : "Sin pagos"}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {formatCurrency(contract.agreedTotal)}
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
      </div>
    </>
  );
}
