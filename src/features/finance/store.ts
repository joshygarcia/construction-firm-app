import "server-only";

import {
  approveBudgetVersion,
  createBudgetLine,
  createBudgetSection,
  createBudgetVersion,
  createCategory,
  updateCategory,
  deleteCategory,
  updateSubcategory,
  deleteSubcategory,
  createContractor,
  createContractorContract,
  createContractorPayment,
  createExpense,
  createIncome,
  createInvoice,
  createProject,
  createSubcategory,
  deleteBudgetLine,
  deleteBudgetSection,
  deleteBudgetVersion,
  deleteContractor,
  deleteContractorContract,
  deleteInvoice,
  deleteProject,
  deriveBudgetAdvances,
  deriveBudgetVsActual,
  deriveBudgetVsActualMonthly,
  deriveCashflow,
  deriveContractorBalances,
  deriveMonthlyControl,
  deriveProjectSummary,
  softDeleteTransaction,
  updateBudgetLine,
  updateBudgetSection,
  updateBudgetVersion,
  updateContractor,
  updateContractorContract,
  updateInvoiceStatus,
  updateProject,
  updateTransaction,
  upsertSuggestionOption,
  type CreateBudgetLineInput,
  type CreateBudgetSectionInput,
  type CreateBudgetVersionInput,
  type CreateCategoryInput,
  type CreateContractorContractInput,
  type CreateContractorInput,
  type CreateContractorPaymentInput,
  type CreateExpenseInput,
  type CreateIncomeInput,
  type CreateInvoiceInput,
  type CreateProjectInput,
  type CreateSubcategoryInput,
  type UpdateCategoryInput,
  type UpdateSubcategoryInput,
  type InvoiceStatus,
  type SuggestionKind,
  type UpdateBudgetLineInput,
  type UpdateBudgetSectionInput,
  type UpdateBudgetVersionInput,
  type UpdateContractorContractInput,
  type UpdateContractorInput,
  type UpdateProjectInput,
  type UpdateTransactionInput,
  ensureProjectBudgetVersion,
  createCard,
  updateCard,
  deleteCard,
  createCardPayment,
  createLoan,
  updateLoan,
  deleteLoan,
  createLoanMovement,
  deriveCompanyFinance,
  deriveCardBalances,
  deriveLoanBalances,
  deriveAccountsReceivable,
  deriveAccountsPayable,
  deriveMonthlyMovements,
  type CreateCardInput,
  type UpdateCardInput,
  type CreateCardPaymentInput,
  type CreateLoanInput,
  type UpdateLoanInput,
  type CreateLoanMovementInput,
} from "@/features/finance/ledger";
import { createAppDataPersistence, type AppDataPersistence } from "@/features/finance/persistence";
import { getStoreFilePath } from "@/features/finance/paths";
import { getInitialSeed } from "@/features/finance/seed";

let persistenceInstance: AppDataPersistence | null = null;
const persistence: AppDataPersistence = {
  read(seed) {
    if (!persistenceInstance) {
      persistenceInstance = createAppDataPersistence(getStoreFilePath());
    }
    return persistenceInstance.read(seed);
  },
  write(data) {
    if (!persistenceInstance) {
      persistenceInstance = createAppDataPersistence(getStoreFilePath());
    }
    return persistenceInstance.write(data);
  },
};

function cloneData() {
  return structuredClone(persistence.read(() => structuredClone(getInitialSeed())));
}

function normalizeLookupValue(value: string) {
  return value.trim().toLocaleLowerCase();
}

export function getAppData() {
  return cloneData();
}

export function getProjectsWithSummary() {
  const data = cloneData();

  return data.projects.map((project) => ({
    ...project,
    summary: deriveProjectSummary(data, project.id),
  }));
}

