import type {
  BudgetLine,
  BudgetVsActualRow,
  Contractor,
  ContractorBalanceRow,
  ContractorContract,
  Project,
  ProjectSummary,
} from "@/features/finance/ledger";

export type QuickEntryPreviewContext = {
  projects: Project[];
  projectSummaries: ProjectSummary[];
  budgetRows: Array<BudgetVsActualRow & { projectId: string }>;
  budgetLines: BudgetLine[];
  contractors: Contractor[];
  contracts: ContractorContract[];
  contractorBalances: ContractorBalanceRow[];
};

export type QuickEntryPreviewInput =
  | {
      mode: "expense";
      projectId: string;
      transactionDate?: string;
      amount: number;
      categoryId?: string | null;
      subcategoryId?: string | null;
      budgetLineId?: string | null;
    }
  | {
      mode: "income";
      projectId: string;
      transactionDate?: string;
      amount: number;
    }
  | {
      mode: "contractor_payment";
      projectId: string;
      transactionDate?: string;
      amount: number;
      contractorContractId?: string | null;
    }
  | {
      mode: "budget_line";
      projectId: string;
      amount: number;
      categoryId?: string | null;
      subcategoryId?: string | null;
      budgetVersionId?: string | null;
    };

export type QuickEntryPreview = {
  mode: QuickEntryPreviewInput["mode"];
  projectId: string;
  projectName: string;
  monthKey: string | null;
  cashDelta: number;
  projectedCashAvailable: number;
  projectedBudgetTotal: number;
  projectedBudgetRemaining: number;
  categoryName: string | null;
  subcategoryName: string | null;
  projectedActual: number | null;
  projectedRemaining: number | null;
  matchedBudgetLineDescription: string | null;
  contractorName: string | null;
  contractorPendingBalanceBefore: number | null;
  contractorPendingBalanceAfter: number | null;
};

function monthKeyFromDate(value?: string) {
  return value && value.length >= 7 ? value.slice(0, 7) : null;
}

function emptyPreview(mode: QuickEntryPreviewInput["mode"]): QuickEntryPreview {
  return {
    mode,
    projectId: "",
    projectName: "Sin proyecto",
    monthKey: null,
    cashDelta: 0,
    projectedCashAvailable: 0,
    projectedBudgetTotal: 0,
    projectedBudgetRemaining: 0,
    categoryName: null,
    subcategoryName: null,
    projectedActual: null,
    projectedRemaining: null,
    matchedBudgetLineDescription: null,
    contractorName: null,
    contractorPendingBalanceBefore: null,
    contractorPendingBalanceAfter: null,
  };
}

export function deriveQuickEntryPreview(
  context: QuickEntryPreviewContext,
  input: QuickEntryPreviewInput,
): QuickEntryPreview {
  const project = context.projects.find((item) => item.id === input.projectId);

  if (!project) {
    return emptyPreview(input.mode);
  }

  const summary =
    context.projectSummaries.find((item) => item.projectId === input.projectId) ?? null;
  const amount = Number.isFinite(input.amount) ? Math.max(input.amount, 0) : 0;
  const categoryId = "categoryId" in input ? (input.categoryId ?? null) : null;
  const subcategoryId = "subcategoryId" in input ? (input.subcategoryId ?? null) : null;
  const matchedBudgetLine =
    "budgetLineId" in input && input.budgetLineId
      ? context.budgetLines.find((line) => line.id === input.budgetLineId) ?? null
      : context.budgetLines.find(
          (line) =>
            line.projectId === input.projectId &&
            line.categoryId === categoryId &&
            line.subcategoryId === subcategoryId,
        ) ??
        context.budgetLines.find(
          (line) =>
            line.projectId === input.projectId &&
            line.categoryId === categoryId &&
            line.subcategoryId === null,
        ) ??
        null;
  const budgetRow =
    context.budgetRows.find(
      (row) =>
        row.projectId === input.projectId &&
        row.categoryId === categoryId &&
        row.subcategoryId === subcategoryId,
    ) ??
    context.budgetRows.find(
      (row) =>
        row.projectId === input.projectId &&
        row.categoryId === categoryId &&
        row.subcategoryId === null,
    ) ??
    null;
  const contractorBalance =
    input.mode === "contractor_payment" && input.contractorContractId
      ? context.contractorBalances.find(
          (item) => item.contractorContractId === input.contractorContractId,
        ) ?? null
      : null;
  const contractor =
    input.mode === "contractor_payment" && input.contractorContractId
      ? (() => {
          const contract = context.contracts.find(
            (item) => item.id === input.contractorContractId,
          );

          return contract
            ? context.contractors.find((item) => item.id === contract.contractorId) ?? null
            : null;
        })()
      : null;

  const cashDelta =
    input.mode === "income" ? amount : input.mode === "budget_line" ? 0 : -amount;
  const projectedCashAvailable = (summary?.cashAvailable ?? 0) + cashDelta;
  const projectedBudgetTotal =
    (summary?.totalBudget ?? 0) + (input.mode === "budget_line" ? amount : 0);
  const projectedBudgetRemaining =
    (summary?.budgetRemaining ?? 0) +
    (input.mode === "budget_line" ? amount : 0) -
    (input.mode === "expense" || input.mode === "contractor_payment" ? amount : 0);

  return {
    mode: input.mode,
    projectId: project.id,
    projectName: project.name,
    monthKey:
      input.mode === "budget_line" ? null : monthKeyFromDate(input.transactionDate),
    cashDelta,
    projectedCashAvailable,
    projectedBudgetTotal,
    projectedBudgetRemaining,
    categoryName: budgetRow?.categoryName ?? null,
    subcategoryName: budgetRow?.subcategoryName ?? null,
    projectedActual:
      input.mode === "expense" || input.mode === "contractor_payment"
        ? (budgetRow?.actual ?? 0) + amount
        : budgetRow?.actual ?? null,
    projectedRemaining:
      input.mode === "expense" || input.mode === "contractor_payment"
        ? (budgetRow?.remaining ?? matchedBudgetLine?.totalBudgeted ?? 0) - amount
        : budgetRow?.remaining ?? null,
    matchedBudgetLineDescription: matchedBudgetLine?.description ?? null,
    contractorName: contractor?.fullName ?? contractorBalance?.contractorName ?? null,
    contractorPendingBalanceBefore: contractorBalance?.pendingBalance ?? null,
    contractorPendingBalanceAfter:
      contractorBalance !== null ? contractorBalance.pendingBalance - amount : null,
  };
}
