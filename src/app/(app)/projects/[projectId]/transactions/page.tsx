import Link from "next/link";
import { PlusIcon } from "lucide-react";

import { TransactionsTable } from "@/features/finance/components/transactions-table";
import { TransactionsCalendar } from "@/components/projects/transactions-calendar";
import { PageHeader } from "@/components/shared/page-header";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getTransactionsSnapshot } from "@/features/finance/store";
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
  const activeMonth = getParam(search.month);

  return (
    <>
      <PageHeader
        description="Todo lo que entra y sale del proyecto, en un solo lugar."
        eyebrow="Movimientos"
        title="Movimientos"
        actions={
          <Link
            href={`/projects/${projectId}/registrar`}
            className={cn(buttonVariants({ size: "default" }), "gap-2 rounded-xl")}
          >
            <PlusIcon className="size-4" />
            Registrar
          </Link>
        }
      />
      <div className="flex flex-col gap-6 px-4 py-6 md:px-8">
        {months.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/projects/${projectId}/transactions`}
              className={cn(
                buttonVariants({ variant: !activeMonth ? "secondary" : "outline", size: "sm" }),
                "rounded-full",
              )}
            >
              Todos
            </Link>
            {months.map((month) => (
              <Link
                key={month}
                href={`/projects/${projectId}/transactions?month=${month}`}
                className={cn(
                  buttonVariants({ variant: month === activeMonth ? "secondary" : "outline", size: "sm" }),
                  "rounded-full",
                )}
              >
                {month}
              </Link>
            ))}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Historial</CardTitle>
          </CardHeader>
          <CardContent>
            <TransactionsTable transactions={snapshot.transactions} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Calendario</CardTitle>
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