export function getProjectOverview(projectId: string) {
  const data = cloneData();
  const project = data.projects.find((item) => item.id === projectId);

  if (!project) {
    return null;
  }

  const budgetVersions = data.budgetVersions.filter(
    (item) => item.projectId === projectId,
  );
  const activeBudgetVersion =
    budgetVersions.find((item) => item.status === "approved") ?? budgetVersions[0] ?? null;

  const versionIds = new Set(budgetVersions.map((v) => v.id));

  return {
    project,
    summary: deriveProjectSummary(data, projectId),
    budgetVsActual: deriveBudgetVsActual(data, projectId),
    budgetVsActualMonthly: deriveBudgetVsActualMonthly(data, projectId),
    budgetAdvances: deriveBudgetAdvances(data, projectId),
    cashflow: deriveCashflow(data, projectId),
    monthlyControl: deriveMonthlyControl(data, projectId),
    contractorBalances: deriveContractorBalances(data, projectId),
    budgetSections: data.budgetSections.filter((s) => versionIds.has(s.budgetVersionId)),
    budgetLines: data.budgetLines.filter((item) => item.projectId === projectId),
    budgetVersions,
    activeBudgetVersion,
    transactions: data.transactions
      .filter((item) => item.projectId === projectId && item.deletedAt === null)
      .sort((left, right) => right.transactionDate.localeCompare(left.transactionDate)),
    contracts: data.contractorContracts.filter((item) => item.projectId === projectId),
    invoices: data.invoices.filter((item) => item.projectId === projectId),
  };
}

export function getReferenceData() {
  const data = cloneData();
  const projectSummaries = data.projects.map((project) =>
    deriveProjectSummary(data, project.id),
  );
  const budgetRows = data.projects.flatMap((project) =>
    deriveBudgetVsActual(data, project.id).map((row) => ({
      ...row,
      projectId: project.id,
    })),
  );
  const contractorBalances = deriveContractorBalances(data);

  return {
    organization: data.organization,
    currentUser: data.currentUser,
    categories: data.categories,
    subcategories: data.subcategories,
    projects: data.projects,
    budgetVersions: data.budgetVersions,
    budgetLines: data.budgetLines,
    contractors: data.contractors,
    contracts: data.contractorContracts,
    suggestionOptions: data.suggestionOptions,
    cards: data.cards,
    projectSummaries,
    budgetRows,
    contractorBalances,
  };
}

export function getDashboardSnapshot(projectId?: string) {
  const data = cloneData();
  const selectedProjectId = projectId ?? data.projects[0]?.id ?? null;

  if (!selectedProjectId) {
    return null;
  }

  const projectOverview = getProjectOverview(selectedProjectId);

  if (!projectOverview) {
    return null;
  }

  const categorySpend = projectOverview.budgetVsActual.map((row) => ({
    name: row.subcategoryName === "Sin subcategoría" ? row.categoryName : row.subcategoryName,
    actual: row.actual,
    budgeted: row.budgeted,
  }));

  return {
    selectedProjectId,
    projectOverview,
    categorySpend,
    projects: getProjectsWithSummary(),
  };
}

export function getTransactionsSnapshot(filters: {
  projectId?: string;
  month?: string;
  categoryId?: string;
  transactionType?: "expense" | "income" | "all";
}) {
  const data = cloneData();
  const selectedProjectId = filters.projectId ?? data.projects[0]?.id ?? null;

  if (!selectedProjectId) {
    return null;
  }

  const transactions = data.transactions
    .filter((item) => item.projectId === selectedProjectId && item.deletedAt === null)
    .filter((item) => (filters.month ? item.transactionDate.startsWith(filters.month) : true))
    .filter((item) => (filters.categoryId ? item.categoryId === filters.categoryId : true))
    .filter((item) =>
      filters.transactionType && filters.transactionType !== "all"
        ? item.transactionType === filters.transactionType
        : true,
    )
    .sort((left, right) => right.transactionDate.localeCompare(left.transactionDate));

  return {
    selectedProjectId,
    transactions,
    monthlyControl: deriveMonthlyControl(data, selectedProjectId, filters.month),
    reference: getReferenceData(),
  };
}

export function saveProject(input: CreateProjectInput) {
  const next = createProject(cloneData(), input);
  persistence.write(next);

  return next.projects.at(-1) ?? null;
}

export function saveCategory(input: CreateCategoryInput) {
  const next = createCategory(cloneData(), input);
  persistence.write(next);

  return (
    next.categories.find(
      (item) => normalizeLookupValue(item.name) === normalizeLookupValue(input.name),
    ) ?? null
  );
}

export function editCategory(input: UpdateCategoryInput) {
  const next = updateCategory(cloneData(), input);
  persistence.write(next);
  return next.categories.find((item) => item.id === input.id) ?? null;
}

export function removeCategory(categoryId: string) {
  const next = deleteCategory(cloneData(), categoryId);
  persistence.write(next);
  return structuredClone(next);
}

export function editSubcategory(input: UpdateSubcategoryInput) {
  const next = updateSubcategory(cloneData(), input);
  persistence.write(next);
  return next.subcategories.find((item) => item.id === input.id) ?? null;
}

