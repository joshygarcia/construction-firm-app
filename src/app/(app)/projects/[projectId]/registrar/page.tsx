import { PageHeader } from "@/components/shared/page-header";
import { RegistrarForm } from "@/features/finance/components/registrar-form";
import { orderBudgetLinesForDisplay } from "@/features/finance/ledger";
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

  const budgetLines = orderBudgetLinesForDisplay(
    reference.budgetLines.filter((line) => line.projectId === projectId),
  ).map((line) => ({
    id: line.id,
    categoryId: line.categoryId,
    subcategoryId: line.subcategoryId,
    description: line.description,
    unit: line.unit,
    unitPrice: line.unitPrice,
  }));

  const categories = [...reference.categories]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((c) => ({ id: c.id, name: c.name }));

  const subcategories = reference.subcategories.map((s) => ({
    id: s.id,
    categoryId: s.categoryId,
    name: s.name,
  }));

  const contracts = reference.contracts
    .filter((contract) => contract.projectId === projectId)
    .map((contract) => ({
      id: contract.id,
      contractorId: contract.contractorId,
      scopeDescription: contract.scopeDescription,
    }));

  const contractors = reference.contractors.map((c) => ({
    id: c.id,
    fullName: c.fullName,
  }));

  const cards = reference.cards
    .filter((card) => card.isActive)
    .map((card) => ({ id: card.id, name: card.name }));

  const counterparties = reference.suggestionOptions
    .filter((option) => option.kind === "counterparty")
    .map((option) => option.value);

  const paymentMethods = reference.suggestionOptions
    .filter((option) => option.kind === "payment_method")
    .map((option) => option.value);

  return (
    <>
      <PageHeader
        description="Elige qué pasó y anótalo una vez. El presupuesto, la caja y los reportes se actualizan solos."
        eyebrow="Registrar"
        title="Registrar un movimiento"
      />
      <div className="px-4 py-6 md:px-8">
        <RegistrarForm
          budgetLines={budgetLines}
          cards={cards}
          categories={categories}
          contractors={contractors}
          contracts={contracts}
          counterparties={counterparties}
          defaultMode={defaultMode}
          paymentMethods={paymentMethods}
          projectId={projectId}
          subcategories={subcategories}
        />
      </div>
    </>
  );
}
