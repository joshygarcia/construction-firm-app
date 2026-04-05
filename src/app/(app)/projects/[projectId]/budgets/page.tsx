import { AlertTriangleIcon } from "lucide-react";

import { submitBudgetApproval } from "@/features/finance/actions";
import { BudgetLinesTable } from "@/features/finance/components/budget-lines-table";
import { BudgetStructureManager } from "@/features/finance/components/budget-structure-manager";
import { QuickEntryPanel } from "@/features/finance/components/quick-entry-panel";
import { ExportButtons } from "@/components/shared/export-buttons";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

  // Build advance lookup: budgetLineId -> totalPaid
  const advanceMap = new Map(
    overview.budgetAdvances.map((a) => [a.budgetLineId, a.totalPaid]),
  );

  // Group budget lines by section
  const sections = overview.budgetSections.sort((a, b) => a.sortOrder - b.sortOrder);
  const linesBySection = new Map<string | null, typeof overview.budgetLines>();

  for (const line of overview.budgetLines) {
    const key = line.sectionId;
    const list = linesBySection.get(key) ?? [];
    list.push(line);
    linesBySection.set(key, list);
  }

  const unsectionedLines = linesBySection.get(null) ?? [];

  // Totals
  const directLines = overview.budgetLines.filter((l) => {
    const section = sections.find((s) => s.id === l.sectionId);
    return !section || section.costType === "direct";
  });
  const indirectLines = overview.budgetLines.filter((l) => {
    const section = sections.find((s) => s.id === l.sectionId);
    return section?.costType === "indirect";
  });
  const totalDirect = directLines.reduce((s, l) => s + l.totalBudgeted, 0);
  const totalIndirect = indirectLines.reduce((s, l) => s + l.totalBudgeted, 0);
  const totalGeneral = totalDirect + totalIndirect;
  const totalPaid = overview.budgetAdvances.reduce((s, a) => s + a.totalPaid, 0);
  const remaining = totalGeneral - totalPaid;

  const executedPercent = totalGeneral > 0 ? (totalPaid / totalGeneral) * 100 : 0;
  const directPercent = totalGeneral > 0 ? (totalDirect / totalGeneral) * 100 : 0;
  const indirectPercent = totalGeneral > 0 ? (totalIndirect / totalGeneral) * 100 : 0;

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
        description="Análisis de costo con seguimiento de avances por partida."
        eyebrow="Presupuestos"
        title={`Presupuesto · ${overview.project.name}`}
        actions={<ExportButtons projectId={projectId} type="budget" />}
      />
      <div className="flex flex-col gap-6 px-4 py-6 md:px-6">
        {/* Version status + Quick entry */}
        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-6">
            <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Estado de versiones</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {overview.budgetVersions.map((version) => (
                  <div
                    className="flex items-center justify-between gap-4 rounded-lg border border-border/50 bg-muted/20 px-4 py-4"
                    key={version.id}
                  >
                    <div>
                      <p className="font-medium">{version.versionName}</p>
                      <p className="text-sm text-muted-foreground">
                        {version.isLocked ? "Versión aprobada y bloqueada" : "Versión editable"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={version.status === "approved" ? "secondary" : "outline"}>
                        {version.status === "approved" ? "Aprobado" : version.status === "draft" ? "Borrador" : "Archivado"}
                      </Badge>
                      {!version.isLocked ? (
                        <form
                          action={async () => {
                            "use server";
                            await submitBudgetApproval(version.id);
                          }}
                        >
                          <Button size="sm" type="submit">
                            Aprobar
                          </Button>
                        </form>
                      ) : null}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
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
          </div>

          {/* Summary */}
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Resumen del presupuesto</CardTitle>
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                {overview.budgetLines.length} partidas · {sections.length} secciones
              </span>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Hero total with execution progress */}
              <div className="rounded-xl border border-copper/30 bg-gradient-to-br from-copper/10 to-copper/[0.02] p-5">
                <div className="flex items-baseline justify-between">
                  <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-copper">
                    Total general
                  </p>
                  <p className={cn("font-mono text-[11px] font-semibold tabular-nums", executedPercentTone)}>
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
                    Pagado <span className="text-foreground/80">{formatCurrency(totalPaid)}</span>
                  </span>
                  <span>
                    Restante{" "}
                    <span className={cn("text-foreground/80", remaining < 0 && "text-red-500")}>
                      {formatCurrency(remaining)}
                    </span>
                  </span>
                </div>
              </div>

              {/* Composition: directos vs indirectos */}
              <div className="space-y-2">
                <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                  <span>Composición</span>
                  <span className="tabular-nums">
                    {directPercent.toFixed(0)}% / {indirectPercent.toFixed(0)}%
                  </span>
                </div>
                <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted/20">
                  <div
                    className="h-full bg-copper/70"
                    style={{ width: `${directPercent}%` }}
                  />
                  <div
                    className="h-full bg-sky-500/60"
                    style={{ width: `${indirectPercent}%` }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-copper/70" />
                      <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                        Directos
                      </p>
                    </div>
                    <p className="mt-1 font-heading text-lg font-semibold tabular-nums">
                      {formatCurrency(totalDirect)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-sky-500/60" />
                      <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                        Indirectos
                      </p>
                    </div>
                    <p className="mt-1 font-heading text-lg font-semibold tabular-nums">
                      {formatCurrency(totalIndirect)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Overrun alert */}
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

        {/* Budget structure manager */}
        <BudgetStructureManager
          projectId={projectId}
          versions={overview.budgetVersions}
          sections={overview.budgetSections}
        />

        {/* Hierarchical budget table */}
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Análisis de costo por sección</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Código</TableHead>
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
                {sections.map((section) => {
                  const sectionLines = (linesBySection.get(section.id) ?? []).sort(
                    (a, b) => a.sortOrder - b.sortOrder,
                  );
                  const sectionBudgeted = sectionLines.reduce((s, l) => s + l.totalBudgeted, 0);
                  const sectionPaid = sectionLines.reduce((s, l) => s + (advanceMap.get(l.id) ?? 0), 0);

                  return [
                    // Section header row
                    <TableRow key={`section-${section.id}`} className="bg-muted/30 hover:bg-muted/40">
                      <TableCell className="font-mono font-bold text-copper">
                        {section.code}.-
                      </TableCell>
                      <TableCell colSpan={5} className="font-semibold uppercase">
                        {section.name}
                        {section.costType === "indirect" && (
                          <Badge variant="outline" className="ml-2 text-[10px]">Indirecto</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums font-semibold">
                        {formatCurrency(sectionPaid)}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums font-semibold">
                        {formatCurrency(sectionBudgeted - sectionPaid)}
                      </TableCell>
                    </TableRow>,
                    // Line rows
                    ...sectionLines.map((line) => {
                      const paid = advanceMap.get(line.id) ?? 0;
                      const remaining = line.totalBudgeted - paid;

                      return (
                        <TableRow key={line.id}>
                          <TableCell className="pl-6 font-mono text-[13px] text-muted-foreground">
                            {line.lineCode}
                          </TableCell>
                          <TableCell>{line.description}</TableCell>
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
                          <TableCell className={cn(
                            "text-right font-mono tabular-nums",
                            remaining < 0 && "text-red-500",
                          )}>
                            {formatCurrency(remaining)}
                          </TableCell>
                        </TableRow>
                      );
                    }),
                    // Section subtotal
                    <TableRow key={`subtotal-${section.id}`} className="border-t border-border/50">
                      <TableCell />
                      <TableCell colSpan={4} className="text-right text-[13px] font-medium text-muted-foreground">
                        Subtotal {section.name}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums font-semibold">
                        {formatCurrency(sectionBudgeted)}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums font-semibold">
                        {formatCurrency(sectionPaid)}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums font-semibold">
                        {formatCurrency(sectionBudgeted - sectionPaid)}
                      </TableCell>
                    </TableRow>,
                  ];
                })}
                {/* Unsectioned lines */}
                {unsectionedLines.length > 0 && (
                  <>
                    <TableRow className="bg-muted/30">
                      <TableCell className="font-mono font-bold text-muted-foreground">—</TableCell>
                      <TableCell colSpan={7} className="font-semibold uppercase">
                        SIN SECCIÓN ASIGNADA
                      </TableCell>
                    </TableRow>
                    {unsectionedLines.map((line) => {
                      const paid = advanceMap.get(line.id) ?? 0;
                      return (
                        <TableRow key={line.id}>
                          <TableCell className="pl-6 font-mono text-[13px] text-muted-foreground">
                            {line.lineCode ?? "—"}
                          </TableCell>
                          <TableCell>{line.description}</TableCell>
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
                          <TableCell className="text-right font-mono tabular-nums">
                            {formatCurrency(line.totalBudgeted - paid)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </>
                )}
                {/* Grand total */}
                <TableRow className="border-t-2 border-copper/30 bg-copper/5">
                  <TableCell />
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
                    {formatCurrency(totalGeneral - totalPaid)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Legacy editable table for draft versions */}
        {overview.budgetVersions.some((v) => !v.isLocked) && (
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Líneas editables (borradores)</CardTitle>
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
