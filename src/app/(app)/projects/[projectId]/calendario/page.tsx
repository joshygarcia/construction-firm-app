import { PageHeader } from "@/components/shared/page-header";
import { TransactionsCalendar } from "@/components/projects/transactions-calendar";
import { getTransactionsSnapshot } from "@/features/finance/store";

export default async function ProjectCalendarPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const snapshot = getTransactionsSnapshot({ projectId, transactionType: "all" });

  if (!snapshot) {
    return null;
  }

  const events = snapshot.transactions.map((item) => ({
    id: item.id,
    transactionDate: item.transactionDate,
    amount: item.amount,
    detail: item.detail,
    transactionType: item.transactionType,
    payeeOrSource: item.payeeOrSource,
  }));

  return (
    <>
      <PageHeader
        description="Visualiza los movimientos del proyecto por día, semana, mes o año."
        eyebrow="Calendario"
        title="Calendario de movimientos"
      />
      <div className="flex flex-col gap-6 px-4 py-6 md:px-6">
        <TransactionsCalendar transactions={events} />
      </div>
    </>
  );
}
