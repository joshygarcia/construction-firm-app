import { QuickEntryPanel } from "@/features/finance/components/quick-entry-panel";
import { PageHeader } from "@/components/shared/page-header";
import { getReferenceData } from "@/features/finance/store";

type Mode = "expense" | "income" | "contractor_payment";

export default async function RegistrarPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { projectId } = await params;
  const search = await searchParams;
  const tipoRaw = Array.isArray(search.tipo) ? search.tipo[0] : search.tipo;
  const defaultMode: Mode = (
    ["expense", "income", "contractor_payment"] as const
  ).includes(tipoRaw as Mode)
    ? (tipoRaw as Mode)
    : "expense";
  const reference = getReferenceData();

  return (
    <>
      <PageHeader
        description="Elige qué pasó y anótalo una vez. El presupuesto, la caja y los reportes se actualizan solos."
        eyebrow="Registrar"
        title="Registrar un movimiento"
      />
      <div className="px-4 py-6 md:px-8">
        <QuickEntryPanel
          availableModes={["expense", "income", "contractor_payment"]}
          budgetLines={reference.budgetLines}
          budgetRows={reference.budgetRows}
          budgetVersions={reference.budgetVersions}
          cards={reference.cards}
          categories={reference.categories}
          contractorBalances={reference.contractorBalances}
          contractors={reference.contractors}
          contracts={reference.contracts}
          defaultMode={defaultMode}
          defaultProjectId={projectId}
          projectSummaries={reference.projectSummaries}
          projects={reference.projects.filter((p) => p.id === projectId)}
          showImpact={false}
          subcategories={reference.subcategories}
          suggestionOptions={reference.suggestionOptions}
        />
      </div>
    </>
  );
}
