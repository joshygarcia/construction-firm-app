"use client";

import { startTransition, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircleIcon, PencilIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  createQuickEntryCategory,
  createQuickEntrySubcategory,
  createQuickEntrySuggestion,
  submitUpdateTransaction,
} from "@/features/finance/actions";
import { updateTransactionSchema } from "@/features/finance/schemas";
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
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CreatableCombobox } from "@/features/finance/components/creatable-combobox";

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
  cardId?: string | null;
};

type CategoryOption = { id: string; name: string };
type SubcategoryOption = { id: string; categoryId: string; name: string };
type CardOption = { id: string; name: string };

function isCardMethod(method: string | undefined) {
  return (method ?? "").trim().toLocaleLowerCase().includes("tarjeta");
}

export function EditTransactionDialog({
  transaction,
  categories: initialCategories,
  subcategories: initialSubcategories,
  cards,
  counterparties,
  paymentMethods,
}: {
  transaction: Transaction;
  categories: CategoryOption[];
  subcategories: SubcategoryOption[];
  cards: CardOption[];
  counterparties: string[];
  paymentMethods: string[];
}) {
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState(initialCategories);
  const [subcategories, setSubcategories] = useState(initialSubcategories);
  const router = useRouter();
  const isExpense = transaction.transactionType === "expense";

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
      cardId: transaction.cardId ?? "",
    },
  });

  const categoryId = useWatch({ control: form.control, name: "categoryId" });
  const subcategoryId = useWatch({ control: form.control, name: "subcategoryId" });
  const payeeOrSource = useWatch({ control: form.control, name: "payeeOrSource" });
  const paymentMethod = useWatch({ control: form.control, name: "paymentMethod" });
  const cardId = useWatch({ control: form.control, name: "cardId" });

  const categoryOptions = useMemo(
    () => categories.map((c) => ({ value: c.id, label: c.name })),
    [categories],
  );
  const subcategoryOptions = useMemo(
    () =>
      subcategories
        .filter((s) => (categoryId ? s.categoryId === categoryId : false))
        .map((s) => ({ value: s.id, label: s.name })),
    [subcategories, categoryId],
  );

  async function createCategoryOption(name: string) {
    const result = await createQuickEntryCategory(name);
    if (!result.ok || !result.option) {
      toast.error(result.message);
      return null;
    }
    const option = result.option;
    setCategories((current) =>
      current.some((item) => item.id === option.value)
        ? current
        : [...current, { id: option.value, name: option.label }],
    );
    return option;
  }

  async function createSubcategoryOption(catId: string, name: string) {
    const result = await createQuickEntrySubcategory(catId, name);
    if (!result.ok || !result.option) {
      toast.error(result.message);
      return null;
    }
    const option = result.option;
    setSubcategories((current) =>
      current.some((item) => item.id === option.value)
        ? current
        : [...current, { id: option.value, categoryId: catId, name: option.label }],
    );
    return option;
  }

  async function createSuggestionOption(
    kind: "counterparty" | "payment_method",
    value: string,
  ) {
    const result = await createQuickEntrySuggestion(kind, value);
    if (!result.ok || !result.option) {
      toast.error(result.message);
      return null;
    }
    return result.option;
  }

  const onSubmit = form.handleSubmit((values) => {
    const usesCard = isCardMethod(values.paymentMethod);
    const payload = {
      ...values,
      cardId: usesCard ? values.cardId || null : null,
    };

    startTransition(async () => {
      const result = await submitUpdateTransaction(payload as never);

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
              <Input id="edit-tx-date" type="date" {...form.register("transactionDate")} />
              <FieldError errors={[form.formState.errors.transactionDate]} />
            </Field>

            {isExpense ? (
              <>
                <Field data-invalid={!!form.formState.errors.categoryId}>
                  <FieldLabel>Categoría</FieldLabel>
                  <CreatableCombobox
                    onChange={(value) => {
                      form.setValue("categoryId", value);
                      form.setValue("subcategoryId", "");
                    }}
                    onCreate={async (query) => {
                      const option = await createCategoryOption(query);
                      if (!option) return null;
                      form.setValue("subcategoryId", "");
                      return option;
                    }}
                    options={categoryOptions}
                    placeholder="Selecciona o crea una categoría"
                    searchPlaceholder="Buscar o crear categoría"
                    value={categoryId ?? ""}
                  />
                  <FieldError errors={[form.formState.errors.categoryId]} />
                </Field>

                <Field>
                  <FieldLabel>Subcategoría</FieldLabel>
                  <CreatableCombobox
                    allowClear
                    clearLabel="Sin subcategoría"
                    disabled={!categoryId}
                    onChange={(value) => form.setValue("subcategoryId", value)}
                    onCreate={
                      categoryId
                        ? (query) => createSubcategoryOption(categoryId, query)
                        : undefined
                    }
                    options={subcategoryOptions}
                    placeholder="Opcional"
                    searchPlaceholder="Buscar o crear subcategoría"
                    value={subcategoryId ?? ""}
                  />
                  <FieldDescription>
                    El gasto se reconcilia con la partida del presupuesto que coincida.
                  </FieldDescription>
                </Field>
              </>
            ) : null}

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
              <FieldLabel>{isExpense ? "Suplidor o persona" : "Fuente"}</FieldLabel>
              <CreatableCombobox
                onChange={(value) => form.setValue("payeeOrSource", value)}
                onCreate={(query) => createSuggestionOption("counterparty", query)}
                options={counterparties.map((value) => ({ value, label: value }))}
                placeholder="Selecciona o crea"
                searchPlaceholder="Buscar o crear"
                value={payeeOrSource ?? ""}
              />
              <FieldError errors={[form.formState.errors.payeeOrSource]} />
            </Field>

            <Field data-invalid={!!form.formState.errors.paymentMethod}>
              <FieldLabel>Método de pago</FieldLabel>
              <CreatableCombobox
                onChange={(value) => form.setValue("paymentMethod", value)}
                onCreate={(query) => createSuggestionOption("payment_method", query)}
                options={paymentMethods.map((value) => ({ value, label: value }))}
                placeholder="Selecciona o crea un método"
                searchPlaceholder="Buscar o crear método"
                value={paymentMethod ?? ""}
              />
              <FieldError errors={[form.formState.errors.paymentMethod]} />
            </Field>

            {isExpense && isCardMethod(paymentMethod) ? (
              <Field>
                <FieldLabel>Tarjeta</FieldLabel>
                {cards.length > 0 ? (
                  <Select
                    value={cardId ?? ""}
                    onValueChange={(value) => form.setValue("cardId", value ?? "")}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecciona una tarjeta">
                        {cards.find((c) => c.id === cardId)?.name ?? "Selecciona una tarjeta"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {cards.map((card) => (
                          <SelectItem key={card.id} value={card.id}>
                            {card.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm text-amber-600">
                    No hay tarjetas registradas.
                  </p>
                )}
              </Field>
            ) : null}
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