export function removeSubcategory(subcategoryId: string) {
  const next = deleteSubcategory(cloneData(), subcategoryId);
  persistence.write(next);
  return structuredClone(next);
}

export function saveSubcategory(input: CreateSubcategoryInput) {
  const next = createSubcategory(cloneData(), input);
  persistence.write(next);

  return (
    next.subcategories.find(
      (item) =>
        item.categoryId === input.categoryId &&
        normalizeLookupValue(item.name) === normalizeLookupValue(input.name),
    ) ?? null
  );
}

export function saveSuggestionOption(kind: SuggestionKind, value: string) {
  const next = upsertSuggestionOption(cloneData(), { kind, value });
  persistence.write(next);

  return (
    next.suggestionOptions.find(
      (item) =>
        item.kind === kind &&
        item.normalizedValue === normalizeLookupValue(value),
    ) ?? null
  );
}

export function saveExpense(input: CreateExpenseInput) {
  const next = createExpense(cloneData(), input);
  persistence.write(next);
  return structuredClone(next);
}

export function saveIncome(input: CreateIncomeInput) {
  const next = createIncome(cloneData(), input);
  persistence.write(next);
  return structuredClone(next);
}

export function ensureProjectBudget(projectId: string) {
  const data = cloneData();
  const before = data.budgetVersions.length;
  const version = ensureProjectBudgetVersion(data, projectId);
  if (data.budgetVersions.length !== before) {
    persistence.write(data);
  }
  return version.id;
}

export function saveBudgetLine(input: CreateBudgetLineInput) {
  const data = cloneData();
  // Flujo simple: asegurar el presupuesto del proyecto y usar su versión.
  const version = ensureProjectBudgetVersion(data, input.projectId);
  const next = createBudgetLine(data, {
    ...input,
    budgetVersionId: input.budgetVersionId || version.id,
  });
  persistence.write(next);
  return structuredClone(next);
}

export function saveContractorPayment(input: CreateContractorPaymentInput) {
  const next = createContractorPayment(cloneData(), input);
  persistence.write(next);
  return structuredClone(next);
}

export function lockBudgetVersion(budgetVersionId: string) {
  const next = approveBudgetVersion(cloneData(), budgetVersionId);
  persistence.write(next);
  return structuredClone(next);
}

export function editProject(input: UpdateProjectInput) {
  const next = updateProject(cloneData(), input);
  persistence.write(next);
  return next.projects.find((item) => item.id === input.id) ?? null;
}

export function removeProject(projectId: string) {
  const next = deleteProject(cloneData(), projectId);
  persistence.write(next);
  return structuredClone(next);
}

export function editTransaction(input: UpdateTransactionInput) {
  const next = updateTransaction(cloneData(), input);
  persistence.write(next);
  return structuredClone(next);
}

export function removeTransaction(transactionId: string) {
  const next = softDeleteTransaction(cloneData(), transactionId);
  persistence.write(next);
  return structuredClone(next);
}

export function editBudgetLine(input: UpdateBudgetLineInput) {
  const next = updateBudgetLine(cloneData(), input);
  persistence.write(next);
  return structuredClone(next);
}

export function removeBudgetLine(budgetLineId: string) {
  const next = deleteBudgetLine(cloneData(), budgetLineId);
  persistence.write(next);
  return structuredClone(next);
}

export function saveBudgetSection(input: CreateBudgetSectionInput) {
  const next = createBudgetSection(cloneData(), input);
  persistence.write(next);
  return next.budgetSections.at(-1) ?? null;
}

export function removeBudgetSection(sectionId: string) {
  const next = deleteBudgetSection(cloneData(), sectionId);
  persistence.write(next);
  return structuredClone(next);
}

export function saveInvoice(input: CreateInvoiceInput) {
  const next = createInvoice(cloneData(), input);
  persistence.write(next);
  return next.invoices.at(-1) ?? null;
}

export function changeInvoiceStatus(invoiceId: string, status: InvoiceStatus) {
  const next = updateInvoiceStatus(cloneData(), invoiceId, status);
  persistence.write(next);
  return next.invoices.find((i) => i.id === invoiceId) ?? null;
}

export function removeInvoice(invoiceId: string) {
  const next = deleteInvoice(cloneData(), invoiceId);
  persistence.write(next);
  return structuredClone(next);
}

