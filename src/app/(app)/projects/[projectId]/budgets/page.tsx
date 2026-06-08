import { AlertTriangleIcon } from "lucide-react";

import { BudgetLinesTable } from "@/features/finance/components/budget-lines-table";
import { QuickEntryPanel } from "@/features/finance/components/quick-entry-panel";
import { ExportButtons } from "@/components/shared/export-buttons";
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
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

export default async function ProjectBudgetsPage({
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

  // Avances pagados por línea de presupuesto.
  const advanceMap = new Map(
    overview.budgetAdvances.map((a) => [a.budgetLineId, a.totalPaid]),
  );

  // Nombres de categoría.
  const categoryName = new Map(reference.categories.map((c) => [c.id, c.name]));
  const categoryOrder = new Map(
    reference.categories.map((c) => [c.id, c.sortOrder] as const),
  );

  // Agrupar partidas por categoría.
  const linesByCategory = new Map<string | null, typeof overview.budgetLines>();
  for (const line of overview.budgetLines) {
    const key = line.categoryId;
    const list = linesByCategory.get(key) ?? [];
    list.push(line);
    linesByCategory.set(key, list);
  }

  const groupedCategories = [...linesByCategory.keys()].sort((a, b) => {
    const oa = a ? categoryOrder.get(a) ?? 999 : 999;
    const ob = b ? categoryOrder.get(b) ?? 999 : 999;
    return oa - ob;
  });

  const totalGeneral = overview.budgetLines.reduce(
    (s, l) => s + l.totalBudgeted,
    0,
  );
  const totalPaid = overview.budgetAdvances.reduce((s, a) => s + a.totalPaid, 0);
  const remaining = totalGeneral - totalPaid;
  const executedPercent = totalGeneral > 0 ? (totalPaid / totalGeneral) * 100 : 0;

  const overrunLines = overview.budgetLines.filter(
    (l) => (advanceMap.get(l.id) ?? 0) > l.totalBudgeted && l.totalBudgeted > 0,
  );
  const overrunAmount = overrunLines.reduce(
    (s, l) => s + ((advanceMap.get(l.id) ?? 0) - l.totalBudgeted),
    0,
  );

  const progressBarTone =
    executedPercent > 100
      ? "bg-red-500"
      : executedPercent > 80
        ? "bg-amber-500"
        : "bg-emerald-500";
  const executedPercentTone =
    executedPercent > 100
      ? "text-red-500"
      : executedPercent > 80
        ? "text-amber-500"
        : "text-emerald-500";

  return (
    <>
      <PageHeader
        description="Agrega partidas al presupuesto y sigue el avance por categoría."
        eyebrow="Presupuesto"
        title={`Presupuesto · ${overview.project.name}`}
        actions={<ExportButtons projectId={projectId} type="budget" />}
      />
      <div className="flex flex-col gap-6 px-4 py-6 md:px-6">
        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          {/* Agregar partida */}
          <QuickEntryPanel
            availableModes={["budget_line"]}
            budgetLines={reference.budgetLines}
            budgetRows={reference.budgetRows}
            budgetVersions={overview.budgetVersions}
            categories={reference.categories}
            contractorBalances={reference.contractorBalances}
            contractors={reference.contractors}
            contracts={reference.contracts}
            defaultMode="budget_line"
            defaultProjectId={projectId}
            projectSummaries={reference.projectSummaries}
            projects={reference.projects.filter((p) => p.id === projectId)}
            subcategories={reference.subcategories}
            suggestionOptions={reference.suggestionOptions}
          />

          {/* Resumen */}
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Resumen del presupuesto</CardTitle>
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                {overview.budgetLines.length} partidas
              </span>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="rounded-xl border border-copper/30 bg-gradient-to-br from-copper/10 to-copper/[0.02] p-5">
                <div className="flex items-baseline justify-between">
                  <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-copper">
                    Total presupuestado
                  </p>
                  <p
                    className={cn(
                      "font-mono text-[11px] font-semibold tabular-nums",
                      executedPercentTone,
                    )}
                  >
                    {executedPercent.toFixed(1)}% ejecutado
                  </p>
                </div>
                <p className="mt-1 font-heading text-3xl font-semibold tabular-nums text-foreground">
                  {formatCurrency(totalGeneral)}
                </p>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-copper/10">
                  <div
                    className={cn("h-full rounded-full transition-all", progressBarTone)}
                    style={{ width: `${Math.min(executedPercent, 100)}%` }}
                  />
                </div>
                <div className="mt-2 flex justify-between font-mono text-[10px] tabular-nums text-muted-foreground">
                  <span>
                    Pagado{" "}
                    <span className="text-foreground/80">{formatCurrency(totalPaid)}</span>
                  </span>
                  <span>
                    Restante{" "}
                    <span className={cn("text-foreground/80", remaining < 0 && "text-red-500")}>
                      {formatCurrency(remaining)}
                    </span>
                  </span>
                </div>
              </div>

              {overrunLines.length > 0 ? (
                <div className="flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/5 p-3">
                  <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-red-500" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-red-500">
                      {overrunLines.length} partida{overrunLines.length === 1 ? "" : "s"} exceden el presupuesto
                    </p>
                    <p className="font-mono text-[11px] tabular-nums text-red-500/80">
                      Sobregiro total: {formatCurrency(overrunAmount)}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                  <p className="text-sm font-medium text-emerald-500">
                    Todas las partidas dentro del presupuesto
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tabla agrupada por categoría */}
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Partidas por categoría</CardTitle>
          </CardHeader>
          <CardContent>
            {overview.budgetLines.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Aún no hay partidas. Agrega la primera con el formulario de arriba.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="text-right">Cant.</TableHead>
                    <TableHead>Und.</TableHead>
                    <TableHead className="text-right">P.U.</TableHead>
                    <TableHead className="text-right">Presupuestado</TableHead>
                    <TableHead className="text-right">Pagado</TableHead>
                    <TableHead className="text-right">Restante</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupedCategories.map((catId) => {
                    const lines = (linesByCategory.get(catId) ?? []).sort(
                      (a, b) => a.sortOrder - b.sortOrder,
                    );
                    const catBudgeted = lines.reduce((s, l) => s + l.totalBudgeted, 0);
                    const catPaid = lines.reduce(
                      (s, l) => s + (advanceMap.get(l.id) ?? 0),
                      0,
                    );
                    const label = catId
                      ? categoryName.get(catId) ?? "Sin categoría"
                      : "Sin categoría";

                    return [
                      <TableRow
                        key={`cat-${catId ?? "none"}`}
                        className="bg-muted/30 hover:bg-muted/40"
                      >
                        <TableCell colSpan={4} className="font-semibold uppercase">
                          {label}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums font-semibold">
                          {formatCurrency(catBudgeted)}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums font-semibold">
                          {formatCurrency(catPaid)}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums font-semibold">
                          {formatCurrency(catBudgeted - catPaid)}
                        </TableCell>
                      </TableRow>,
                      ...lines.map((line) => {
                        const paid = advanceMap.get(line.id) ?? 0;
                        const lineRemaining = line.totalBudgeted - paid;
                        return (
                          <TableRow key={line.id}>
                            <TableCell className="pl-6">{line.description}</TableCell>
                            <TableCell className="text-right font-mono text-[13px] tabular-nums">
                              {line.quantity ?? "—"}
                            </TableCell>
                            <TableCell className="text-[13px] text-muted-foreground">
                              {line.unit ?? "—"}
                            </TableCell>
                            <TableCell className="text-right font-mono text-[13px] tabular-nums">
                              {line.unitPrice ? formatCurrency(line.unitPrice) : "—"}
                            </TableCell>
                            <TableCell className="text-right font-mono tabular-nums">
                              {formatCurrency(line.totalBudgeted)}
                            </TableCell>
                            <TableCell className="text-right font-mono tabular-nums">
                              {paid > 0 ? formatCurrency(paid) : "—"}
                            </TableCell>
                            <TableCell
                              className={cn(
                                "text-right font-mono tabular-nums",
                                lineRemaining < 0 && "text-red-500",
                              )}
                            >
                              {formatCurrency(lineRemaining)}
                            </TableCell>
                          </TableRow>
                        );
                      }),
                    ];
                  })}
                  <TableRow className="border-t-2 border-copper/30 bg-copper/5">
                    <TableCell colSpan={4} className="text-right font-semibold uppercase text-copper">
                      Total general
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums font-bold text-copper">
                      {formatCurrency(totalGeneral)}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums font-bold">
                      {formatCurrency(totalPaid)}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums font-bold">
                      {formatCurrency(remaining)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Edición de partidas */}
        {overview.budgetLines.length > 0 && (
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Editar partidas</CardTitle>
            </CardHeader>
            <CardContent>
              <BudgetLinesTable budgetLines={overview.budgetLines} />
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
