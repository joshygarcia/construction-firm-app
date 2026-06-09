"use client";

import { startTransition, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  HardHatIcon,
  LoaderCircleIcon,
  ReceiptTextIcon,
  SaveIcon,
  TrendingUpIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  createQuickEntryCategory,
  createQuickEntrySubcategory,
  createQuickEntrySuggestion,
  submitQuickEntry,
} from "@/features/finance/actions";
import type { SuggestionKind } from "@/features/finance/ledger";
import {
  CreatableCombobox,
  type CreatableOption,
} from "@/features/finance/components/creatable-combobox";
import {
  contractorPaymentSchema,
  expenseSchema,
  incomeSchema,
  type ContractorPaymentFormValues,
  type ContractorPaymentInput,
  type ExpenseFormValues,
  type ExpenseInput,
  type IncomeFormValues,
  type IncomeInput,
} from "@/features/finance/schemas";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Mode = "expense" | "income" | "contractor_payment";

type CategoryOption = { id: string; name: string };
type SubcategoryOption = { id: string; categoryId: string; name: string };
type BudgetLineOption = {
  id: string;
  categoryId: string | null;
  subcategoryId: string | null;
  description: string;
  unit: string | null;
  unitPrice: number | null;
};
type ContractOption = { id: string; contractorId: string; scopeDescription: string };
type ContractorOption = { id: string; fullName: string };
type CardOption = { id: string; name: string };

export type RegistrarFormProps = {
  projectId: string;
  defaultMode: Mode;
  categories: CategoryOption[];
  subcategories: SubcategoryOption[];
  budgetLines: BudgetLineOption[];
  contracts: ContractOption[];
  contractors: ContractorOption[];
  cards: CardOption[];
  counterparties: string[];
  paymentMethods: string[];
};

type CreatableHandlers = {
  createCategoryOption: (name: string) => Promise<CreatableOption | null>;
  createSubcategoryOption: (
    categoryId: string,
    name: string,
  ) => Promise<CreatableOption | null>;
  createSuggestionOption: (
    kind: SuggestionKind,
    value: string,
  ) => Promise<CreatableOption | null>;
};

function isCardMethod(method: string | undefined) {
  return (method ?? "").trim().toLocaleLowerCase().includes("tarjeta");
}

function toStringOptions(values: string[]): CreatableOption[] {
  return values.map((value) => ({ value, label: value }));
}

const today = () => new Date().toISOString().slice(0, 10);

const modeMeta: Record<
  Mode,
  { label: string; hint: string; Icon: typeof ReceiptTextIcon }
> = {
  expense: {
    label: "Gasto",
    hint: "Sale dinero del proyecto",
    Icon: ReceiptTextIcon,
  },
  income: {
    label: "Ingreso",
    hint: "Entra dinero al proyecto",
    Icon: TrendingUpIcon,
  },
  contractor_payment: {
    label: "Pago a contratista",
    hint: "Abono a un contrato",
    Icon: HardHatIcon,
  },
};

function SubmitButton({ isPending, label }: { isPending: boolean; label: string }) {
  return (
    <Button className="w-full" disabled={isPending} size="lg" type="submit">
      {isPending ? (
        <LoaderCircleIcon className="animate-spin" data-icon="inline-start" />
      ) : (
        <SaveIcon data-icon="inline-start" />
      )}
      {label}
    </Button>
  );
}

/* ------------------------------------------------------------------ */
/* Gasto                                                               */
/* ------------------------------------------------------------------ */

