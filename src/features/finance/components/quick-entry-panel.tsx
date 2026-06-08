"use client";

import { startTransition, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  LoaderCircleIcon,
  Repeat2Icon,
  SaveIcon,
  WalletCardsIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  createQuickEntryCategory,
  createQuickEntrySubcategory,
  createQuickEntrySuggestion,
  submitQuickEntry,
} from "@/features/finance/actions";
import type {
  BudgetLine,
  BudgetVsActualRow,
  BudgetVersion,
  Card as CardEntity,
  Category,
  Contractor,
  ContractorBalanceRow,
  ContractorContract,
  Project,
  ProjectSummary,
  SuggestionKind,
  SuggestionOption,
  Subcategory,
} from "@/features/finance/ledger";
import {
  CreatableCombobox,
  type CreatableOption,
} from "@/features/finance/components/creatable-combobox";
import { QuickEntryImpactCard } from "@/features/finance/components/quick-entry-impact-card";
import { deriveQuickEntryPreview } from "@/features/finance/quick-entry-preview";
import {
  budgetLineSchema,
  contractorPaymentSchema,
  expenseSchema,
  incomeSchema,
  type BudgetLineFormValues,
  type BudgetLineInput,
  type ContractorPaymentFormValues,
  type ContractorPaymentInput,
  type ExpenseFormValues,
  type ExpenseInput,
  type IncomeFormValues,
  type IncomeInput,
} from "@/features/finance/schemas";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

type Mode = "expense" | "income" | "contractor_payment" | "budget_line";

type QuickEntryPanelProps = {
  projects: Project[];
  categories: Category[];
  subcategories: Subcategory[];
  budgetVersions: BudgetVersion[];
  budgetLines: BudgetLine[];
  budgetRows: Array<BudgetVsActualRow & { projectId: string }>;
  projectSummaries: ProjectSummary[];
  contractors: Contractor[];
  contractorBalances: ContractorBalanceRow[];
  contracts: ContractorContract[];
  suggestionOptions: SuggestionOption[];
  cards?: CardEntity[];
  defaultProjectId?: string;
  defaultMode?: Mode;
  availableModes?: Mode[];
};

/** ¿El método de pago seleccionado es "tarjeta"? */
function isCardMethod(method: string | undefined) {
  return (method ?? "").trim().toLocaleLowerCase().includes("tarjeta");
}

