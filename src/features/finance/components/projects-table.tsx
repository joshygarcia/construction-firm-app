"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2Icon } from "lucide-react";

import { submitDeleteProject } from "@/features/finance/actions";
import { EditProjectDialog } from "@/features/finance/components/edit-project-dialog";
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
import { formatCurrency } from "@/lib/format";

type ProjectWithSummary = {
  id: string;
  name: string;
  clientName: string;
  location: string;
  status: "draft" | "active" | "paused" | "completed";
  startDate: string;
  endDate: string | null;
  notes: string;
  summary: {
    totalBudget: number;
    totalExpenses: number;
    cashAvailable: number;
  };
};

const statusLabels: Record<string, string> = {
  active: "Activo",
  draft: "Borrador",
  completed: "Completado",
  paused: "Pausado",
};

const searchKeys: (keyof ProjectWithSummary)[] = ["name", "clientName", "location"];

export function ProjectsTable({
  projects,
}: {
  projects: ProjectWithSummary[];
}) {
  const router = useRouter();
  const { query, setQuery, page, totalPages, goToPage, paginated, totalFiltered } =
    useTableControls(projects, searchKeys);

  return (
    <div className="flex flex-col gap-4">
      <SearchBar
        query={query}
        onQueryChange={setQuery}
        placeholder="Buscar por nombre, cliente o ubicación..."
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Proyecto</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Presupuesto</TableHead>
            <TableHead className="text-right">Gastado</TableHead>
            <TableHead className="text-right">Caja</TableHead>
            <TableHead className="w-20" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginated.map((project) => (
            <TableRow key={project.id}>
              <TableCell>
                <Link
                  className="font-medium text-primary underline-offset-4 hover:underline"
                  href={`/projects/${project.id}`}
                >
                  {project.name}
                </Link>
              </TableCell>
              <TableCell>{project.clientName}</TableCell>
              <TableCell>
                <Badge variant={project.status === "active" ? "secondary" : "outline"}>
                  {statusLabels[project.status] ?? project.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums">
                {formatCurrency(project.summary.totalBudget)}
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums">
                {formatCurrency(project.summary.totalExpenses)}
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums">
                {formatCurrency(project.summary.cashAvailable)}
              </TableCell>
              <TableCell>
                <div className="flex items-center justify-end gap-1">
                  <EditProjectDialog project={project} />
                  <ConfirmDialog
                    title="Eliminar proyecto"
                    description="El proyecto y toda su información serán eliminados. Si tiene movimientos activos, no se podrá eliminar."
                    trigger={
                      <Button variant="ghost" size="icon-sm">
                        <Trash2Icon />
                      </Button>
                    }
                    onConfirm={async () => {
                      const result = await submitDeleteProject(project.id);
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
