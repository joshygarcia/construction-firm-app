import { ExportButtons } from "@/components/shared/export-buttons";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { BudgetGrid } from "@/features/finance/components/budget-grid";
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

  const advanceMap = new Map(
    overview.budgetAdvances.map((a) => [a.budgetLineId, a.totalPaid]),
  );

  const lines = overview.budgetLines.map((l) => ({
    id: l.id,
    categoryId: l.categoryId,
    subcategoryId: l.subcategoryId,
    area: l.area,
    description: l.description,
    quantity: l.quantity,
    unit: l.unit,
    unitPrice: l.unitPrice,
    totalBudgeted: l.totalBudgeted,
    isManualTotal: l.isManualTotal,
    paid: advanceMap.get(l.id) ?? 0,
  }));

  // Niveles existentes (de las partidas) + sugerencias guardadas.
  const nivelSet = new Set<string>();
  for (const l of overview.budgetLines) {
    if (l.area && l.area.trim()) nivelSet.add(l.area.trim());
  }
  for (const s of reference.suggestionOptions) {
    if (s.kind === "area" && s.value.trim()) nivelSet.add(s.value.trim());
  }
  const niveles = [...nivelSet];

  const totalBudget = lines.reduce((s, l) => s + l.totalBudgeted, 0);
  const totalPaid = overview.budgetAdvances.reduce((s, a) => s + a.totalPaid, 0);
  const remaining = totalBudget - totalPaid;
  const executedPercent = totalBudget > 0 ? Math.min((totalPaid / totalBudget) * 100, 100) : 0;

  const categories = [...reference.categories]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((c) => ({ id: c.id, name: c.name }));

  const subcategories = reference.subcategories.map((s) => ({
    id: s.id,
    categoryId: s.categoryId,
    name: s.name,
  }));

  return (
    <>
      <PageHeader
        description="Arma tu presupuesto por categoría y compáralo con lo que ya gastaste."
        eyebrow="Presupuesto"
        title="Presupuesto"
        actions={<ExportButtons projectId={projectId} type="budget" />}
      />
      <div className="flex flex-col gap-6 px-4 py-6 md:px-8">
        {/* Resumen */}
        <Card>
          <CardContent className="pt-1">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Total presupuestado</p>
                <p className="font-heading text-3xl font-semibold tabular-nums">
                  {formatCurrency(totalBudget)}
                </p>
              </div>
              <p className="font-heading text-xl font-semibold tabular-nums text-copper">
                {executedPercent.toFixed(0)}% gastado
              </p>
            </div>
            <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full", executedPercent >= 100 ? "bg-[var(--negative)]" : "bg-copper")}
                style={{ width: `${executedPercent}%` }}
              />
            </div>
            <div className="mt-2 flex flex-wrap justify-between gap-x-6 text-sm text-muted-foreground">
              <span>
                Gastado <span className="font-medium text-foreground">{formatCurrency(totalPaid)}</span>
              </span>
              <span>
                Restante{" "}
                <span className={cn("font-medium", remaining < 0 ? "text-[var(--negative)]" : "text-foreground")}>
                  {formatCurrency(remaining)}
                </span>
              </span>
            </div>
          </CardContent>
        </Card>

        <BudgetGrid
          key={lines.map((l) => l.id).join("|")}
          projectId={projectId}
          categories={categories}
          subcategories={subcategories}
          niveles={niveles}
          lines={lines}
        />
      </div>
    </>
  );
}
