"use client";

import { startTransition, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircleIcon, PencilIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { submitUpdateBudgetLine } from "@/features/finance/actions";
import {
  updateBudgetLineSchema,
} from "@/features/finance/schemas";
import type { z } from "zod";

type UpdateBudgetLineForm = z.input<typeof updateBudgetLineSchema>;
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type BudgetLineData = {
  id: string;
  categoryId: string | null;
  subcategoryId: string | null;
  phase: string | null;
  area: string | null;
  lineCode: string | null;
  description: string;
  quantity: number | null;
  unit: string | null;
  unitPrice: number | null;
  totalBudgeted: number;
  notes: string;
  isManualTotal: boolean;
};

export function EditBudgetLineDialog({
  budgetLine,
}: {
  budgetLine: BudgetLineData;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const form = useForm<UpdateBudgetLineForm>({
    resolver: zodResolver(updateBudgetLineSchema),
    defaultValues: {
      id: budgetLine.id,
      categoryId: budgetLine.categoryId,
      subcategoryId: budgetLine.subcategoryId,
      description: budgetLine.description,
      phase: budgetLine.phase ?? "",
      area: budgetLine.area ?? "",
      lineCode: budgetLine.lineCode ?? "",
      quantity: budgetLine.quantity,
      unit: budgetLine.unit ?? "",
      unitPrice: budgetLine.unitPrice,
      totalBudgeted: budgetLine.totalBudgeted,
      notes: budgetLine.notes,
      isManualTotal: budgetLine.isManualTotal,
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await submitUpdateBudgetLine(values as any);

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      setOpen(false);
      router.refresh();
    });
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="icon-sm">
            <PencilIcon />
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar línea presupuestaria</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
          <FieldGroup>
            <Field data-invalid={!!form.formState.errors.lineCode}>
              <FieldLabel htmlFor="edit-bl-code">Código</FieldLabel>
              <Input id="edit-bl-code" {...form.register("lineCode")} />
              <FieldError errors={[form.formState.errors.lineCode]} />
            </Field>
            <Field data-invalid={!!form.formState.errors.description}>
              <FieldLabel htmlFor="edit-bl-desc">Descripción</FieldLabel>
              <Input id="edit-bl-desc" {...form.register("description")} />
              <FieldError errors={[form.formState.errors.description]} />
            </Field>
            <Field data-invalid={!!form.formState.errors.phase}>
              <FieldLabel htmlFor="edit-bl-phase">Fase</FieldLabel>
              <Input id="edit-bl-phase" {...form.register("phase")} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field data-invalid={!!form.formState.errors.quantity}>
                <FieldLabel htmlFor="edit-bl-qty">Cantidad</FieldLabel>
                <Input
                  id="edit-bl-qty"
                  type="number"
                  step="0.01"
                  {...form.register("quantity", { valueAsNumber: true })}
                />
              </Field>
              <Field data-invalid={!!form.formState.errors.unit}>
                <FieldLabel htmlFor="edit-bl-unit">Unidad</FieldLabel>
                <Input id="edit-bl-unit" {...form.register("unit")} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field data-invalid={!!form.formState.errors.unitPrice}>
                <FieldLabel htmlFor="edit-bl-price">Precio unitario</FieldLabel>
                <Input
                  id="edit-bl-price"
                  type="number"
                  step="0.01"
                  {...form.register("unitPrice", { valueAsNumber: true })}
                />
              </Field>
              <Field data-invalid={!!form.formState.errors.totalBudgeted}>
                <FieldLabel htmlFor="edit-bl-total">Total</FieldLabel>
                <Input
                  id="edit-bl-total"
                  type="number"
                  step="0.01"
                  {...form.register("totalBudgeted", { valueAsNumber: true })}
                />
              </Field>
            </div>
          </FieldGroup>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && (
                <LoaderCircleIcon className="animate-spin" data-icon="inline-start" />
              )}
              Guardar cambios
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
