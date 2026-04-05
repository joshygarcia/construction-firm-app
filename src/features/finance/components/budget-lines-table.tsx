"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2Icon } from "lucide-react";

import { submitDeleteBudgetLine } from "@/features/finance/actions";
import { EditBudgetLineDialog } from "@/features/finance/components/edit-budget-line-dialog";
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
import { formatCurrency } from "@/lib/format";

type BudgetLine = {
  id: string;
  lineCode: string | null;
  description: string;
  phase: string | null;
  area: string | null;
  categoryId: string | null;
  subcategoryId: string | null;
  quantity: number | null;
  unit: string | null;
  unitPrice: number | null;
  totalBudgeted: number;
  notes: string;
  isManualTotal: boolean;
};

const searchKeys: (keyof BudgetLine)[] = ["description", "phase"];

export function BudgetLinesTable({
  budgetLines,
}: {
  budgetLines: BudgetLine[];
}) {
  const router = useRouter();
  const { query, setQuery, page, totalPages, goToPage, paginated, totalFiltered } =
    useTableControls(budgetLines, searchKeys);

  return (
    <div className="flex flex-col gap-4">
      <SearchBar
        query={query}
        onQueryChange={setQuery}
        placeholder="Buscar por descripción o fase..."
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Código</TableHead>
            <TableHead>Descripción</TableHead>
            <TableHead>Fase</TableHead>
            <TableHead className="text-right">Cant.</TableHead>
            <TableHead className="text-right">Precio unit.</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="w-20" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginated.map((line) => (
            <TableRow key={line.id}>
              <TableCell className="font-mono text-[13px]">
                {line.lineCode}
              </TableCell>
              <TableCell>{line.description}</TableCell>
              <TableCell className="text-muted-foreground">
                {line.phase ?? "General"}
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums">
                {line.quantity ?? 0}
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums">
                {formatCurrency(line.unitPrice ?? 0)}
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums">
                {formatCurrency(line.totalBudgeted)}
              </TableCell>
              <TableCell>
                <div className="flex items-center justify-end gap-1">
                  <EditBudgetLineDialog budgetLine={line} />
                  <ConfirmDialog
                    title="Eliminar línea presupuestaria"
                    description="La línea será eliminada del presupuesto. Los movimientos vinculados perderán su referencia a esta línea."
                    trigger={
                      <Button variant="ghost" size="icon-sm">
                        <Trash2Icon />
                      </Button>
                    }
                    onConfirm={async () => {
                      const result = await submitDeleteBudgetLine(line.id);
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
