import { PageHeader } from "@/components/shared/page-header";
import { InvoiceForm } from "@/components/projects/invoice-form";
import { InvoiceStatusActions } from "@/components/projects/invoice-status-actions";
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
import { getProjectOverview } from "@/features/finance/store";
import { formatCurrency, formatDate } from "@/lib/format";
import type { InvoiceStatus } from "@/features/finance/ledger";

const statusLabels: Record<InvoiceStatus, string> = {
  draft: "Borrador",
  sent: "Enviada",
  paid: "Pagada",
  cancelled: "Cancelada",
};

const statusVariants: Record<InvoiceStatus, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "secondary",
  sent: "outline",
  paid: "default",
  cancelled: "destructive",
};

export default async function ProjectInvoicesPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const overview = getProjectOverview(projectId);

  if (!overview) {
    return null;
  }

  const { invoices, project } = overview;

  const sortedInvoices = [...invoices].sort(
    (a, b) => b.createdAt.localeCompare(a.createdAt),
  );

  return (
    <>
      <PageHeader
        eyebrow="Facturas"
        title={`Facturación · ${project.name}`}
        description="Crea, gestiona y da seguimiento a las facturas del proyecto."
      />
      <div className="grid gap-6 px-4 py-6 md:px-6 xl:grid-cols-[0.95fr_1.05fr]">
        {/* Invoice creation form */}
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Nueva factura</CardTitle>
          </CardHeader>
          <CardContent>
            <InvoiceForm projectId={projectId} />
          </CardContent>
        </Card>

        {/* Invoice list */}
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>
              Facturas del proyecto
              {sortedInvoices.length > 0 && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({sortedInvoices.length})
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sortedInvoices.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No hay facturas registradas para este proyecto.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No. Factura</TableHead>
                    <TableHead>Destinatario</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-mono text-[13px] font-medium">
                        {invoice.invoiceNumber}
                      </TableCell>
                      <TableCell>{invoice.recipientName}</TableCell>
                      <TableCell className="font-mono text-[13px]">
                        {formatDate(invoice.issueDate)}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {formatCurrency(invoice.total)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariants[invoice.status]}>
                          {statusLabels[invoice.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <InvoiceStatusActions
                          invoiceId={invoice.id}
                          status={invoice.status}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
