"use client";

import { startTransition, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircleIcon, PencilIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { submitUpdateTransaction } from "@/features/finance/actions";
import {
  updateTransactionSchema,
} from "@/features/finance/schemas";
import type { z } from "zod";

type UpdateTransactionForm = z.input<typeof updateTransactionSchema>;
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

type Transaction = {
  id: string;
  transactionDate: string;
  categoryId: string | null;
  subcategoryId: string | null;
  amount: number;
  detail: string;
  payeeOrSource: string;
  paymentMethod: string;
};

export function EditTransactionDialog({
  transaction,
}: {
  transaction: Transaction;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const form = useForm<UpdateTransactionForm>({
    resolver: zodResolver(updateTransactionSchema),
    defaultValues: {
      id: transaction.id,
      transactionDate: transaction.transactionDate,
      categoryId: transaction.categoryId,
      subcategoryId: transaction.subcategoryId,
      amount: transaction.amount,
      detail: transaction.detail,
      payeeOrSource: transaction.payeeOrSource,
      paymentMethod: transaction.paymentMethod,
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await submitUpdateTransaction(values as any);

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
          <DialogTitle>Editar movimiento</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
          <FieldGroup>
            <Field data-invalid={!!form.formState.errors.transactionDate}>
              <FieldLabel htmlFor="edit-tx-date">Fecha</FieldLabel>
              <Input
                id="edit-tx-date"
                type="date"
                {...form.register("transactionDate")}
              />
              <FieldError errors={[form.formState.errors.transactionDate]} />
            </Field>
            <Field data-invalid={!!form.formState.errors.detail}>
              <FieldLabel htmlFor="edit-tx-detail">Detalle</FieldLabel>
              <Input id="edit-tx-detail" {...form.register("detail")} />
              <FieldError errors={[form.formState.errors.detail]} />
            </Field>
            <Field data-invalid={!!form.formState.errors.amount}>
              <FieldLabel htmlFor="edit-tx-amount">Monto</FieldLabel>
              <Input
                id="edit-tx-amount"
                type="number"
                step="0.01"
                {...form.register("amount", { valueAsNumber: true })}
              />
              <FieldError errors={[form.formState.errors.amount]} />
            </Field>
            <Field data-invalid={!!form.formState.errors.payeeOrSource}>
              <FieldLabel htmlFor="edit-tx-payee">Fuente / Suplidor</FieldLabel>
              <Input id="edit-tx-payee" {...form.register("payeeOrSource")} />
              <FieldError errors={[form.formState.errors.payeeOrSource]} />
            </Field>
            <Field data-invalid={!!form.formState.errors.paymentMethod}>
              <FieldLabel htmlFor="edit-tx-method">Método de pago</FieldLabel>
              <Input id="edit-tx-method" {...form.register("paymentMethod")} />
              <FieldError errors={[form.formState.errors.paymentMethod]} />
            </Field>
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
