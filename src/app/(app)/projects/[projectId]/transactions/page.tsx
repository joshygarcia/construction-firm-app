import { QuickEntryPanel } from "@/features/finance/components/quick-entry-panel";
import { TransactionsTable } from "@/features/finance/components/transactions-table";
import { TransactionsCalendar } from "@/components/projects/transactions-calendar";
import { PageHeader } from "@/components/shared/page-header";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getTransactionsSnapshot, getReferenceData } from "@/features/finance/store";
import { cn } from "@/lib/utils";

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ProjectTransactionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ projectId }, search] = await Promise.all([params, searchParams]);
  const snapshot = getTransactionsSnapshot({
    projectId,
    month: getParam(search.month),
    categoryId: getParam(search.categoryId),
    transactionType:
      (getParam(search.transactionType) as "expense" | "income" | "all" | undefined) ?? "all",
  });

  if (!snapshot) {
    return null;
  }

  const months = [...new Set(snapshot.transactions.map((item) => item.transactionDate.slice(0, 7)))];
  const reference = getReferenceData();

  return (
    <>
      <PageHeader
        description="Registra movimientos y consulta el ledger del proyecto."
        eyebrow="Movimientos"
        title="Entrada rápida + Ledger"
      />
      <div className="flex flex-col gap-6 px-4 py-6 md:px-6">
        <div className="flex flex-wrap gap-2">
          {months.map((month) => (
            <a
              className={cn(
                buttonVariants({
                  variant: month === getParam(search.month) ? "secondary" : "outline",
                  size: "sm",
                }),
              )}
              key={month}
              href={`/projects/${projectId}/transactions?month=${month}`}
            >
              {month}
            </a>
          ))}
        </div>

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
          defaultMode="expense"
          defaultProjectId={projectId}
          projectSummaries={reference.projectSummaries}
          projects={reference.projects.filter((p) => p.id === projectId)}
          subcategories={reference.subcategories}
          suggestionOptions={reference.suggestionOptions}
        />

        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Ledger filtrado</CardTitle>
          </CardHeader>
          <CardContent>
            <TransactionsTable transactions={snapshot.transactions} />
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Calendario de movimientos</CardTitle>
          </CardHeader>
          <CardContent>
            <TransactionsCalendar
              transactions={snapshot.transactions.map((item) => ({
                id: item.id,
                transactionDate: item.transactionDate,
                amount: item.amount,
                detail: item.detail,
                transactionType: item.transactionType,
                payeeOrSource: item.payeeOrSource,
              }))}
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
