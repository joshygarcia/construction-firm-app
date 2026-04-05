"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2Icon } from "lucide-react";

import { submitDeleteTransaction } from "@/features/finance/actions";
import { EditTransactionDialog } from "@/features/finance/components/edit-transaction-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  Pagination,
  SearchBar,
  useTableControls,
} from "@/components/shared/data-table-controls";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/format";

type Transaction = {
  id: string;
  transactionDate: string;
  transactionType: "expense" | "income";
  categoryId: string | null;
  subcategoryId: string | null;
  amount: number;
  detail: string;
  payeeOrSource: string;
  paymentMethod: string;
};

const searchKeys: (keyof Transaction)[] = ["detail", "payeeOrSource", "paymentMethod"];

export function TransactionsTable({
  transactions,
}: {
  transactions: Transaction[];
}) {
  const router = useRouter();
  const { query, setQuery, page, totalPages, goToPage, paginated, totalFiltered } =
    useTableControls(transactions, searchKeys);

  return (
    <div className="flex flex-col gap-4">
      <SearchBar
        query={query}
        onQueryChange={setQuery}
        placeholder="Buscar por detalle, fuente o método..."
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Detalle</TableHead>
            <TableHead>Fuente</TableHead>
            <TableHead>Método</TableHead>
            <TableHead className="text-right">Monto</TableHead>
            <TableHead className="w-20" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginated.map((transaction) => (
            <TableRow key={transaction.id}>
              <TableCell className="font-mono text-[13px]">
                {formatDate(transaction.transactionDate)}
              </TableCell>
              <TableCell>
                <Badge
                  variant={
                    transaction.transactionType === "income" ? "secondary" : "outline"
                  }
                >
                  {transaction.transactionType === "income" ? "Ingreso" : "Gasto"}
                </Badge>
              </TableCell>
              <TableCell>{transaction.detail}</TableCell>
              <TableCell className="text-muted-foreground">
                {transaction.payeeOrSource}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {transaction.paymentMethod}
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums">
                {formatCurrency(transaction.amount)}
              </TableCell>
              <TableCell>
                <div className="flex items-center justify-end gap-1">
                  <EditTransactionDialog transaction={transaction} />
                  <ConfirmDialog
                    title="Eliminar movimiento"
                    description="Este movimiento se marcará como eliminado. Esta acción no se puede deshacer fácilmente."
                    trigger={
                      <Button variant="ghost" size="icon-sm">
                        <Trash2Icon />
                      </Button>
                    }
                    onConfirm={async () => {
                      const result = await submitDeleteTransaction(transaction.id);
                      if (result.ok) {
                        toast.success(result.message);
                        router.refresh();
                      } else {
                        toast.error(result.message);
                      }
                      return result;
                    }}
                  />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Pagination
        page={page}
        totalPages={totalPages}
        totalItems={totalFiltered}
        onPageChange={goToPage}
      />
    </div>
  );
}
