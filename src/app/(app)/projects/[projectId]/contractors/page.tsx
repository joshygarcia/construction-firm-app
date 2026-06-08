import Link from "next/link";
import { PlusIcon } from "lucide-react";

import { ContractorManager } from "@/features/finance/components/contractor-manager";
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
import { getProjectOverview, getReferenceData } from "@/features/finance/store";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

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

  const totalPending = overview.contractorBalances.reduce(
    (s, c) => s + Math.max(c.pendingBalance, 0),
    0,
  );

  return (
    <>
      <PageHeader
        description="Cuánto le debes a cada contratista y los pagos que ya hiciste."
        eyebrow="Contratistas"
        title="Contratistas"
        actions={
          <Link
            href={`/projects/${projectId}/registrar?tipo=contractor_payment`}
            className={cn(buttonVariants({ size: "default" }), "gap-2 rounded-xl")}
          >
            <PlusIcon className="size-4" />
            Registrar pago
          </Link>
        }
      />
      <div className="flex flex-col gap-6 px-4 py-6 md:px-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>A quién le debes</CardTitle>
            <span className="text-sm text-muted-foreground">
              Pendiente total:{" "}
              <span className="font-semibold text-[var(--negative)]">
                {formatCurrency(totalPending)}
              </span>
            </span>
          </CardHeader>
          <CardContent>
            {overview.contractorBalances.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Aún no hay contratistas con contrato. Agrégalos abajo.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contratista</TableHead>
                    <TableHead>Trabajo</TableHead>
                    <TableHead>Último pago</TableHead>
                    <TableHead className="text-right">Acordado</TableHead>
                    <TableHead className="text-right">Pagado</TableHead>
                    <TableHead className="text-right">Le debes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overview.contractorBalances.map((contract) => (
                    <TableRow key={contract.contractorContractId}>
                      <TableCell className="font-medium">{contract.contractorName}</TableCell>
                      <TableCell className="text-muted-foreground">{contract.scopeDescription}</TableCell>
                      <TableCell className="text-[13px] text-muted-foreground">
                        {contract.lastPaymentDate ? formatDate(contract.lastPaymentDate) : "Sin pagos"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(contract.agreedTotal)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {formatCurrency(contract.totalPaid)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right font-semibold tabular-nums",
                          contract.pendingBalance > 0 && "text-[var(--negative)]",
                        )}
                      >
                        {formatCurrency(contract.pendingBalance)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <ContractorManager
          projectId={projectId}
          contractors={reference.contractors}
          contracts={overview.contracts}
        />
      </div>
    </>
  );
}