function ExpenseForm(
  props: RegistrarFormProps &
    CreatableHandlers & {
      categories: CategoryOption[];
      subcategories: SubcategoryOption[];
    },
) {
  const router = useRouter();
  const form = useForm<ExpenseFormValues, unknown, ExpenseInput>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      mode: "expense",
      projectId: props.projectId,
      transactionDate: today(),
      categoryId: "",
      subcategoryId: "",
      budgetLineId: "",
      amount: 0,
      detail: "",
      payeeOrSource: "",
      paymentMethod: "transferencia",
      cardId: "",
    },
  });

  const categoryId = useWatch({ control: form.control, name: "categoryId" });
  const subcategoryId = useWatch({ control: form.control, name: "subcategoryId" });
  const budgetLineId = useWatch({ control: form.control, name: "budgetLineId" });
  const payeeOrSource = useWatch({ control: form.control, name: "payeeOrSource" });
  const paymentMethod = useWatch({ control: form.control, name: "paymentMethod" });
  const cardId = useWatch({ control: form.control, name: "cardId" });

  const activeCards = useMemo(() => props.cards, [props.cards]);
  const categoryName = useMemo(
    () => new Map(props.categories.map((c) => [c.id, c.name])),
    [props.categories],
  );

  const categoryOptions = useMemo(
    () => props.categories.map((c) => ({ value: c.id, label: c.name })),
    [props.categories],
  );
  const subcategoryOptions = useMemo(
    () =>
      props.subcategories
        .filter((s) => (categoryId ? s.categoryId === categoryId : false))
        .map((s) => ({ value: s.id, label: s.name })),
    [props.subcategories, categoryId],
  );

  // Partidas del presupuesto -> autocompletan la categoría/subcategoría/detalle.
  const budgetLineOptions = useMemo(
    () =>
      props.budgetLines.map((line) => {
        const cat = line.categoryId ? categoryName.get(line.categoryId) : null;
        const label = cat ? `${line.description} — ${cat}` : line.description;
        return { value: line.id, label };
      }),
    [props.budgetLines, categoryName],
  );

  function selectBudgetLine(id: string) {
    const line = props.budgetLines.find((l) => l.id === id);
    if (!line) {
      form.setValue("budgetLineId", "");
      return;
    }
    form.setValue("budgetLineId", line.id);
    if (line.categoryId) form.setValue("categoryId", line.categoryId);
    form.setValue("subcategoryId", line.subcategoryId ?? "");
    if (!form.getValues("detail")?.trim()) {
      form.setValue("detail", line.description);
    }
  }

  const onSubmit = form.handleSubmit((values) => {
    const usesCard = isCardMethod(values.paymentMethod);
    if (usesCard && !values.cardId) {
      toast.error("Selecciona la tarjeta con la que se pagó.");
      return;
    }
    const payload: ExpenseInput = {
      ...values,
      cardId: usesCard ? values.cardId : null,
    };

    startTransition(async () => {
      const result = await submitQuickEntry(payload);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      form.reset({
        ...values,
        budgetLineId: "",
        cardId: usesCard ? values.cardId ?? "" : "",
        amount: 0,
        detail: "",
        payeeOrSource: "",
      });
      router.refresh();
    });
  });

  return (
    <form className="flex flex-col gap-5" onSubmit={onSubmit}>
      <FieldGroup>
        {props.budgetLines.length > 0 ? (
          <Field>
            <FieldLabel>Partida del presupuesto</FieldLabel>
            <CreatableCombobox
              allowClear
              clearLabel="Sin partida (gasto libre)"
              onChange={selectBudgetLine}
              options={budgetLineOptions}
              placeholder="Busca una partida del presupuesto"
              searchPlaceholder="Buscar partida…"
              value={budgetLineId ?? ""}
            />
            <FieldDescription>
              Al elegir una partida se llenan la categoría y el detalle, y el gasto
              se descuenta de esa partida.
            </FieldDescription>
          </Field>
        ) : null}

        <Field data-invalid={!!form.formState.errors.categoryId}>
          <FieldLabel>Categoría</FieldLabel>
          <CreatableCombobox
            onChange={(value) => {
              form.setValue("categoryId", value);
              form.setValue("subcategoryId", "");
              form.setValue("budgetLineId", "");
            }}
            onCreate={async (query) => {
              const option = await props.createCategoryOption(query);
              if (!option) return null;
              form.setValue("subcategoryId", "");
              form.setValue("budgetLineId", "");
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
            onChange={(value) => {
              form.setValue("subcategoryId", value);
              form.setValue("budgetLineId", "");
            }}
            onCreate={
              categoryId
                ? async (query) => {
                    const option = await props.createSubcategoryOption(categoryId, query);
                    if (!option) return null;
                    form.setValue("budgetLineId", "");
                    return option;
                  }
                : undefined
            }
            options={subcategoryOptions}
            placeholder="Opcional"
            searchPlaceholder="Buscar o crear subcategoría"
            value={subcategoryId ?? ""}
          />
        </Field>

        <Field data-invalid={!!form.formState.errors.amount}>
          <FieldLabel>Monto</FieldLabel>
          <Input inputMode="decimal" step="0.01" type="number" {...form.register("amount")} />
          <FieldError errors={[form.formState.errors.amount]} />
        </Field>

        <Field data-invalid={!!form.formState.errors.detail}>
          <FieldLabel>Detalle</FieldLabel>
          <Textarea rows={2} {...form.register("detail")} />
          <FieldError errors={[form.formState.errors.detail]} />
        </Field>

        <Field data-invalid={!!form.formState.errors.payeeOrSource}>
          <FieldLabel>Suplidor o persona</FieldLabel>
          <CreatableCombobox
            onChange={(value) => form.setValue("payeeOrSource", value)}
            onCreate={(query) => props.createSuggestionOption("counterparty", query)}
            options={toStringOptions(props.counterparties)}
            placeholder="Selecciona o crea un suplidor"
            searchPlaceholder="Buscar o crear suplidor"
            value={payeeOrSource}
          />
          <FieldError errors={[form.formState.errors.payeeOrSource]} />
        </Field>

        <Field data-invalid={!!form.formState.errors.paymentMethod}>
          <FieldLabel>Método de pago</FieldLabel>
          <CreatableCombobox
            onChange={(value) => form.setValue("paymentMethod", value)}
            onCreate={(query) => props.createSuggestionOption("payment_method", query)}
            options={toStringOptions(props.paymentMethods)}
            placeholder="Selecciona o crea un método"
            searchPlaceholder="Buscar o crear método"
            value={paymentMethod}
          />
          <FieldDescription>Ejemplo: transferencia, cheque, efectivo, tarjeta.</FieldDescription>
          <FieldError errors={[form.formState.errors.paymentMethod]} />
        </Field>

        {isCardMethod(paymentMethod) ? (
          <Field>
            <FieldLabel>Tarjeta</FieldLabel>
            {activeCards.length > 0 ? (
              <Select
                value={cardId ?? ""}
                onValueChange={(value) => form.setValue("cardId", value ?? "")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona una tarjeta">
                    {activeCards.find((c) => c.id === cardId)?.name ?? "Selecciona una tarjeta"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {activeCards.map((card) => (
                      <SelectItem key={card.id} value={card.id}>
                        {card.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            ) : (
              <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm text-amber-600">
                No hay tarjetas. Créalas en Finanzas para usar este método.
              </p>
            )}
            <FieldDescription>
              El gasto en tarjeta no descuenta el efectivo: queda como saldo por pagar de la tarjeta.
            </FieldDescription>
          </Field>
        ) : null}

        <Field data-invalid={!!form.formState.errors.transactionDate}>
          <FieldLabel>Fecha</FieldLabel>
          <Input type="date" {...form.register("transactionDate")} />
          <FieldError errors={[form.formState.errors.transactionDate]} />
        </Field>
      </FieldGroup>

      <SubmitButton isPending={form.formState.isSubmitting} label="Guardar gasto" />
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Ingreso                                                             */
/* ------------------------------------------------------------------ */

function IncomeForm(props: RegistrarFormProps & CreatableHandlers) {
  const router = useRouter();
  const form = useForm<IncomeFormValues, unknown, IncomeInput>({
    resolver: zodResolver(incomeSchema),
    defaultValues: {
      mode: "income",
      projectId: props.projectId,
      transactionDate: today(),
      amount: 0,
      detail: "",
      payeeOrSource: "Cliente",
      paymentMethod: "transferencia",
    },
  });

  const payeeOrSource = useWatch({ control: form.control, name: "payeeOrSource" });
  const paymentMethod = useWatch({ control: form.control, name: "paymentMethod" });

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await submitQuickEntry(values);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      form.reset({ ...values, amount: 0, detail: "" });
      router.refresh();
    });
  });

  return (
    <form className="flex flex-col gap-5" onSubmit={onSubmit}>
      <FieldGroup>
        <Field data-invalid={!!form.formState.errors.amount}>
          <FieldLabel>Monto</FieldLabel>
          <Input inputMode="decimal" step="0.01" type="number" {...form.register("amount")} />
          <FieldError errors={[form.formState.errors.amount]} />
        </Field>

        <Field data-invalid={!!form.formState.errors.detail}>
          <FieldLabel>Hito o detalle</FieldLabel>
          <Textarea rows={2} {...form.register("detail")} />
          <FieldError errors={[form.formState.errors.detail]} />
        </Field>

        <Field data-invalid={!!form.formState.errors.payeeOrSource}>
          <FieldLabel>Fuente</FieldLabel>
          <CreatableCombobox
            onChange={(value) => form.setValue("payeeOrSource", value)}
            onCreate={(query) => props.createSuggestionOption("counterparty", query)}
            options={toStringOptions(props.counterparties)}
            placeholder="Selecciona o crea una fuente"
            searchPlaceholder="Buscar o crear fuente"
            value={payeeOrSource}
          />
          <FieldError errors={[form.formState.errors.payeeOrSource]} />
        </Field>

        <Field data-invalid={!!form.formState.errors.paymentMethod}>
          <FieldLabel>Método de pago</FieldLabel>
          <CreatableCombobox
            onChange={(value) => form.setValue("paymentMethod", value)}
            onCreate={(query) => props.createSuggestionOption("payment_method", query)}
            options={toStringOptions(props.paymentMethods)}
            placeholder="Selecciona o crea un método"
            searchPlaceholder="Buscar o crear método"
            value={paymentMethod}
          />
          <FieldError errors={[form.formState.errors.paymentMethod]} />
        </Field>

        <Field data-invalid={!!form.formState.errors.transactionDate}>
          <FieldLabel>Fecha</FieldLabel>
          <Input type="date" {...form.register("transactionDate")} />
          <FieldError errors={[form.formState.errors.transactionDate]} />
        </Field>
      </FieldGroup>

      <SubmitButton isPending={form.formState.isSubmitting} label="Guardar ingreso" />
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Pago a contratista                                                  */
/* ------------------------------------------------------------------ */

function ContractorPaymentForm(props: RegistrarFormProps & CreatableHandlers) {
  const router = useRouter();
  const contractorName = useMemo(
    () => new Map(props.contractors.map((c) => [c.id, c.fullName])),
    [props.contractors],
  );
  const contractLabel = (contract: ContractOption) =>
    `${contractorName.get(contract.contractorId) ?? "Contratista"} — ${contract.scopeDescription}`;

  const form = useForm<ContractorPaymentFormValues, unknown, ContractorPaymentInput>({
    resolver: zodResolver(contractorPaymentSchema),
    defaultValues: {
      mode: "contractor_payment",
      projectId: props.projectId,
      contractorContractId: props.contracts[0]?.id ?? "",
      transactionDate: today(),
      amount: 0,
      detail: "",
      paymentMethod: "transferencia",
      notes: "",
    },
  });

  const contractId = useWatch({ control: form.control, name: "contractorContractId" });
  const paymentMethod = useWatch({ control: form.control, name: "paymentMethod" });

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await submitQuickEntry(values);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      form.reset({ ...values, amount: 0, detail: "", notes: "" });
      router.refresh();
    });
  });

  if (props.contracts.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
        Aún no hay contratos en este proyecto. Crea un contrato en la sección de
        Contratistas para poder registrar pagos.
      </div>
    );
  }

  return (
    <form className="flex flex-col gap-5" onSubmit={onSubmit}>
      <FieldGroup>
        <Field data-invalid={!!form.formState.errors.contractorContractId}>
          <FieldLabel>Contrato</FieldLabel>
          <Select
            value={contractId ?? ""}
            onValueChange={(value) => form.setValue("contractorContractId", value ?? "")}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecciona un contrato">
                {(() => {
                  const match = props.contracts.find((c) => c.id === contractId);
                  return match ? contractLabel(match) : "Selecciona un contrato";
                })()}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {props.contracts.map((contract) => (
                  <SelectItem key={contract.id} value={contract.id}>
                    {contractLabel(contract)}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <FieldError errors={[form.formState.errors.contractorContractId]} />
        </Field>

        <Field data-invalid={!!form.formState.errors.amount}>
          <FieldLabel>Monto</FieldLabel>
          <Input inputMode="decimal" step="0.01" type="number" {...form.register("amount")} />
          <FieldError errors={[form.formState.errors.amount]} />
        </Field>

        <Field data-invalid={!!form.formState.errors.detail}>
          <FieldLabel>Detalle</FieldLabel>
          <Textarea rows={2} {...form.register("detail")} />
          <FieldError errors={[form.formState.errors.detail]} />
        </Field>

        <Field data-invalid={!!form.formState.errors.paymentMethod}>
          <FieldLabel>Método de pago</FieldLabel>
          <CreatableCombobox
            onChange={(value) => form.setValue("paymentMethod", value)}
            onCreate={(query) => props.createSuggestionOption("payment_method", query)}
            options={toStringOptions(props.paymentMethods)}
            placeholder="Selecciona o crea un método"
            searchPlaceholder="Buscar o crear método"
            value={paymentMethod}
          />
          <FieldError errors={[form.formState.errors.paymentMethod]} />
        </Field>

        <Field>
          <FieldLabel>Notas</FieldLabel>
          <Textarea rows={2} {...form.register("notes")} />
        </Field>

        <Field data-invalid={!!form.formState.errors.transactionDate}>
          <FieldLabel>Fecha</FieldLabel>
          <Input type="date" {...form.register("transactionDate")} />
          <FieldError errors={[form.formState.errors.transactionDate]} />
        </Field>
      </FieldGroup>

      <SubmitButton isPending={form.formState.isSubmitting} label="Guardar pago" />
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Contenedor                                                          */
/* ------------------------------------------------------------------ */

export function RegistrarForm(props: RegistrarFormProps) {
  const [mode, setMode] = useState<Mode>(props.defaultMode);
  const [categories, setCategories] = useState(props.categories);
  const [subcategories, setSubcategories] = useState(props.subcategories);

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
    toast.success(result.message);
    return option;
  }

  async function createSubcategoryOption(categoryId: string, name: string) {
    const result = await createQuickEntrySubcategory(categoryId, name);
    if (!result.ok || !result.option) {
      toast.error(result.message);
      return null;
    }
    const option = result.option;
    setSubcategories((current) =>
      current.some((item) => item.id === option.value)
        ? current
        : [...current, { id: option.value, categoryId, name: option.label }],
    );
    toast.success(result.message);
    return option;
  }

  async function createSuggestionOption(kind: SuggestionKind, value: string) {
    const result = await createQuickEntrySuggestion(kind, value);
    if (!result.ok || !result.option) {
      toast.error(result.message);
      return null;
    }
    toast.success(result.message);
    return result.option;
  }

  const handlers: CreatableHandlers = {
    createCategoryOption,
    createSubcategoryOption,
    createSuggestionOption,
  };
  const shared = { ...props, categories, subcategories };

  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {(Object.keys(modeMeta) as Mode[]).map((value) => {
          const { label, hint, Icon } = modeMeta[value];
          const active = value === mode;
          return (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              className={cn(
                "flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-colors",
                active
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border hover:border-primary/40 hover:bg-muted/50",
              )}
            >
              <Icon className={cn("size-5", active ? "text-primary" : "text-muted-foreground")} />
              <span className={cn("text-sm font-medium", active && "text-primary")}>{label}</span>
              <span className="text-xs text-muted-foreground">{hint}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-6">
        {mode === "expense" ? <ExpenseForm {...shared} {...handlers} /> : null}
        {mode === "income" ? <IncomeForm {...shared} {...handlers} /> : null}
        {mode === "contractor_payment" ? (
          <ContractorPaymentForm {...shared} {...handlers} />
        ) : null}
      </div>
    </div>
  );
}