export function updateTransactionReceipt(transactionId: string, receiptPath: string | null) {
  const data = cloneData();
  const txn = data.transactions.find((t) => t.id === transactionId && t.deletedAt === null);
  if (!txn) throw new Error("Movimiento no encontrado.");
  txn.receiptPath = receiptPath;
  persistence.write(data);
  return txn;
}

// ---------- Contractor ----------

export function saveContractor(input: CreateContractorInput) {
  const next = createContractor(cloneData(), input);
  persistence.write(next);
  return next.contractors.at(-1) ?? null;
}

export function editContractor(input: UpdateContractorInput) {
  const next = updateContractor(cloneData(), input);
  persistence.write(next);
  return next.contractors.find((c) => c.id === input.id) ?? null;
}

export function removeContractor(contractorId: string) {
  const next = deleteContractor(cloneData(), contractorId);
  persistence.write(next);
  return structuredClone(next);
}

// ---------- ContractorContract ----------

export function saveContractorContract(input: CreateContractorContractInput) {
  const next = createContractorContract(cloneData(), input);
  persistence.write(next);
  return next.contractorContracts.at(-1) ?? null;
}

export function editContractorContract(input: UpdateContractorContractInput) {
  const next = updateContractorContract(cloneData(), input);
  persistence.write(next);
  return next.contractorContracts.find((c) => c.id === input.id) ?? null;
}

export function removeContractorContract(contractId: string) {
  const next = deleteContractorContract(cloneData(), contractId);
  persistence.write(next);
  return structuredClone(next);
}

// ---------- BudgetVersion ----------

export function saveBudgetVersion(input: CreateBudgetVersionInput) {
  const next = createBudgetVersion(cloneData(), input);
  persistence.write(next);
  return next.budgetVersions.at(-1) ?? null;
}

export function editBudgetVersion(input: UpdateBudgetVersionInput) {
  const next = updateBudgetVersion(cloneData(), input);
  persistence.write(next);
  return next.budgetVersions.find((v) => v.id === input.id) ?? null;
}

export function removeBudgetVersion(budgetVersionId: string) {
  const next = deleteBudgetVersion(cloneData(), budgetVersionId);
  persistence.write(next);
  return structuredClone(next);
}

// ---------- BudgetSection UPDATE ----------

export function editBudgetSection(input: UpdateBudgetSectionInput) {
  const next = updateBudgetSection(cloneData(), input);
  persistence.write(next);
  return next.budgetSections.find((s) => s.id === input.id) ?? null;
}

// ---------- Tarjetas (empresa) ----------

export function saveCard(input: CreateCardInput) {
  const next = createCard(cloneData(), input);
  persistence.write(next);
  return next.cards.at(-1) ?? null;
}

export function editCard(input: UpdateCardInput) {
  const next = updateCard(cloneData(), input);
  persistence.write(next);
  return next.cards.find((c) => c.id === input.id) ?? null;
}

export function removeCard(cardId: string) {
  const next = deleteCard(cloneData(), cardId);
  persistence.write(next);
  return structuredClone(next);
}

export function saveCardPayment(input: CreateCardPaymentInput) {
  const next = createCardPayment(cloneData(), input);
  persistence.write(next);
  return next.cardPayments.at(-1) ?? null;
}

// ---------- Préstamos (empresa) ----------

export function saveLoan(input: CreateLoanInput) {
  const next = createLoan(cloneData(), input);
  persistence.write(next);
  return next.loans.at(-1) ?? null;
}

export function editLoan(input: UpdateLoanInput) {
  const next = updateLoan(cloneData(), input);
  persistence.write(next);
  return next.loans.find((l) => l.id === input.id) ?? null;
}

export function removeLoan(loanId: string) {
  const next = deleteLoan(cloneData(), loanId);
  persistence.write(next);
  return structuredClone(next);
}

export function saveLoanMovement(input: CreateLoanMovementInput) {
  const next = createLoanMovement(cloneData(), input);
  persistence.write(next);
  return next.loanMovements.at(-1) ?? null;
}

// ---------- Finanzas (empresa) ----------

export function getCompanyFinanceSnapshot() {
  const data = cloneData();
  return {
    summary: deriveCompanyFinance(data),
    cards: deriveCardBalances(data),
    loans: deriveLoanBalances(data),
    receivable: deriveAccountsReceivable(data),
    payable: deriveAccountsPayable(data),
    monthlyMovements: deriveMonthlyMovements(data),
    projects: data.projects,
  };
}