type CreatableFieldProps = {
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

const modeLabels: Record<Mode, string> = {
  expense: "Gasto",
  income: "Ingreso",
  contractor_payment: "Pago a contratista",
  budget_line: "Linea de presupuesto",
};

function toEntityOptions<T extends { id: string; name: string }>(items: T[]) {
  return items.map((item) => ({
    value: item.id,
    label: item.name,
  }));
}

function toSuggestionOptions(
  suggestionOptions: SuggestionOption[] | undefined,
  kind: SuggestionKind,
) {
  return (suggestionOptions ?? [])
    .filter((option) => option.kind === kind)
    .map((option) => ({
      value: option.value,
      label: option.value,
    }));
}

function FormActions({
  isPending,
  canRepeat,
  onRepeat,
  submitLabel,
}: {
  isPending: boolean;
  canRepeat: boolean;
  onRepeat: () => void;
  submitLabel: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button disabled={isPending} type="submit">
        {isPending ? (
          <LoaderCircleIcon className="animate-spin" data-icon="inline-start" />
        ) : (
          <SaveIcon data-icon="inline-start" />
        )}
        {submitLabel}
      </Button>
      {canRepeat ? (
        <Button onClick={onRepeat} type="button" variant="outline">
          <Repeat2Icon data-icon="inline-start" />
          Repetir ultima
        </Button>
      ) : null}
    </div>
  );
}

function useSubcategoryOptions(
  categoryId: string | undefined,
  subcategories: Subcategory[],
) {
  return useMemo(
    () =>
      subcategories.filter((subcategory) =>
        categoryId ? subcategory.categoryId === categoryId : false,
      ),
    [categoryId, subcategories],
  );
}

function ExpenseTab(
  props: QuickEntryPanelProps &
    CreatableFieldProps & {
    lastEntry: ExpenseInput | null;
    onSuccess: (input: ExpenseInput) => void;
  },
) {
  const router = useRouter();
  const form = useForm<ExpenseFormValues, unknown, ExpenseInput>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      mode: "expense",
      projectId: props.defaultProjectId ?? props.projects[0]?.id ?? "",
      transactionDate: new Date().toISOString().slice(0, 10),
      categoryId: props.categories[0]?.id ?? "",
      subcategoryId: "",
      budgetLineId: "",
      amount: 0,
      detail: "",
      payeeOrSource: "",
      paymentMethod: "transferencia",
      cardId: "",
    },
  });

  const cards = useMemo(
    () => (props.cards ?? []).filter((card) => card.isActive),
    [props.cards],
  );
  const selectedProjectId = useWatch({
    control: form.control,
    name: "projectId",
  });
  const selectedCardId = useWatch({
    control: form.control,
    name: "cardId",
  });
  const selectedCategoryId = useWatch({
    control: form.control,
    name: "categoryId",
  });
  const selectedSubcategoryId = useWatch({
    control: form.control,
    name: "subcategoryId",
  });
  const selectedBudgetLineId = useWatch({
    control: form.control,
    name: "budgetLineId",
  });
  const selectedPayeeOrSource = useWatch({
    control: form.control,
    name: "payeeOrSource",
  });
  const selectedPaymentMethod = useWatch({
    control: form.control,
    name: "paymentMethod",
  });
  const selectedTransactionDate = useWatch({
    control: form.control,
    name: "transactionDate",
  });
  const selectedAmount = Number(
    useWatch({
      control: form.control,
      name: "amount",
    }) ?? 0,
  );

  const subcategoryOptions = useSubcategoryOptions(
    selectedCategoryId,
    props.subcategories,
  );
  const categoryOptions = useMemo(
    () => toEntityOptions(props.categories),
    [props.categories],
  );
  const subcategorySelectOptions = useMemo(
    () => toEntityOptions(subcategoryOptions),
    [subcategoryOptions],
  );
  const counterpartyOptions = useMemo(
    () => toSuggestionOptions(props.suggestionOptions, "counterparty"),
    [props.suggestionOptions],
  );
  const paymentMethodOptions = useMemo(
    () => toSuggestionOptions(props.suggestionOptions, "payment_method"),
    [props.suggestionOptions],
  );
  const previewContext = useMemo(
    () => ({
      projects: props.projects,
      projectSummaries: props.projectSummaries,
      budgetRows: props.budgetRows,
      budgetLines: props.budgetLines,
      contractors: props.contractors,
      contracts: props.contracts,
      contractorBalances: props.contractorBalances,
    }),
    [
      props.budgetLines,
      props.budgetRows,
      props.contractorBalances,
      props.contractors,
      props.contracts,
      props.projectSummaries,
      props.projects,
    ],
  );
  const availableBudgetLines = useMemo(
    () =>
      props.budgetLines.filter((line) => {
        if (line.projectId !== selectedProjectId) {
          return false;
        }

        if (line.categoryId !== selectedCategoryId) {
          return false;
        }

        if (!selectedSubcategoryId) {
          return true;
        }

        return line.subcategoryId === selectedSubcategoryId;
      }),
    [props.budgetLines, selectedCategoryId, selectedProjectId, selectedSubcategoryId],
  );
  const preview = useMemo(
    () =>
      deriveQuickEntryPreview(previewContext, {
        mode: "expense",
        projectId: selectedProjectId ?? "",
        transactionDate: selectedTransactionDate ?? undefined,
        amount: selectedAmount,
        categoryId: selectedCategoryId,
        subcategoryId: selectedSubcategoryId,
        budgetLineId: selectedBudgetLineId,
      }),
    [
      previewContext,
      selectedAmount,
      selectedBudgetLineId,
      selectedCategoryId,
      selectedProjectId,
      selectedSubcategoryId,
      selectedTransactionDate,
    ],
  );

  const onSubmit = form.handleSubmit((values) => {
    const usesCard = isCardMethod(values.paymentMethod);
    if (usesCard && !values.cardId) {
      toast.error("Selecciona la tarjeta con la que se pagó.");
      return;
    }
    // Si no es tarjeta, no guardar ninguna tarjeta asociada.
    const payload: ExpenseInput = { ...values, cardId: usesCard ? values.cardId : null };

    startTransition(async () => {
      const result = await submitQuickEntry(payload);

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      props.onSuccess(payload);
      toast.success(result.message);
      form.reset({
        ...values,
        budgetLineId: values.budgetLineId ?? "",
        cardId: usesCard ? values.cardId ?? "" : "",
        amount: 0,
        detail: "",
        payeeOrSource: "",
      });
      router.refresh();
    });
  });

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
      <form className="flex flex-col gap-5" onSubmit={onSubmit}>
        <FieldGroup>
        {props.projects.length > 1 && (
        <Field data-invalid={!!form.formState.errors.projectId}>
          <FieldLabel>Proyecto</FieldLabel>
          <Select
            value={selectedProjectId ?? ""}
            onValueChange={(value) => form.setValue("projectId", value ?? "")}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecciona un proyecto">
                {props.projects.find((p) => p.id === selectedProjectId)?.name ?? "Selecciona un proyecto"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {props.projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <FieldError errors={[form.formState.errors.projectId]} />
        </Field>
        )}

        <Field data-invalid={!!form.formState.errors.transactionDate}>
          <FieldLabel>Fecha</FieldLabel>
          <Input type="date" {...form.register("transactionDate")} />
          <FieldError errors={[form.formState.errors.transactionDate]} />
        </Field>

        <Field data-invalid={!!form.formState.errors.categoryId}>
          <FieldLabel>Categoria</FieldLabel>
          <CreatableCombobox
            onChange={(value) => {
              form.setValue("categoryId", value);
              form.setValue("subcategoryId", "");
              form.setValue("budgetLineId", "");
            }}
            onCreate={async (query) => {
              const option = await props.createCategoryOption(query);

              if (!option) {
                return null;
              }

              form.setValue("subcategoryId", "");
              form.setValue("budgetLineId", "");
              return option;
            }}
            options={categoryOptions}
            placeholder="Selecciona o crea una categoria"
            searchPlaceholder="Buscar o crear categoria"
            value={selectedCategoryId ?? ""}
          />
          <FieldError errors={[form.formState.errors.categoryId]} />
        </Field>

        <Field>
          <FieldLabel>Subcategoria</FieldLabel>
          <CreatableCombobox
            allowClear
            clearLabel="Sin subcategoria"
            disabled={!selectedCategoryId}
            onChange={(value) => {
              form.setValue("subcategoryId", value);
              form.setValue("budgetLineId", "");
            }}
            onCreate={
              selectedCategoryId
                ? async (query) => {
                    const option = await props.createSubcategoryOption(
                      selectedCategoryId,
                      query,
                    );

                    if (!option) {
                      return null;
                    }

                    form.setValue("budgetLineId", "");
                    return option;
                  }
                : undefined
            }
            options={subcategorySelectOptions}
            placeholder="Opcional"
            searchPlaceholder="Buscar o crear subcategoria"
            value={selectedSubcategoryId ?? ""}
          />
        </Field>

        <Field>
          <FieldLabel>Linea de presupuesto</FieldLabel>
          <Select
            value={selectedBudgetLineId ?? ""}
            onValueChange={(value) => form.setValue("budgetLineId", value ?? "")}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Opcional">
                {availableBudgetLines.find((l) => l.id === selectedBudgetLineId)?.description ?? "Opcional"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {availableBudgetLines.map((line) => (
                  <SelectItem key={line.id} value={line.id}>
                    {line.description}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <FieldDescription>
            Si la linea coincide, el presupuesto se reconcilia automaticamente.
          </FieldDescription>
        </Field>

        <Field data-invalid={!!form.formState.errors.amount}>
          <FieldLabel>Monto</FieldLabel>
          <Input inputMode="decimal" step="0.01" type="number" {...form.register("amount")} />
          <FieldError errors={[form.formState.errors.amount]} />
        </Field>

        <Field data-invalid={!!form.formState.errors.detail}>
          <FieldLabel>Detalle</FieldLabel>
          <Textarea rows={3} {...form.register("detail")} />
          <FieldError errors={[form.formState.errors.detail]} />
        </Field>

        <Field data-invalid={!!form.formState.errors.payeeOrSource}>
          <FieldLabel>Suplidor o persona</FieldLabel>
          <CreatableCombobox
            onChange={(value) => form.setValue("payeeOrSource", value)}
            onCreate={(query) =>
              props.createSuggestionOption("counterparty", query)
            }
            options={counterpartyOptions}
            placeholder="Selecciona o crea un suplidor"
            searchPlaceholder="Buscar o crear suplidor"
            value={selectedPayeeOrSource}
          />
          <FieldError errors={[form.formState.errors.payeeOrSource]} />
        </Field>

        <Field data-invalid={!!form.formState.errors.paymentMethod}>
          <FieldLabel>Metodo de pago</FieldLabel>
          <CreatableCombobox
            onChange={(value) => form.setValue("paymentMethod", value)}
            onCreate={(query) =>
              props.createSuggestionOption("payment_method", query)
            }
            options={paymentMethodOptions}
            placeholder="Selecciona o crea un metodo"
            searchPlaceholder="Buscar o crear metodo"
            value={selectedPaymentMethod}
          />
          <FieldDescription>Ejemplo: transferencia, cheque, efectivo, tarjeta.</FieldDescription>
          <FieldError errors={[form.formState.errors.paymentMethod]} />
        </Field>

        {isCardMethod(selectedPaymentMethod) ? (
          <Field>
            <FieldLabel>Tarjeta</FieldLabel>
            {cards.length > 0 ? (
              <Select
                value={selectedCardId ?? ""}
                onValueChange={(value) => form.setValue("cardId", value ?? "")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona una tarjeta">
                    {cards.find((c) => c.id === selectedCardId)?.name ?? "Selecciona una tarjeta"}
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
                No hay tarjetas. Créalas en Finanzas para usar este método.
              </p>
            )}
            <FieldDescription>
              El gasto en tarjeta no descuenta el efectivo: queda como saldo por pagar de la tarjeta.
            </FieldDescription>
          </Field>
        ) : null}
        </FieldGroup>

        <FormActions
          canRepeat={!!props.lastEntry}
          isPending={form.formState.isSubmitting}
          onRepeat={() => {
            if (!props.lastEntry) {
              return;
            }

            form.reset({
              ...props.lastEntry,
              budgetLineId: props.lastEntry.budgetLineId ?? "",
              cardId: props.lastEntry.cardId ?? "",
            });
          }}
          submitLabel="Guardar gasto"
        />
      </form>
      <QuickEntryImpactCard preview={preview} />
    </div>
  );
}

function IncomeTab(
  props: QuickEntryPanelProps &
    CreatableFieldProps & {
    lastEntry: IncomeInput | null;
    onSuccess: (input: IncomeInput) => void;
  },
) {
  const router = useRouter();
  const form = useForm<IncomeFormValues, unknown, IncomeInput>({
    resolver: zodResolver(incomeSchema),
    defaultValues: {
      mode: "income",
      projectId: props.defaultProjectId ?? props.projects[0]?.id ?? "",
      transactionDate: new Date().toISOString().slice(0, 10),
      amount: 0,
      detail: "",
      payeeOrSource: "Cliente",
      paymentMethod: "transferencia",
    },
  });

  const selectedProjectId = useWatch({
    control: form.control,
    name: "projectId",
  });
  const selectedTransactionDate = useWatch({
    control: form.control,
    name: "transactionDate",
  });
  const selectedPayeeOrSource = useWatch({
    control: form.control,
    name: "payeeOrSource",
  });
  const selectedPaymentMethod = useWatch({
    control: form.control,
    name: "paymentMethod",
  });
  const selectedAmount = Number(
    useWatch({
      control: form.control,
      name: "amount",
    }) ?? 0,
  );
  const counterpartyOptions = useMemo(
    () => toSuggestionOptions(props.suggestionOptions, "counterparty"),
    [props.suggestionOptions],
  );
  const paymentMethodOptions = useMemo(
    () => toSuggestionOptions(props.suggestionOptions, "payment_method"),
    [props.suggestionOptions],
  );
  const previewContext = useMemo(
    () => ({
      projects: props.projects,
      projectSummaries: props.projectSummaries,
      budgetRows: props.budgetRows,
      budgetLines: props.budgetLines,
      contractors: props.contractors,
      contracts: props.contracts,
      contractorBalances: props.contractorBalances,
    }),
    [
      props.budgetLines,
      props.budgetRows,
      props.contractorBalances,
      props.contractors,
      props.contracts,
      props.projectSummaries,
      props.projects,
    ],
  );
  const preview = useMemo(
    () =>
      deriveQuickEntryPreview(previewContext, {
        mode: "income",
        projectId: selectedProjectId ?? "",
        transactionDate: selectedTransactionDate ?? undefined,
        amount: selectedAmount,
      }),
    [previewContext, selectedAmount, selectedProjectId, selectedTransactionDate],
  );

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await submitQuickEntry(values);

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      props.onSuccess(values);
      toast.success(result.message);
      form.reset({ ...values, amount: 0, detail: "" });
      router.refresh();
    });
  });

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
      <form className="flex flex-col gap-5" onSubmit={onSubmit}>
        <FieldGroup>
        {props.projects.length > 1 && (
        <Field data-invalid={!!form.formState.errors.projectId}>
          <FieldLabel>Proyecto</FieldLabel>
          <Select
            value={selectedProjectId ?? ""}
            onValueChange={(value) => form.setValue("projectId", value ?? "")}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecciona un proyecto">
                {props.projects.find((p) => p.id === selectedProjectId)?.name ?? "Selecciona un proyecto"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {props.projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <FieldError errors={[form.formState.errors.projectId]} />
        </Field>
        )}

        <Field data-invalid={!!form.formState.errors.transactionDate}>
          <FieldLabel>Fecha</FieldLabel>
          <Input type="date" {...form.register("transactionDate")} />
          <FieldError errors={[form.formState.errors.transactionDate]} />
        </Field>

        <Field data-invalid={!!form.formState.errors.amount}>
          <FieldLabel>Monto</FieldLabel>
          <Input inputMode="decimal" step="0.01" type="number" {...form.register("amount")} />
          <FieldError errors={[form.formState.errors.amount]} />
        </Field>

        <Field data-invalid={!!form.formState.errors.detail}>
          <FieldLabel>Hito o detalle</FieldLabel>
          <Textarea rows={3} {...form.register("detail")} />
          <FieldError errors={[form.formState.errors.detail]} />
        </Field>

        <Field data-invalid={!!form.formState.errors.payeeOrSource}>
          <FieldLabel>Fuente</FieldLabel>
          <CreatableCombobox
            onChange={(value) => form.setValue("payeeOrSource", value)}
            onCreate={(query) =>
              props.createSuggestionOption("counterparty", query)
            }
            options={counterpartyOptions}
            placeholder="Selecciona o crea una fuente"
            searchPlaceholder="Buscar o crear fuente"
            value={selectedPayeeOrSource}
          />
          <FieldError errors={[form.formState.errors.payeeOrSource]} />
        </Field>

        <Field data-invalid={!!form.formState.errors.paymentMethod}>
          <FieldLabel>Metodo de pago</FieldLabel>
          <CreatableCombobox
            onChange={(value) => form.setValue("paymentMethod", value)}
            onCreate={(query) =>
              props.createSuggestionOption("payment_method", query)
            }
            options={paymentMethodOptions}
            placeholder="Selecciona o crea un metodo"
            searchPlaceholder="Buscar o crear metodo"
            value={selectedPaymentMethod}
          />
          <FieldError errors={[form.formState.errors.paymentMethod]} />
        </Field>
        </FieldGroup>

        <FormActions
          canRepeat={!!props.lastEntry}
          isPending={form.formState.isSubmitting}
          onRepeat={() => props.lastEntry && form.reset(props.lastEntry)}
          submitLabel="Guardar ingreso"
        />
      </form>
      <QuickEntryImpactCard preview={preview} />
    </div>
  );
}

function ContractorPaymentTab(
  props: QuickEntryPanelProps &
    CreatableFieldProps & {
    lastEntry: ContractorPaymentInput | null;
    onSuccess: (input: ContractorPaymentInput) => void;
  },
) {
  const router = useRouter();
  const form = useForm<ContractorPaymentFormValues, unknown, ContractorPaymentInput>({
    resolver: zodResolver(contractorPaymentSchema),
    defaultValues: {
      mode: "contractor_payment",
      projectId: props.defaultProjectId ?? props.projects[0]?.id ?? "",
      contractorContractId: props.contracts[0]?.id ?? "",
      transactionDate: new Date().toISOString().slice(0, 10),
      amount: 0,
      detail: "",
      paymentMethod: "transferencia",
      notes: "",
    },
  });

  const selectedProjectId = useWatch({
    control: form.control,
    name: "projectId",
  });
  const selectedContractId = useWatch({
    control: form.control,
    name: "contractorContractId",
  });
  const selectedTransactionDate = useWatch({
    control: form.control,
    name: "transactionDate",
  });
  const selectedPaymentMethod = useWatch({
    control: form.control,
    name: "paymentMethod",
  });
  const selectedAmount = Number(
    useWatch({
      control: form.control,
      name: "amount",
    }) ?? 0,
  );
  const paymentMethodOptions = useMemo(
    () => toSuggestionOptions(props.suggestionOptions, "payment_method"),
    [props.suggestionOptions],
  );
  const previewContext = useMemo(
    () => ({
      projects: props.projects,
      projectSummaries: props.projectSummaries,
      budgetRows: props.budgetRows,
      budgetLines: props.budgetLines,
      contractors: props.contractors,
      contracts: props.contracts,
      contractorBalances: props.contractorBalances,
    }),
    [
      props.budgetLines,
      props.budgetRows,
      props.contractorBalances,
      props.contractors,
      props.contracts,
      props.projectSummaries,
      props.projects,
    ],
  );

  const contractorNameMap = useMemo(
    () => new Map(props.contractors.map((c) => [c.id, c.fullName])),
    [props.contractors],
  );
  const availableContracts = useMemo(
    () => props.contracts.filter((contract) => contract.projectId === selectedProjectId),
    [props.contracts, selectedProjectId],
  );
  const contractLabel = (contract: (typeof availableContracts)[number]) => {
    const name = contractorNameMap.get(contract.contractorId) ?? "Contratista";
    return `${name} — ${contract.scopeDescription}`;
  };
  const preview = useMemo(
    () =>
      deriveQuickEntryPreview(previewContext, {
        mode: "contractor_payment",
        projectId: selectedProjectId ?? "",
        transactionDate: selectedTransactionDate ?? undefined,
        amount: selectedAmount,
        contractorContractId: selectedContractId,
      }),
    [
      previewContext,
      selectedAmount,
      selectedContractId,
      selectedProjectId,
      selectedTransactionDate,
    ],
  );

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await submitQuickEntry(values);

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      props.onSuccess(values);
      toast.success(result.message);
      form.reset({ ...values, amount: 0, detail: "", notes: "" });
      router.refresh();
    });
  });

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
      <form className="flex flex-col gap-5" onSubmit={onSubmit}>
        <FieldGroup>
        {props.projects.length > 1 && (
        <Field data-invalid={!!form.formState.errors.projectId}>
          <FieldLabel>Proyecto</FieldLabel>
          <Select
            value={selectedProjectId ?? ""}
            onValueChange={(value) => {
              const nextProjectId = value ?? "";
              const fallbackContractId =
                props.contracts.find((contract) => contract.projectId === nextProjectId)?.id ?? "";
              form.setValue("projectId", nextProjectId);
              form.setValue("contractorContractId", fallbackContractId);
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecciona un proyecto">
                {props.projects.find((p) => p.id === selectedProjectId)?.name ?? "Selecciona un proyecto"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {props.projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <FieldError errors={[form.formState.errors.projectId]} />
        </Field>
        )}

        <Field data-invalid={!!form.formState.errors.contractorContractId}>
          <FieldLabel>Contrato</FieldLabel>
          <Select
            value={selectedContractId ?? ""}
            onValueChange={(value) =>
              form.setValue("contractorContractId", value ?? "")
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecciona un contrato">
                {(() => {
                  const match = availableContracts.find((c) => c.id === selectedContractId);
                  return match ? contractLabel(match) : "Selecciona un contrato";
                })()}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {availableContracts.map((contract) => (
                  <SelectItem key={contract.id} value={contract.id}>
                    {contractLabel(contract)}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <FieldError errors={[form.formState.errors.contractorContractId]} />
        </Field>

        <Field data-invalid={!!form.formState.errors.transactionDate}>
          <FieldLabel>Fecha</FieldLabel>
          <Input type="date" {...form.register("transactionDate")} />
          <FieldError errors={[form.formState.errors.transactionDate]} />
        </Field>

        <Field data-invalid={!!form.formState.errors.amount}>
          <FieldLabel>Monto</FieldLabel>
          <Input inputMode="decimal" step="0.01" type="number" {...form.register("amount")} />
          <FieldError errors={[form.formState.errors.amount]} />
        </Field>

        <Field data-invalid={!!form.formState.errors.detail}>
          <FieldLabel>Detalle</FieldLabel>
          <Textarea rows={3} {...form.register("detail")} />
          <FieldError errors={[form.formState.errors.detail]} />
        </Field>

        <Field data-invalid={!!form.formState.errors.paymentMethod}>
          <FieldLabel>Metodo de pago</FieldLabel>
          <CreatableCombobox
            onChange={(value) => form.setValue("paymentMethod", value)}
            onCreate={(query) =>
              props.createSuggestionOption("payment_method", query)
            }
            options={paymentMethodOptions}
            placeholder="Selecciona o crea un metodo"
            searchPlaceholder="Buscar o crear metodo"
            value={selectedPaymentMethod}
          />
          <FieldError errors={[form.formState.errors.paymentMethod]} />
        </Field>

        <Field>
          <FieldLabel>Notas</FieldLabel>
          <Textarea rows={3} {...form.register("notes")} />
        </Field>
        </FieldGroup>

        <FormActions
          canRepeat={!!props.lastEntry}
          isPending={form.formState.isSubmitting}
          onRepeat={() => {
            if (!props.lastEntry) {
              return;
            }

            form.reset({
              ...props.lastEntry,
              notes: props.lastEntry.notes ?? "",
            });
          }}
          submitLabel="Guardar pago"
        />
      </form>
      <QuickEntryImpactCard preview={preview} />
    </div>
  );
}

function BudgetLineTab(
  props: QuickEntryPanelProps &
    CreatableFieldProps & {
    lastEntry: BudgetLineInput | null;
    onSuccess: (input: BudgetLineInput) => void;
  },
) {
  const router = useRouter();
  const form = useForm<BudgetLineFormValues, unknown, BudgetLineInput>({
    resolver: zodResolver(budgetLineSchema),
    defaultValues: {
      mode: "budget_line",
      projectId: props.defaultProjectId ?? props.projects[0]?.id ?? "",
      budgetVersionId: props.budgetVersions[0]?.id ?? "",
      categoryId: props.categories[0]?.id ?? "",
      subcategoryId: "",
      description: "",
      phase: "",
      area: "",
      lineCode: "",
      quantity: 1,
      unit: "PA",
      unitPrice: 0,
      totalBudgeted: 0,
      notes: "",
      isManualTotal: false,
    },
  });

  const selectedProjectId = useWatch({
    control: form.control,
    name: "projectId",
  });
  const selectedBudgetVersionId = useWatch({
    control: form.control,
    name: "budgetVersionId",
  });
  const selectedCategoryId = useWatch({
    control: form.control,
    name: "categoryId",
  });
  const selectedSubcategoryId = useWatch({
    control: form.control,
    name: "subcategoryId",
  });
  const quantity = useWatch({
    control: form.control,
    name: "quantity",
  });
  const unitPrice = useWatch({
    control: form.control,
    name: "unitPrice",
  });
  const previewContext = useMemo(
    () => ({
      projects: props.projects,
      projectSummaries: props.projectSummaries,
      budgetRows: props.budgetRows,
      budgetLines: props.budgetLines,
      contractors: props.contractors,
      contracts: props.contracts,
      contractorBalances: props.contractorBalances,
    }),
    [
      props.budgetLines,
      props.budgetRows,
      props.contractorBalances,
      props.contractors,
      props.contracts,
      props.projectSummaries,
      props.projects,
    ],
  );

  const subcategoryOptions = useSubcategoryOptions(
    selectedCategoryId,
    props.subcategories,
  );
  const categoryOptions = useMemo(
    () => toEntityOptions(props.categories),
    [props.categories],
  );
  const subcategorySelectOptions = useMemo(
    () => toEntityOptions(subcategoryOptions),
    [subcategoryOptions],
  );
  const computedTotal = Number(quantity ?? 0) * Number(unitPrice ?? 0);
  const preview = useMemo(
    () =>
      deriveQuickEntryPreview(previewContext, {
        mode: "budget_line",
        projectId: selectedProjectId ?? "",
        amount: computedTotal,
        categoryId: selectedCategoryId,
        subcategoryId: selectedSubcategoryId,
        budgetVersionId: selectedBudgetVersionId,
      }),
    [
      computedTotal,
      previewContext,
      selectedBudgetVersionId,
      selectedCategoryId,
      selectedProjectId,
      selectedSubcategoryId,
    ],
  );

  const onSubmit = form.handleSubmit((values) => {
    const payload: BudgetLineInput = {
      ...values,
      totalBudgeted: values.isManualTotal
        ? values.totalBudgeted
        : values.quantity * values.unitPrice,
    };

    startTransition(async () => {
      const result = await submitQuickEntry(payload);

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      props.onSuccess(payload);
      toast.success(result.message);
      form.reset({
        ...payload,
        subcategoryId: payload.subcategoryId ?? "",
        description: "",
        phase: "",
        area: "",
        lineCode: "",
        unitPrice: 0,
        totalBudgeted: 0,
        notes: "",
      });
      router.refresh();
    });
  });

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
      <form className="flex flex-col gap-5" onSubmit={onSubmit}>
        <FieldGroup>
        {props.projects.length > 1 && (
        <Field data-invalid={!!form.formState.errors.projectId}>
          <FieldLabel>Proyecto</FieldLabel>
          <Select
            value={selectedProjectId ?? ""}
            onValueChange={(value) => {
              const nextProjectId = value ?? "";
              const fallbackVersionId =
                props.budgetVersions.find((version) => version.projectId === nextProjectId)?.id ??
                "";
              form.setValue("projectId", nextProjectId);
              form.setValue("budgetVersionId", fallbackVersionId);
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecciona un proyecto">
                {props.projects.find((p) => p.id === selectedProjectId)?.name ?? "Selecciona un proyecto"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {props.projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <FieldError errors={[form.formState.errors.projectId]} />
        </Field>
        )}

        <Field data-invalid={!!form.formState.errors.categoryId}>
          <FieldLabel>Categoria</FieldLabel>
          <CreatableCombobox
            onChange={(value) => {
              form.setValue("categoryId", value);
              form.setValue("subcategoryId", "");
            }}
            onCreate={async (query) => {
              const option = await props.createCategoryOption(query);

              if (!option) {
                return null;
              }

              form.setValue("subcategoryId", "");
              return option;
            }}
            options={categoryOptions}
            placeholder="Selecciona o crea una categoria"
            searchPlaceholder="Buscar o crear categoria"
            value={selectedCategoryId ?? ""}
          />
          <FieldError errors={[form.formState.errors.categoryId]} />
        </Field>

        <Field>
          <FieldLabel>Subcategoria</FieldLabel>
          <CreatableCombobox
            allowClear
            clearLabel="Sin subcategoria"
            disabled={!selectedCategoryId}
            onChange={(value) => form.setValue("subcategoryId", value)}
            onCreate={
              selectedCategoryId
                ? (query) =>
                    props.createSubcategoryOption(selectedCategoryId, query)
                : undefined
            }
            options={subcategorySelectOptions}
            placeholder="Opcional"
            searchPlaceholder="Buscar o crear subcategoria"
            value={selectedSubcategoryId ?? ""}
          />
        </Field>

        <Field data-invalid={!!form.formState.errors.description}>
          <FieldLabel>Descripcion</FieldLabel>
          <Textarea rows={3} {...form.register("description")} />
          <FieldError errors={[form.formState.errors.description]} />
        </Field>

        <Field data-invalid={!!form.formState.errors.quantity}>
          <FieldLabel>Cantidad</FieldLabel>
          <Input inputMode="decimal" step="0.01" type="number" {...form.register("quantity")} />
          <FieldError errors={[form.formState.errors.quantity]} />
        </Field>

        <Field data-invalid={!!form.formState.errors.unit}>
          <FieldLabel>Unidad</FieldLabel>
          <Input {...form.register("unit")} />
          <FieldError errors={[form.formState.errors.unit]} />
        </Field>

        <Field data-invalid={!!form.formState.errors.unitPrice}>
          <FieldLabel>Precio unitario</FieldLabel>
          <Input inputMode="decimal" step="0.01" type="number" {...form.register("unitPrice")} />
          <FieldError errors={[form.formState.errors.unitPrice]} />
        </Field>

        <Field>
          <FieldLabel>Total calculado</FieldLabel>
          <Input readOnly value={computedTotal.toFixed(2)} />
          <FieldDescription>
            El total se calcula desde cantidad por precio unitario.
          </FieldDescription>
        </Field>

        <Field>
          <FieldLabel>Notas</FieldLabel>
          <Textarea rows={3} {...form.register("notes")} />
        </Field>
        </FieldGroup>

        <FormActions
          canRepeat={!!props.lastEntry}
          isPending={form.formState.isSubmitting}
          onRepeat={() => {
            if (!props.lastEntry) {
              return;
            }

            form.reset({
              ...props.lastEntry,
              subcategoryId: props.lastEntry.subcategoryId ?? "",
              phase: props.lastEntry.phase ?? "",
              area: props.lastEntry.area ?? "",
              lineCode: props.lastEntry.lineCode ?? "",
              notes: props.lastEntry.notes ?? "",
            });
          }}
          submitLabel="Guardar linea"
        />
      </form>
      <QuickEntryImpactCard preview={preview} />
    </div>
  );
}

export function QuickEntryPanel(props: QuickEntryPanelProps) {
  const availableModes = props.availableModes ?? [
    "expense",
    "income",
    "contractor_payment",
    "budget_line",
  ];
  const [categories, setCategories] = useState(props.categories);
  const [subcategories, setSubcategories] = useState(props.subcategories);
  const [suggestionOptions, setSuggestionOptions] = useState(
    props.suggestionOptions ?? [],
  );
  const [lastExpense, setLastExpense] = useState<ExpenseInput | null>(null);
  const [lastIncome, setLastIncome] = useState<IncomeInput | null>(null);
  const [lastContractorPayment, setLastContractorPayment] =
    useState<ContractorPaymentInput | null>(null);
  const [lastBudgetLine, setLastBudgetLine] = useState<BudgetLineInput | null>(null);

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
        : [
            ...current,
            {
              id: option.value,
              name: option.label,
              sortOrder:
                current.reduce((max, item) => Math.max(max, item.sortOrder), 0) + 1,
              isActive: true,
            },
          ],
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
        : [
            ...current,
            {
              id: option.value,
              categoryId,
              name: option.label,
              sortOrder:
                current
                  .filter((item) => item.categoryId === categoryId)
                  .reduce((max, item) => Math.max(max, item.sortOrder), 0) + 1,
              isActive: true,
            },
          ],
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

    const option = result.option;

    setSuggestionOptions((current) =>
      current.some(
        (item) => item.kind === kind && item.value === option.value,
      )
        ? current
        : [
            ...current,
            {
              id: `local-${kind}-${option.value}`,
              kind,
              value: option.value,
              normalizedValue: option.value.trim().toLocaleLowerCase(),
              createdAt: new Date().toISOString(),
            },
          ],
    );
    toast.success(result.message);
    return option;
  }

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-heading text-xl tracking-tight">
          <WalletCardsIcon className="text-primary" />
          Quick Entry
        </CardTitle>
        <CardDescription>
          Registra un movimiento una sola vez y deja que el ledger distribuya el impacto.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs className="gap-5" defaultValue={props.defaultMode ?? availableModes[0]}>
          <TabsList>
            {availableModes.map((mode) => (
              <TabsTrigger key={mode} value={mode}>
                {modeLabels[mode]}
              </TabsTrigger>
            ))}
          </TabsList>

          {availableModes.includes("expense") ? (
            <TabsContent value="expense">
              <ExpenseTab
                {...props}
                categories={categories}
                createCategoryOption={createCategoryOption}
                createSubcategoryOption={createSubcategoryOption}
                createSuggestionOption={createSuggestionOption}
                lastEntry={lastExpense}
                onSuccess={setLastExpense}
                subcategories={subcategories}
                suggestionOptions={suggestionOptions}
              />
            </TabsContent>
          ) : null}

          {availableModes.includes("income") ? (
            <TabsContent value="income">
              <IncomeTab
                {...props}
                categories={categories}
                createCategoryOption={createCategoryOption}
                createSubcategoryOption={createSubcategoryOption}
                createSuggestionOption={createSuggestionOption}
                lastEntry={lastIncome}
                onSuccess={setLastIncome}
                subcategories={subcategories}
                suggestionOptions={suggestionOptions}
              />
            </TabsContent>
          ) : null}

          {availableModes.includes("contractor_payment") ? (
            <TabsContent value="contractor_payment">
              <ContractorPaymentTab
                {...props}
                categories={categories}
                createCategoryOption={createCategoryOption}
                createSubcategoryOption={createSubcategoryOption}
                createSuggestionOption={createSuggestionOption}
                lastEntry={lastContractorPayment}
                onSuccess={setLastContractorPayment}
                subcategories={subcategories}
                suggestionOptions={suggestionOptions}
              />
            </TabsContent>
          ) : null}

          {availableModes.includes("budget_line") ? (
            <TabsContent value="budget_line">
              <BudgetLineTab
                {...props}
                categories={categories}
                createCategoryOption={createCategoryOption}
                createSubcategoryOption={createSubcategoryOption}
                createSuggestionOption={createSuggestionOption}
                lastEntry={lastBudgetLine}
                onSuccess={setLastBudgetLine}
                subcategories={subcategories}
                suggestionOptions={suggestionOptions}
              />
            </TabsContent>
          ) : null}
        </Tabs>
      </CardContent>
    </Card>
  );
}
