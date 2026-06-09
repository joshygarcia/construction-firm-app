export type UserRole = "admin" | "member";

export type Organization = {
  id: string;
  name: string;
};

export type CurrentUser = {
  id: string;
  name: string;
  role: UserRole;
};

export type Category = {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
};

export type Subcategory = {
  id: string;
  categoryId: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
};

export type SuggestionKind =
  | "counterparty"
  | "payment_method"
  | "phase"
  | "area";

export type SuggestionOption = {
  id: string;
  kind: SuggestionKind;
  value: string;
  normalizedValue: string;
  createdAt: string;
};

export type ProjectStatus = "draft" | "active" | "paused" | "completed";

export type Project = {
  id: string;
  name: string;
  clientName: string;
  location: string;
  status: ProjectStatus;
  startDate: string;
  endDate: string | null;
  notes: string;
};

export type BudgetVersionStatus = "draft" | "approved" | "archived";

export type BudgetVersion = {
  id: string;
  projectId: string;
  versionName: string;
  status: BudgetVersionStatus;
  isLocked: boolean;
  approvedAt: string | null;
};

export type CostType = "direct" | "indirect";

export type BudgetSection = {
  id: string;
  budgetVersionId: string;
  code: string;
  name: string;
  costType: CostType;
  sortOrder: number;
};

export type BudgetLine = {
  id: string;
  budgetVersionId: string;
  projectId: string;
  sectionId: string | null;
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
  sortOrder: number;
  isManualTotal: boolean;
};

export type TransactionType = "expense" | "income";

export type Transaction = {
  id: string;
  projectId: string;
  budgetLineId: string | null;
  categoryId: string | null;
  subcategoryId: string | null;
  transactionType: TransactionType;
  transactionDate: string;
  amount: number;
  detail: string;
  payeeOrSource: string;
  paymentMethod: string;
  /** Si el gasto se pagó con tarjeta, id de la tarjeta. No reduce la caja. */
  cardId: string | null;
  externalReference: string;
  contractorContractId: string | null;
  receiptPath: string | null;
  createdBy: string;
  deletedAt: string | null;
};

export type Contractor = {
  id: string;
  fullName: string;
  trade: string;
  phone: string;
  email: string;
  notes: string;
  isActive: boolean;
};

export type ContractorContractStatus =
  | "draft"
  | "active"
  | "completed"
  | "cancelled";

export type ContractorContract = {
  id: string;
  projectId: string;
  contractorId: string;
  categoryId: string | null;
  subcategoryId: string | null;
  scopeDescription: string;
  agreedTotal: number;
  status: ContractorContractStatus;
  startDate: string | null;
  endDate: string | null;
  notes: string;
};

export type ContractorPayment = {
  id: string;
  contractorContractId: string;
  transactionId: string;
  paymentDate: string;
  amount: number;
  notes: string;
};

export type InvoiceStatus = "draft" | "sent" | "paid" | "cancelled";

export type InvoiceLineItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

export type Invoice = {
  id: string;
  projectId: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string | null;
  recipientName: string;
  recipientDetail: string;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  notes: string;
  linkedTransactionIds: string[];
  createdAt: string;
};

// ---------- Tarjetas y préstamos (nivel empresa) ----------

/** Tarjeta de crédito de la empresa. Su saldo (cuenta por pagar) se deriva. */
export type Card = {
  id: string;
  name: string;
  isActive: boolean;
};

/** Pago/abono a una tarjeta. Reduce el efectivo y el saldo de la tarjeta. */
export type CardPayment = {
  id: string;
  cardId: string;
  date: string;
  amount: number;
  paymentMethod: string;
  notes: string;
};

/** Préstamo que recibe la empresa. Su saldo por pagar se deriva de los movimientos. */
export type Loan = {
  id: string;
  name: string;
  lender: string;
  notes: string;
  isActive: boolean;
};

export type LoanMovementType = "disbursement" | "payment";

/**
 * Movimiento de un préstamo:
 * - "disbursement": dinero recibido (sube caja y sube saldo por pagar).
 * - "payment": abono al préstamo (baja caja y baja saldo por pagar).
 */
export type LoanMovement = {
  id: string;
  loanId: string;
  type: LoanMovementType;
  date: string;
  amount: number;
  notes: string;
};

/** Ítem de la tabla de precios: precio por unidad para una categoría/subcategoría/nombre. */
export type PriceItem = {
  id: string;
  categoryId: string | null;
  subcategoryId: string | null;
  name: string;
  normalizedName: string;
  unit: string | null;
  unitPrice: number;
};

export type AppData = {
  organization: Organization;
  currentUser: CurrentUser;
  categories: Category[];
  subcategories: Subcategory[];
  projects: Project[];
  budgetVersions: BudgetVersion[];
  budgetSections: BudgetSection[];
  budgetLines: BudgetLine[];
  contractors: Contractor[];
  contractorContracts: ContractorContract[];
  transactions: Transaction[];
  contractorPayments: ContractorPayment[];
  suggestionOptions: SuggestionOption[];
  invoices: Invoice[];
  cards: Card[];
  cardPayments: CardPayment[];
  loans: Loan[];
  loanMovements: LoanMovement[];
  priceItems: PriceItem[];
};

export type ProjectSummary = {
  projectId: string;
  totalBudget: number;
  totalIncome: number;
  totalExpenses: number;
  budgetRemaining: number;
  cashAvailable: number;
  pendingContractorBalances: number;
  budgetConsumedPercent: number;
};

export type BudgetVsActualRow = {
  key: string;
  categoryId: string | null;
  categoryName: string;
  subcategoryId: string | null;
  subcategoryName: string;
  budgeted: number;
  actual: number;
  remaining: number;
  variance: number;
  variancePercent: number;
  status: "on_track" | "over_budget";
};

export type CashflowRow = {
  monthKey: string;
  totalIncome: number;
  totalExpense: number;
  netCashflow: number;
};

export type ContractorBalanceRow = {
  contractorContractId: string;
  contractorId: string;
  contractorName: string;
  projectId: string;
  scopeDescription: string;
  agreedTotal: number;
  totalPaid: number;
  pendingBalance: number;
  lastPaymentDate: string | null;
};

export type MonthlyControlRow = {
  transactionId: string;
  monthKey: string;
  transactionDate: string;
  categoryName: string;
  subcategoryName: string;
  detail: string;
  vendor: string;
  amount: number;
  paymentMethod: string;
};

export type BudgetAdvanceRow = {
  budgetLineId: string;
  lineCode: string | null;
  description: string;
  sectionId: string | null;
  categoryId: string | null;
  subcategoryId: string | null;
  budgeted: number;
  totalPaid: number;
  remaining: number;
};

export type BudgetVsActualMonthlyRow = {
  key: string;
  categoryId: string | null;
  categoryName: string;
  subcategoryId: string | null;
  subcategoryName: string;
  budgeted: number;
  months: Record<string, number>;
  totalActual: number;
  difference: number;
};

export type CreateExpenseInput = {
  projectId: string;
  transactionDate: string;
  categoryId: string;
  subcategoryId?: string | null;
  budgetLineId?: string | null;
  amount: number;
  detail: string;
  payeeOrSource: string;
  paymentMethod: string;
  cardId?: string | null;
  externalReference?: string;
  receiptPath?: string | null;
};

export type CreateIncomeInput = {
  projectId: string;
  transactionDate: string;
  amount: number;
  detail: string;
  payeeOrSource: string;
  paymentMethod: string;
  externalReference?: string;
  receiptPath?: string | null;
};

export type CreateInvoiceInput = {
  projectId: string;
  recipientName: string;
  recipientDetail?: string;
  issueDate: string;
  dueDate?: string | null;
  lineItems: InvoiceLineItem[];
  taxRate?: number;
  notes?: string;
  linkedTransactionIds?: string[];
};

export type CreateContractorPaymentInput = {
  projectId: string;
  contractorContractId: string;
  transactionDate: string;
  amount: number;
  detail: string;
  paymentMethod: string;
  notes?: string;
};

export type CreateProjectInput = {
  name: string;
  clientName: string;
  location: string;
  status?: ProjectStatus;
  startDate: string;
  endDate?: string | null;
  notes?: string;
};

export type CreateCategoryInput = {
  name: string;
};

export type CreateSubcategoryInput = {
  categoryId: string;
  name: string;
};

export type UpdateCategoryInput = {
  id: string;
  name: string;
};

export type UpdateSubcategoryInput = {
  id: string;
  name: string;
};

export type UpsertSuggestionOptionInput = {
  kind: SuggestionKind;
  value: string;
};

export type UpdateProjectInput = {
  id: string;
  name: string;
  clientName: string;
  location: string;
  status?: ProjectStatus;
  startDate: string;
  endDate?: string | null;
  notes?: string;
};

export type UpdateTransactionInput = {
  id: string;
  transactionDate: string;
  categoryId?: string | null;
  subcategoryId?: string | null;
  amount: number;
  detail: string;
  payeeOrSource: string;
  paymentMethod: string;
  cardId?: string | null;
};

export type UpdateBudgetLineInput = {
  id: string;
  categoryId: string | null;
  subcategoryId: string | null;
  phase?: string | null;
  area?: string | null;
  lineCode?: string | null;
  description: string;
  quantity?: number | null;
  unit?: string | null;
  unitPrice?: number | null;
  totalBudgeted?: number | null;
  notes?: string;
  isManualTotal?: boolean;
};

export type CreateBudgetLineInput = {
  projectId: string;
  budgetVersionId: string;
  sectionId?: string | null;
  categoryId: string | null;
  subcategoryId: string | null;
  phase?: string | null;
  area?: string | null;
  lineCode?: string | null;
  description: string;
  quantity?: number | null;
  unit?: string | null;
  unitPrice?: number | null;
  totalBudgeted?: number | null;
  notes?: string;
  isManualTotal?: boolean;
};

export type CreateBudgetSectionInput = {
  budgetVersionId: string;
  code: string;
  name: string;
  costType: CostType;
};

export type UpdateBudgetSectionInput = {
  id: string;
  code: string;
  name: string;
  costType: CostType;
};

export type CreateContractorInput = {
  fullName: string;
  trade: string;
  phone?: string;
  email?: string;
  notes?: string;
};

export type UpdateContractorInput = {
  id: string;
  fullName: string;
  trade: string;
  phone?: string;
  email?: string;
  notes?: string;
  isActive?: boolean;
};

export type CreateContractorContractInput = {
  projectId: string;
  contractorId: string;
  categoryId?: string | null;
  subcategoryId?: string | null;
  scopeDescription: string;
  agreedTotal: number;
  status?: ContractorContractStatus;
  startDate?: string | null;
  endDate?: string | null;
  notes?: string;
};

export type UpdateContractorContractInput = {
  id: string;
  categoryId?: string | null;
  subcategoryId?: string | null;
  scopeDescription: string;
  agreedTotal: number;
  status: ContractorContractStatus;
  startDate?: string | null;
  endDate?: string | null;
  notes?: string;
};

export type CreateBudgetVersionInput = {
  projectId: string;
  versionName: string;
};

export type UpdateBudgetVersionInput = {
  id: string;
  versionName: string;
};

export type CreateCardInput = {
  name: string;
};

export type UpdateCardInput = {
  id: string;
  name: string;
  isActive?: boolean;
};

export type CreateCardPaymentInput = {
  cardId: string;
  date: string;
  amount: number;
  paymentMethod?: string;
  notes?: string;
};

export type CreateLoanInput = {
  name: string;
  lender?: string;
  notes?: string;
};

export type UpdateLoanInput = {
  id: string;
  name: string;
  lender?: string;
  notes?: string;
  isActive?: boolean;
};

export type CreateLoanMovementInput = {
  loanId: string;
  type: LoanMovementType;
  date: string;
  amount: number;
  notes?: string;
};

export type CardBalanceRow = {
  cardId: string;
  name: string;
  charged: number;
  paid: number;
  balance: number;
  isActive: boolean;
};

export type LoanBalanceRow = {
  loanId: string;
  name: string;
  lender: string;
  disbursed: number;
  paid: number;
  balance: number;
  isActive: boolean;
};

export type AccountsReceivableRow = {
  invoiceId: string;
  projectId: string;
  invoiceNumber: string;
  recipientName: string;
  issueDate: string;
  dueDate: string | null;
  total: number;
};

export type AccountsPayableSummary = {
  contractors: number;
  cards: number;
  loans: number;
  total: number;
};

export type CompanyFinanceSummary = {
  cash: number;
  cardsPayable: number;
  loansPayable: number;
  receivable: number;
};

export type MonthlyMovementRow = {
  monthKey: string;
  ventas: number;
  gastos: number;
  cobros: number;
  pagosTarjeta: number;
  abonosPrestamo: number;
  prestamosRecibidos: number;
};

export type CreatePriceItemInput = {
  categoryId: string | null;
  subcategoryId?: string | null;
  name: string;
  unit?: string | null;
  unitPrice: number;
};

export type UpdatePriceItemInput = {
  id: string;
  categoryId: string | null;
  subcategoryId?: string | null;
  name: string;
  unit?: string | null;
  unitPrice: number;
};

function createId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function normalizeLookupValue(value: string) {
  return value.trim().toLocaleLowerCase();
}

function requireNonEmptyValue(value: string, message: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    throw new Error(message);
  }

  return trimmed;
}

function requireProject(data: AppData, projectId: string) {
  const project = data.projects.find((item) => item.id === projectId);

  if (!project) {
    throw new Error("Proyecto no encontrado.");
  }

  return project;
}

function requireCategory(data: AppData, categoryId: string) {
  const category = data.categories.find((item) => item.id === categoryId);

  if (!category) {
    throw new Error("Categoría no encontrada.");
  }

  return category;
}

function findCategoryByName(data: AppData, name: string) {
  const normalizedName = normalizeLookupValue(name);

  return data.categories.find(
    (item) => normalizeLookupValue(item.name) === normalizedName,
  );
}

function findSubcategoryByName(
  data: AppData,
  categoryId: string,
  name: string,
) {
  const normalizedName = normalizeLookupValue(name);

  return data.subcategories.find(
    (item) =>
      item.categoryId === categoryId &&
      normalizeLookupValue(item.name) === normalizedName,
  );
}

function requireSubcategory(
  data: AppData,
  categoryId: string,
  subcategoryId: string | null | undefined,
) {
  if (!subcategoryId) {
    return null;
  }

  const subcategory = data.subcategories.find((item) => item.id === subcategoryId);

  if (!subcategory) {
    throw new Error("Subcategoría no encontrada.");
  }

  if (subcategory.categoryId !== categoryId) {
    throw new Error("La subcategoría no pertenece a la categoría seleccionada.");
  }

  return subcategory;
}

function findBudgetLineMatch(
  data: AppData,
  input: Pick<CreateExpenseInput, "projectId" | "categoryId" | "subcategoryId">,
) {
  return (
    data.budgetLines.find(
      (line) =>
        line.projectId === input.projectId &&
        line.categoryId === input.categoryId &&
        line.subcategoryId === (input.subcategoryId ?? null),
    ) ??
    data.budgetLines.find(
      (line) =>
        line.projectId === input.projectId &&
        line.categoryId === input.categoryId &&
        line.subcategoryId === null,
    ) ??
    null
  );
}

function monthKeyFromDate(transactionDate: string) {
  return transactionDate.slice(0, 7);
}

function activeTransactions(data: AppData, projectId: string) {
  return data.transactions.filter(
    (item) => item.projectId === projectId && item.deletedAt === null,
  );
}

function activeBudgetLines(data: AppData, projectId: string) {
  // Flujo simplificado: todas las partidas del proyecto cuentan de inmediato,
  // sin depender de aprobar/bloquear una versión.
  return data.budgetLines.filter((item) => item.projectId === projectId);
}

/**
 * Devuelve la versión de presupuesto del proyecto, creándola si no existe.
 * Mantiene `budgetVersions` como contenedor técnico oculto (uno por proyecto).
 * Muta `data` (se espera recibir un clon).
 */
export function ensureProjectBudgetVersion(
  data: AppData,
  projectId: string,
): BudgetVersion {
  const existing = data.budgetVersions.find(
    (item) => item.projectId === projectId,
  );
  if (existing) {
    return existing;
  }

  const version: BudgetVersion = {
    id: createId("budget-version"),
    projectId,
    versionName: "Presupuesto",
    status: "approved",
    isLocked: false,
    approvedAt: new Date().toISOString(),
  };
  data.budgetVersions.push(version);
  return version;
}

function nameMaps(data: AppData) {
  const categories = new Map(data.categories.map((item) => [item.id, item.name]));
  const subcategories = new Map(
    data.subcategories.map((item) => [item.id, item.name]),
  );

  return { categories, subcategories };
}

export function deriveBudgetVsActual(
  data: AppData,
  projectId: string,
): BudgetVsActualRow[] {
  requireProject(data, projectId);
  const { categories, subcategories } = nameMaps(data);
  const groups = new Map<
    string,
    {
      categoryId: string | null;
      subcategoryId: string | null;
      budgeted: number;
      actual: number;
    }
  >();

  for (const line of activeBudgetLines(data, projectId)) {
    const key = `${line.categoryId ?? "none"}:${line.subcategoryId ?? "none"}`;
    const current = groups.get(key) ?? {
      categoryId: line.categoryId,
      subcategoryId: line.subcategoryId,
      budgeted: 0,
      actual: 0,
    };
    current.budgeted += line.totalBudgeted;
    groups.set(key, current);
  }

  for (const transaction of activeTransactions(data, projectId)) {
    if (transaction.transactionType !== "expense") {
      continue;
    }

    const key = `${transaction.categoryId ?? "none"}:${transaction.subcategoryId ?? "none"}`;
    const current = groups.get(key) ?? {
      categoryId: transaction.categoryId,
      subcategoryId: transaction.subcategoryId,
      budgeted: 0,
      actual: 0,
    };
    current.actual += transaction.amount;
    groups.set(key, current);
  }

  return [...groups.entries()]
    .map<BudgetVsActualRow>(([key, value]) => {
      const remaining = value.budgeted - value.actual;
      const variance = value.actual - value.budgeted;
      const variancePercent =
        value.budgeted > 0 ? (variance / value.budgeted) * 100 : 0;

      return {
        key,
        categoryId: value.categoryId,
        categoryName: value.categoryId
          ? categories.get(value.categoryId) ?? "Sin categoría"
          : "Sin categoría",
        subcategoryId: value.subcategoryId,
        subcategoryName: value.subcategoryId
          ? subcategories.get(value.subcategoryId) ?? "Sin subcategoría"
          : "Sin subcategoría",
        budgeted: value.budgeted,
        actual: value.actual,
        remaining,
        variance,
        variancePercent,
        status: remaining >= 0 ? "on_track" : "over_budget",
      };
    })
    .sort((left, right) => left.categoryName.localeCompare(right.categoryName));
}

export function deriveCashflow(data: AppData, projectId: string): CashflowRow[] {
  requireProject(data, projectId);
  const groups = new Map<string, CashflowRow>();

  for (const transaction of activeTransactions(data, projectId)) {
    const monthKey = monthKeyFromDate(transaction.transactionDate);
    const current = groups.get(monthKey) ?? {
      monthKey,
      totalIncome: 0,
      totalExpense: 0,
      netCashflow: 0,
    };

    if (transaction.transactionType === "income") {
      current.totalIncome += transaction.amount;
      current.netCashflow += transaction.amount;
    } else {
      current.totalExpense += transaction.amount;
      current.netCashflow -= transaction.amount;
    }

    groups.set(monthKey, current);
  }

  return [...groups.values()].sort((left, right) =>
    left.monthKey.localeCompare(right.monthKey),
  );
}

export function deriveContractorBalances(
  data: AppData,
  projectId?: string,
): ContractorBalanceRow[] {
  const contractorMap = new Map(
    data.contractors.map((item) => [item.id, item.fullName]),
  );

  return data.contractorContracts
    .filter((item) => (projectId ? item.projectId === projectId : true))
    .map((contract) => {
      const payments = data.contractorPayments.filter(
        (item) => item.contractorContractId === contract.id,
      );
      const totalPaid = payments.reduce((sum, item) => sum + item.amount, 0);
      const lastPaymentDate = payments
        .map((item) => item.paymentDate)
        .sort()
        .at(-1) ?? null;

      return {
        contractorContractId: contract.id,
        contractorId: contract.contractorId,
        contractorName: contractorMap.get(contract.contractorId) ?? "Sin nombre",
        projectId: contract.projectId,
        scopeDescription: contract.scopeDescription,
        agreedTotal: contract.agreedTotal,
        totalPaid,
        pendingBalance: contract.agreedTotal - totalPaid,
        lastPaymentDate,
      };
    })
    .sort((left, right) => left.contractorName.localeCompare(right.contractorName));
}

export function deriveProjectSummary(data: AppData, projectId: string): ProjectSummary {
  requireProject(data, projectId);
  const budgetVsActual = deriveBudgetVsActual(data, projectId);
  const totals = activeTransactions(data, projectId).reduce(
    (accumulator, transaction) => {
      if (transaction.transactionType === "income") {
        accumulator.totalIncome += transaction.amount;
      } else {
        accumulator.totalExpenses += transaction.amount;
        // Los gastos en tarjeta no reducen la caja del proyecto (se financian).
        if (!transaction.cardId) {
          accumulator.cashExpenses += transaction.amount;
        }
      }

      return accumulator;
    },
    { totalIncome: 0, totalExpenses: 0, cashExpenses: 0 },
  );
  const totalBudget = budgetVsActual.reduce(
    (sum, row) => sum + row.budgeted,
    0,
  );
  const pendingContractorBalances = deriveContractorBalances(
    data,
    projectId,
  ).reduce((sum, row) => sum + row.pendingBalance, 0);

  return {
    projectId,
    totalBudget,
    totalIncome: totals.totalIncome,
    totalExpenses: totals.totalExpenses,
    budgetRemaining: totalBudget - totals.totalExpenses,
    cashAvailable: totals.totalIncome - totals.cashExpenses,
    pendingContractorBalances,
    budgetConsumedPercent:
      totalBudget > 0 ? (totals.totalExpenses / totalBudget) * 100 : 0,
  };
}

export function deriveMonthlyControl(
  data: AppData,
  projectId: string,
  monthKey?: string,
): MonthlyControlRow[] {
  requireProject(data, projectId);
  const { categories, subcategories } = nameMaps(data);

  return activeTransactions(data, projectId)
    .filter((item) => item.transactionType === "expense")
    .filter((item) => (monthKey ? monthKeyFromDate(item.transactionDate) === monthKey : true))
    .map((item) => ({
      transactionId: item.id,
      monthKey: monthKeyFromDate(item.transactionDate),
      transactionDate: item.transactionDate,
      categoryName: item.categoryId
        ? categories.get(item.categoryId) ?? "Sin categoría"
        : "Sin categoría",
      subcategoryName: item.subcategoryId
        ? subcategories.get(item.subcategoryId) ?? "Sin subcategoría"
        : "Sin subcategoría",
      detail: item.detail,
      vendor: item.payeeOrSource,
      amount: item.amount,
      paymentMethod: item.paymentMethod,
    }))
    .sort((left, right) => left.transactionDate.localeCompare(right.transactionDate));
}

export function deriveBudgetAdvances(
  data: AppData,
  projectId: string,
): BudgetAdvanceRow[] {
  requireProject(data, projectId);
  const lines = activeBudgetLines(data, projectId);
  const txns = activeTransactions(data, projectId).filter(
    (t) => t.transactionType === "expense" && t.budgetLineId !== null,
  );
  const paidByLine = new Map<string, number>();

  for (const txn of txns) {
    paidByLine.set(txn.budgetLineId!, (paidByLine.get(txn.budgetLineId!) ?? 0) + txn.amount);
  }

  return lines.map((line) => {
    const totalPaid = paidByLine.get(line.id) ?? 0;

    return {
      budgetLineId: line.id,
      lineCode: line.lineCode,
      description: line.description,
      sectionId: line.sectionId,
      categoryId: line.categoryId,
      subcategoryId: line.subcategoryId,
      budgeted: line.totalBudgeted,
      totalPaid,
      remaining: line.totalBudgeted - totalPaid,
    };
  });
}

export function deriveBudgetVsActualMonthly(
  data: AppData,
  projectId: string,
): BudgetVsActualMonthlyRow[] {
  requireProject(data, projectId);
  const { categories, subcategories } = nameMaps(data);
  const groups = new Map<
    string,
    {
      categoryId: string | null;
      subcategoryId: string | null;
      budgeted: number;
      months: Record<string, number>;
      totalActual: number;
    }
  >();

  for (const line of activeBudgetLines(data, projectId)) {
    const key = `${line.categoryId ?? "none"}:${line.subcategoryId ?? "none"}`;
    const current = groups.get(key) ?? {
      categoryId: line.categoryId,
      subcategoryId: line.subcategoryId,
      budgeted: 0,
      months: {},
      totalActual: 0,
    };
    current.budgeted += line.totalBudgeted;
    groups.set(key, current);
  }

  for (const txn of activeTransactions(data, projectId)) {
    if (txn.transactionType !== "expense") continue;
    const key = `${txn.categoryId ?? "none"}:${txn.subcategoryId ?? "none"}`;
    const current = groups.get(key) ?? {
      categoryId: txn.categoryId,
      subcategoryId: txn.subcategoryId,
      budgeted: 0,
      months: {},
      totalActual: 0,
    };
    const month = monthKeyFromDate(txn.transactionDate);
    current.months[month] = (current.months[month] ?? 0) + txn.amount;
    current.totalActual += txn.amount;
    groups.set(key, current);
  }

  return [...groups.entries()]
    .map<BudgetVsActualMonthlyRow>(([key, value]) => ({
      key,
      categoryId: value.categoryId,
      categoryName: value.categoryId
        ? categories.get(value.categoryId) ?? "Sin categoría"
        : "Sin categoría",
      subcategoryId: value.subcategoryId,
      subcategoryName: value.subcategoryId
        ? subcategories.get(value.subcategoryId) ?? "Sin subcategoría"
        : "Sin subcategoría",
      budgeted: value.budgeted,
      months: value.months,
      totalActual: value.totalActual,
      difference: value.budgeted - value.totalActual,
    }))
    .sort((a, b) => a.categoryName.localeCompare(b.categoryName));
}

export function createProject(data: AppData, input: CreateProjectInput): AppData {
  const next = structuredClone(data);
  const projectId = createId("project");

  next.projects.push({
    id: projectId,
    name: input.name.trim(),
    clientName: input.clientName.trim(),
    location: input.location.trim(),
    status: input.status ?? "active",
    startDate: input.startDate,
    endDate: input.endDate ?? null,
    notes: input.notes?.trim() ?? "",
  });

  // Autocrear el presupuesto del proyecto para que las partidas cuenten de inmediato.
  ensureProjectBudgetVersion(next, projectId);

  return next;
}

export function createCategory(data: AppData, input: CreateCategoryInput): AppData {
  const categoryName = requireNonEmptyValue(
    input.name,
    "La categoria es obligatoria.",
  );
  const next = structuredClone(data);

  if (findCategoryByName(next, categoryName)) {
    return next;
  }

  next.categories.push({
    id: createId("category"),
    name: categoryName,
    sortOrder:
      next.categories.reduce((max, item) => Math.max(max, item.sortOrder), 0) + 1,
    isActive: true,
  });

  return next;
}

export function createSubcategory(
  data: AppData,
  input: CreateSubcategoryInput,
): AppData {
  const subcategoryName = requireNonEmptyValue(
    input.name,
    "La subcategoria es obligatoria.",
  );
  requireCategory(data, input.categoryId);
  const next = structuredClone(data);

  if (findSubcategoryByName(next, input.categoryId, subcategoryName)) {
    return next;
  }

  next.subcategories.push({
    id: createId("subcategory"),
    categoryId: input.categoryId,
    name: subcategoryName,
    sortOrder:
      next.subcategories
        .filter((item) => item.categoryId === input.categoryId)
        .reduce((max, item) => Math.max(max, item.sortOrder), 0) + 1,
    isActive: true,
  });

  return next;
}

export function updateCategory(data: AppData, input: UpdateCategoryInput): AppData {
  const categoryName = requireNonEmptyValue(
    input.name,
    "La categoria es obligatoria.",
  );
  const next = structuredClone(data);
  const category = next.categories.find((item) => item.id === input.id);

  if (!category) {
    throw new Error("Categoría no encontrada.");
  }

  const existing = findCategoryByName(next, categoryName);
  if (existing && existing.id !== input.id) {
    throw new Error("Ya existe una categoría con ese nombre.");
  }

  category.name = categoryName;
  return next;
}

export function deleteCategory(data: AppData, categoryId: string): AppData {
  const next = structuredClone(data);
  const category = next.categories.find((item) => item.id === categoryId);

  if (!category) {
    throw new Error("Categoría no encontrada.");
  }

  const hasSubcategories = next.subcategories.some(
    (item) => item.categoryId === categoryId,
  );
  if (hasSubcategories) {
    throw new Error(
      "No puedes eliminar una categoría con subcategorías. Elimínalas primero.",
    );
  }

  const hasTransactions = next.transactions.some(
    (item) => item.categoryId === categoryId && item.deletedAt === null,
  );
  if (hasTransactions) {
    throw new Error("No puedes eliminar una categoría usada en movimientos.");
  }

  const hasBudgetLines = next.budgetLines.some(
    (item) => item.categoryId === categoryId,
  );
  if (hasBudgetLines) {
    throw new Error(
      "No puedes eliminar una categoría usada en líneas de presupuesto.",
    );
  }

  const hasContracts = next.contractorContracts.some(
    (item) => item.categoryId === categoryId,
  );
  if (hasContracts) {
    throw new Error("No puedes eliminar una categoría usada en contratos.");
  }

  next.categories = next.categories.filter((item) => item.id !== categoryId);
  return next;
}

export function updateSubcategory(
  data: AppData,
  input: UpdateSubcategoryInput,
): AppData {
  const subcategoryName = requireNonEmptyValue(
    input.name,
    "La subcategoria es obligatoria.",
  );
  const next = structuredClone(data);
  const subcategory = next.subcategories.find((item) => item.id === input.id);

  if (!subcategory) {
    throw new Error("Subcategoría no encontrada.");
  }

  const existing = findSubcategoryByName(next, subcategory.categoryId, subcategoryName);
  if (existing && existing.id !== input.id) {
    throw new Error("Ya existe una subcategoría con ese nombre.");
  }

  subcategory.name = subcategoryName;
  return next;
}

export function deleteSubcategory(data: AppData, subcategoryId: string): AppData {
  const next = structuredClone(data);
  const subcategory = next.subcategories.find((item) => item.id === subcategoryId);

  if (!subcategory) {
    throw new Error("Subcategoría no encontrada.");
  }

  const hasTransactions = next.transactions.some(
    (item) => item.subcategoryId === subcategoryId && item.deletedAt === null,
  );
  if (hasTransactions) {
    throw new Error("No puedes eliminar una subcategoría usada en movimientos.");
  }

  const hasBudgetLines = next.budgetLines.some(
    (item) => item.subcategoryId === subcategoryId,
  );
  if (hasBudgetLines) {
    throw new Error(
      "No puedes eliminar una subcategoría usada en líneas de presupuesto.",
    );
  }

  const hasContracts = next.contractorContracts.some(
    (item) => item.subcategoryId === subcategoryId,
  );
  if (hasContracts) {
    throw new Error("No puedes eliminar una subcategoría usada en contratos.");
  }

  next.subcategories = next.subcategories.filter((item) => item.id !== subcategoryId);
  return next;
}

export function createBudgetSection(
  data: AppData,
  input: CreateBudgetSectionInput,
): AppData {
  const next = structuredClone(data);
  const version = next.budgetVersions.find((v) => v.id === input.budgetVersionId);

  if (!version) {
    throw new Error("Versión de presupuesto no encontrada.");
  }

  if (version.isLocked) {
    throw new Error("La versión aprobada no puede editarse.");
  }

  next.budgetSections.push({
    id: createId("section"),
    budgetVersionId: input.budgetVersionId,
    code: input.code.trim(),
    name: input.name.trim(),
    costType: input.costType,
    sortOrder:
      next.budgetSections
        .filter((s) => s.budgetVersionId === input.budgetVersionId)
        .reduce((max, s) => Math.max(max, s.sortOrder), 0) + 1,
  });

  return next;
}

export function deleteBudgetSection(data: AppData, sectionId: string): AppData {
  const next = structuredClone(data);
  const section = next.budgetSections.find((s) => s.id === sectionId);

  if (!section) {
    throw new Error("Sección no encontrada.");
  }

  const version = next.budgetVersions.find((v) => v.id === section.budgetVersionId);
  if (version?.isLocked) {
    throw new Error("La versión aprobada no puede editarse.");
  }

  // Unlink budget lines from this section
  for (const line of next.budgetLines) {
    if (line.sectionId === sectionId) {
      line.sectionId = null;
    }
  }

  next.budgetSections = next.budgetSections.filter((s) => s.id !== sectionId);

  return next;
}

export function upsertSuggestionOption(
  data: AppData,
  input: UpsertSuggestionOptionInput,
): AppData {
  const optionValue = requireNonEmptyValue(
    input.value,
    "El valor de la sugerencia es obligatorio.",
  );
  const normalizedValue = normalizeLookupValue(optionValue);
  const next = structuredClone(data);
  const existing = next.suggestionOptions.find(
    (item) =>
      item.kind === input.kind && item.normalizedValue === normalizedValue,
  );

  if (existing) {
    return next;
  }

  next.suggestionOptions.push({
    id: createId("suggestion"),
    kind: input.kind,
    value: optionValue,
    normalizedValue,
    createdAt: new Date().toISOString(),
  });

  return next;
}

export function createExpense(data: AppData, input: CreateExpenseInput): AppData {
  requireProject(data, input.projectId);
  requireCategory(data, input.categoryId);
  requireSubcategory(data, input.categoryId, input.subcategoryId);

  if (input.amount <= 0) {
    throw new Error("El monto debe ser mayor a cero.");
  }

  const next = structuredClone(data);
  const matchedBudgetLine =
    (input.budgetLineId
      ? next.budgetLines.find((item) => item.id === input.budgetLineId)
      : null) ??
    findBudgetLineMatch(next, input);

  next.transactions.push({
    id: createId("txn"),
    projectId: input.projectId,
    budgetLineId: matchedBudgetLine?.id ?? null,
    categoryId: input.categoryId,
    subcategoryId: input.subcategoryId ?? null,
    transactionType: "expense",
    transactionDate: input.transactionDate,
    amount: input.amount,
    detail: input.detail.trim(),
    payeeOrSource: input.payeeOrSource.trim(),
    paymentMethod: input.paymentMethod.trim(),
    cardId: input.cardId ?? null,
    externalReference: input.externalReference?.trim() ?? "",
    contractorContractId: null,
    receiptPath: input.receiptPath ?? null,
    createdBy: next.currentUser.id,
    deletedAt: null,
  });

  return next;
}

export function createIncome(data: AppData, input: CreateIncomeInput): AppData {
  requireProject(data, input.projectId);

  if (input.amount <= 0) {
    throw new Error("El monto debe ser mayor a cero.");
  }

  const next = structuredClone(data);

  next.transactions.push({
    id: createId("txn"),
    projectId: input.projectId,
    budgetLineId: null,
    categoryId: null,
    subcategoryId: null,
    transactionType: "income",
    transactionDate: input.transactionDate,
    amount: input.amount,
    detail: input.detail.trim(),
    payeeOrSource: input.payeeOrSource.trim(),
    paymentMethod: input.paymentMethod.trim(),
    cardId: null,
    externalReference: input.externalReference?.trim() ?? "",
    contractorContractId: null,
    receiptPath: input.receiptPath ?? null,
    createdBy: next.currentUser.id,
    deletedAt: null,
  });

  return next;
}

export function createBudgetLine(data: AppData, input: CreateBudgetLineInput): AppData {
  requireProject(data, input.projectId);
  const version = data.budgetVersions.find((item) => item.id === input.budgetVersionId);

  if (!version || version.projectId !== input.projectId) {
    throw new Error("Versión de presupuesto no encontrada.");
  }

  if (input.categoryId) {
    requireCategory(data, input.categoryId);
    requireSubcategory(data, input.categoryId, input.subcategoryId);
  }

  const totalBudgeted =
    input.totalBudgeted ??
    (input.quantity && input.unitPrice ? input.quantity * input.unitPrice : 0);

  const next = structuredClone(data);

  next.budgetLines.push({
    id: createId("budget-line"),
    budgetVersionId: input.budgetVersionId,
    projectId: input.projectId,
    sectionId: input.sectionId ?? null,
    categoryId: input.categoryId,
    subcategoryId: input.subcategoryId,
    phase: input.phase ?? null,
    area: input.area ?? null,
    lineCode: input.lineCode ?? null,
    description: input.description.trim(),
    quantity: input.quantity ?? null,
    unit: input.unit ?? null,
    unitPrice: input.unitPrice ?? null,
    totalBudgeted,
    notes: input.notes?.trim() ?? "",
    sortOrder: next.budgetLines.length + 1,
    isManualTotal: input.isManualTotal ?? false,
  });

  return next;
}

export function approveBudgetVersion(data: AppData, budgetVersionId: string): AppData {
  const next = structuredClone(data);
  const version = next.budgetVersions.find((item) => item.id === budgetVersionId);

  if (!version) {
    throw new Error("Versión de presupuesto no encontrada.");
  }

  for (const candidate of next.budgetVersions) {
    if (candidate.projectId === version.projectId) {
      candidate.status = candidate.id === budgetVersionId ? "approved" : "archived";
      candidate.isLocked = candidate.id === budgetVersionId;
      candidate.approvedAt =
        candidate.id === budgetVersionId ? new Date().toISOString() : candidate.approvedAt;
    }
  }

  return next;
}

export function updateProject(data: AppData, input: UpdateProjectInput): AppData {
  const next = structuredClone(data);
  const project = next.projects.find((item) => item.id === input.id);

  if (!project) {
    throw new Error("Proyecto no encontrado.");
  }

  project.name = input.name.trim();
  project.clientName = input.clientName.trim();
  project.location = input.location.trim();
  project.status = input.status ?? project.status;
  project.startDate = input.startDate;
  project.endDate = input.endDate ?? null;
  project.notes = input.notes?.trim() ?? project.notes;

  return next;
}

export function deleteProject(data: AppData, projectId: string): AppData {
  const next = structuredClone(data);
  const index = next.projects.findIndex((item) => item.id === projectId);

  if (index === -1) {
    throw new Error("Proyecto no encontrado.");
  }

  const hasTransactions = next.transactions.some(
    (item) => item.projectId === projectId && item.deletedAt === null,
  );

  if (hasTransactions) {
    throw new Error("No se puede eliminar un proyecto con movimientos activos.");
  }

  next.projects.splice(index, 1);
  const removedVersionIds = new Set(
    next.budgetVersions.filter((item) => item.projectId === projectId).map((item) => item.id),
  );
  next.budgetVersions = next.budgetVersions.filter((item) => item.projectId !== projectId);
  next.budgetSections = next.budgetSections.filter((item) => !removedVersionIds.has(item.budgetVersionId));
  next.budgetLines = next.budgetLines.filter((item) => item.projectId !== projectId);
  next.contractorContracts = next.contractorContracts.filter((item) => item.projectId !== projectId);
  next.invoices = next.invoices.filter((item) => item.projectId !== projectId);

  return next;
}

export function updateTransaction(data: AppData, input: UpdateTransactionInput): AppData {
  const next = structuredClone(data);
  const transaction = next.transactions.find((item) => item.id === input.id && item.deletedAt === null);

  if (!transaction) {
    throw new Error("Movimiento no encontrado.");
  }

  if (input.amount <= 0) {
    throw new Error("El monto debe ser mayor a cero.");
  }

  if (input.categoryId && transaction.transactionType === "expense") {
    requireCategory(next, input.categoryId);
    requireSubcategory(next, input.categoryId, input.subcategoryId);
  }

  transaction.transactionDate = input.transactionDate;
  transaction.amount = input.amount;
  transaction.detail = input.detail.trim();
  transaction.payeeOrSource = input.payeeOrSource.trim();
  transaction.paymentMethod = input.paymentMethod.trim();
  if (input.cardId !== undefined) {
    transaction.cardId = input.cardId;
  }

  if (transaction.transactionType === "expense" && input.categoryId) {
    transaction.categoryId = input.categoryId;
    transaction.subcategoryId = input.subcategoryId ?? null;
    const matchedBudgetLine = findBudgetLineMatch(next, {
      projectId: transaction.projectId,
      categoryId: input.categoryId,
      subcategoryId: input.subcategoryId ?? undefined,
    });
    transaction.budgetLineId = matchedBudgetLine?.id ?? null;
  }

  return next;
}

export function softDeleteTransaction(data: AppData, transactionId: string): AppData {
  const next = structuredClone(data);
  const transaction = next.transactions.find((item) => item.id === transactionId && item.deletedAt === null);

  if (!transaction) {
    throw new Error("Movimiento no encontrado.");
  }

  transaction.deletedAt = new Date().toISOString();

  // Also soft-delete linked contractor payment
  const linkedPayment = next.contractorPayments.find((item) => item.transactionId === transactionId);
  if (linkedPayment) {
    next.contractorPayments = next.contractorPayments.filter((item) => item.transactionId !== transactionId);
  }

  return next;
}

export function updateBudgetLine(data: AppData, input: UpdateBudgetLineInput): AppData {
  const next = structuredClone(data);
  const line = next.budgetLines.find((item) => item.id === input.id);

  if (!line) {
    throw new Error("Línea presupuestaria no encontrada.");
  }

  if (input.categoryId) {
    requireCategory(next, input.categoryId);
    requireSubcategory(next, input.categoryId, input.subcategoryId);
  }

  line.categoryId = input.categoryId;
  line.subcategoryId = input.subcategoryId;
  // Preservar campos no enviados (ediciones parciales desde el grid).
  if (input.phase !== undefined) line.phase = input.phase;
  if (input.area !== undefined) line.area = input.area;
  if (input.lineCode !== undefined) line.lineCode = input.lineCode;
  if (input.notes !== undefined) line.notes = input.notes.trim();
  line.description = input.description.trim();
  line.quantity = input.quantity ?? null;
  line.unit = input.unit ?? null;
  line.unitPrice = input.unitPrice ?? null;
  line.isManualTotal = input.isManualTotal ?? false;
  line.totalBudgeted =
    input.totalBudgeted ??
    (input.quantity && input.unitPrice ? input.quantity * input.unitPrice : 0);

  return next;
}

export function deleteBudgetLine(data: AppData, budgetLineId: string): AppData {
  const next = structuredClone(data);
  const line = next.budgetLines.find((item) => item.id === budgetLineId);

  if (!line) {
    throw new Error("Línea presupuestaria no encontrada.");
  }

  next.budgetLines = next.budgetLines.filter((item) => item.id !== budgetLineId);

  // Unlink any transactions that referenced this budget line
  for (const txn of next.transactions) {
    if (txn.budgetLineId === budgetLineId) {
      txn.budgetLineId = null;
    }
  }

  return next;
}

/** Elimina varias partidas por id (y desvincula las transacciones). */
export function deleteBudgetLines(data: AppData, ids: string[]): AppData {
  const next = structuredClone(data);
  const set = new Set(ids);
  next.budgetLines = next.budgetLines.filter((l) => !set.has(l.id));
  for (const txn of next.transactions) {
    if (txn.budgetLineId && set.has(txn.budgetLineId)) {
      txn.budgetLineId = null;
    }
  }
  return next;
}

const NIVEL_NONE_KEY = " __nonivel__";
function nivelKeyOf(line: BudgetLine): string {
  return line.area && line.area.trim() ? line.area.trim() : NIVEL_NONE_KEY;
}

/**
 * Orden de visualización de las partidas: nivel → categoría → subcategoría → sortOrder,
 * donde cada grupo se ordena por el MENOR sortOrder de sus partidas. La app y el PDF
 * usan esta misma función para mostrar/imprimir en idéntico orden.
 */
export function orderBudgetLinesForDisplay(lines: BudgetLine[]): BudgetLine[] {
  const minBy = (keyFn: (l: BudgetLine) => string) => {
    const m = new Map<string, number>();
    for (const l of lines) {
      const k = keyFn(l);
      m.set(k, Math.min(m.get(k) ?? Number.POSITIVE_INFINITY, l.sortOrder));
    }
    return m;
  };
  const nKey = (l: BudgetLine) => nivelKeyOf(l);
  const cKey = (l: BudgetLine) => `${nivelKeyOf(l)}|${l.categoryId ?? ""}`;
  const sKey = (l: BudgetLine) => `${cKey(l)}|${l.subcategoryId ?? ""}`;
  const nMin = minBy(nKey);
  const cMin = minBy(cKey);
  const sMin = minBy(sKey);
  return [...lines].sort((a, b) => {
    const na = nMin.get(nKey(a)) ?? 0;
    const nb = nMin.get(nKey(b)) ?? 0;
    if (na !== nb) return na - nb;
    const ca = cMin.get(cKey(a)) ?? 0;
    const cb = cMin.get(cKey(b)) ?? 0;
    if (ca !== cb) return ca - cb;
    const sa = sMin.get(sKey(a)) ?? 0;
    const sb = sMin.get(sKey(b)) ?? 0;
    if (sa !== sb) return sa - sb;
    return a.sortOrder - b.sortOrder;
  });
}

export type BudgetMoveLevel = "nivel" | "category" | "subcategory" | "line";
export type BudgetMoveTarget = {
  area?: string | null;
  categoryId?: string | null;
  subcategoryId?: string | null;
  lineId?: string | null;
};

/**
 * Mueve un grupo (nivel/categoría/subcategoría) o una partida hacia arriba/abajo
 * entre sus hermanos, renumerando el sortOrder de todas las partidas del proyecto.
 */
export function moveBudgetItem(
  data: AppData,
  projectId: string,
  level: BudgetMoveLevel,
  target: BudgetMoveTarget,
  direction: "up" | "down",
): AppData {
  const next = structuredClone(data);
  const projectLines = next.budgetLines.filter((l) => l.projectId === projectId);
  const ordered = orderBudgetLinesForDisplay(projectLines);
  if (ordered.length === 0) return next;

  const nk = (l: BudgetLine) => nivelKeyOf(l);
  const ck = (l: BudgetLine) => `${nk(l)}|${l.categoryId ?? ""}`;
  const sk = (l: BudgetLine) => `${ck(l)}|${l.subcategoryId ?? ""}`;

  const keyOf = (l: BudgetLine) =>
    level === "nivel" ? nk(l) : level === "category" ? ck(l) : level === "subcategory" ? sk(l) : l.id;
  const parentOf = (l: BudgetLine) =>
    level === "nivel" ? "" : level === "category" ? nk(l) : level === "subcategory" ? ck(l) : sk(l);

  const targetAreaKey = target.area && target.area.trim() ? target.area.trim() : NIVEL_NONE_KEY;
  let targetKey: string;
  if (level === "nivel") targetKey = targetAreaKey;
  else if (level === "category") targetKey = `${targetAreaKey}|${target.categoryId ?? ""}`;
  else if (level === "subcategory")
    targetKey = `${targetAreaKey}|${target.categoryId ?? ""}|${target.subcategoryId ?? ""}`;
  else targetKey = target.lineId ?? "";

  const targetLines = ordered.filter((l) => keyOf(l) === targetKey);
  if (targetLines.length === 0) return next;
  const parent = parentOf(targetLines[0]);

  const siblingKeys: string[] = [];
  for (const l of ordered) {
    if (parentOf(l) !== parent) continue;
    const k = keyOf(l);
    if (!siblingKeys.includes(k)) siblingKeys.push(k);
  }
  const idx = siblingKeys.indexOf(targetKey);
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (idx < 0 || swapIdx < 0 || swapIdx >= siblingKeys.length) return next;
  [siblingKeys[idx], siblingKeys[swapIdx]] = [siblingKeys[swapIdx], siblingKeys[idx]];

  const linesByKey = new Map<string, BudgetLine[]>();
  for (const l of ordered) {
    if (parentOf(l) !== parent) continue;
    const k = keyOf(l);
    if (!linesByKey.has(k)) linesByKey.set(k, []);
    linesByKey.get(k)!.push(l);
  }
  const reorderedParent: BudgetLine[] = [];
  for (const k of siblingKeys) reorderedParent.push(...(linesByKey.get(k) ?? []));

  const parentIds = new Set(reorderedParent.map((l) => l.id));
  const finalFlat: BudgetLine[] = [];
  let inserted = false;
  for (const l of ordered) {
    if (parentIds.has(l.id)) {
      if (!inserted) {
        finalFlat.push(...reorderedParent);
        inserted = true;
      }
    } else {
      finalFlat.push(l);
    }
  }

  finalFlat.forEach((l, i) => {
    const line = next.budgetLines.find((b) => b.id === l.id);
    if (line) line.sortOrder = i + 1;
  });

  return next;
}

/**
 * Reordena TODAS las partidas del proyecto según el orden plano de ids dado
 * (ya contiguo por nivel → categoría → subcategoría → partida). Renumera el
 * sortOrder por posición. Lo usa el drag & drop, que entrega el orden completo
 * resultante. Las partidas que no aparezcan en la lista quedan al final,
 * conservando su orden relativo.
 */
export function reorderBudgetLines(
  data: AppData,
  projectId: string,
  orderedIds: string[],
): AppData {
  const next = structuredClone(data);
  const indexById = new Map(orderedIds.map((id, i) => [id, i]));
  let tail = orderedIds.length;
  const ranked = next.budgetLines
    .filter((l) => l.projectId === projectId)
    .map((line) => {
      const idx = indexById.get(line.id);
      return { line, order: idx === undefined ? tail++ : idx };
    });
  ranked.sort((a, b) => a.order - b.order);
  ranked.forEach((entry, i) => {
    entry.line.sortOrder = i + 1;
  });
  return next;
}

/** Elimina TODO el presupuesto de un proyecto. */
export function clearProjectBudget(data: AppData, projectId: string): AppData {
  const next = structuredClone(data);
  const removed = new Set(
    next.budgetLines.filter((l) => l.projectId === projectId).map((l) => l.id),
  );
  next.budgetLines = next.budgetLines.filter((l) => l.projectId !== projectId);
  for (const txn of next.transactions) {
    if (txn.budgetLineId && removed.has(txn.budgetLineId)) {
      txn.budgetLineId = null;
    }
  }
  return next;
}

export function createContractorPayment(
  data: AppData,
  input: CreateContractorPaymentInput,
): AppData {
  requireProject(data, input.projectId);

  if (input.amount <= 0) {
    throw new Error("El monto debe ser mayor a cero.");
  }

  const contract = data.contractorContracts.find(
    (item) => item.id === input.contractorContractId,
  );

  if (!contract || contract.projectId !== input.projectId) {
    throw new Error("Contrato de contratista no encontrado.");
  }

  const next = structuredClone(data);
  const budgetLineMatch = findBudgetLineMatch(next, {
    projectId: contract.projectId,
    categoryId: contract.categoryId ?? "",
    subcategoryId: contract.subcategoryId,
  });

  const transactionId = createId("txn");

  next.transactions.push({
    id: transactionId,
    projectId: input.projectId,
    budgetLineId: budgetLineMatch?.id ?? null,
    categoryId: contract.categoryId,
    subcategoryId: contract.subcategoryId,
    transactionType: "expense",
    transactionDate: input.transactionDate,
    amount: input.amount,
    detail: input.detail.trim(),
    payeeOrSource:
      next.contractors.find((item) => item.id === contract.contractorId)?.fullName ??
      "Contratista",
    paymentMethod: input.paymentMethod.trim(),
    cardId: null,
    externalReference: "",
    contractorContractId: contract.id,
    receiptPath: null,
    createdBy: next.currentUser.id,
    deletedAt: null,
  });

  next.contractorPayments.push({
    id: createId("contractor-payment"),
    contractorContractId: contract.id,
    transactionId,
    paymentDate: input.transactionDate,
    amount: input.amount,
    notes: input.notes?.trim() ?? "",
  });

  return next;
}

export function createInvoice(data: AppData, input: CreateInvoiceInput): AppData {
  requireProject(data, input.projectId);

  if (input.lineItems.length === 0) {
    throw new Error("La factura debe tener al menos una línea.");
  }

  const next = structuredClone(data);
  const invoiceCount = next.invoices.filter((i) => i.projectId === input.projectId).length;
  const subtotal = input.lineItems.reduce((s, li) => s + li.total, 0);
  const taxRate = input.taxRate ?? 0;
  const taxAmount = Math.round(subtotal * taxRate) / 100;

  next.invoices.push({
    id: createId("inv"),
    projectId: input.projectId,
    invoiceNumber: `FAC-${String(invoiceCount + 1).padStart(4, "0")}`,
    status: "draft",
    issueDate: input.issueDate,
    dueDate: input.dueDate ?? null,
    recipientName: input.recipientName.trim(),
    recipientDetail: input.recipientDetail?.trim() ?? "",
    lineItems: input.lineItems,
    subtotal,
    taxRate,
    taxAmount,
    total: subtotal + taxAmount,
    notes: input.notes?.trim() ?? "",
    linkedTransactionIds: input.linkedTransactionIds ?? [],
    createdAt: new Date().toISOString(),
  });

  return next;
}

export function updateInvoiceStatus(
  data: AppData,
  invoiceId: string,
  status: InvoiceStatus,
): AppData {
  const next = structuredClone(data);
  const invoice = next.invoices.find((i) => i.id === invoiceId);

  if (!invoice) {
    throw new Error("Factura no encontrada.");
  }

  invoice.status = status;
  return next;
}

export function deleteInvoice(data: AppData, invoiceId: string): AppData {
  const next = structuredClone(data);
  next.invoices = next.invoices.filter((i) => i.id !== invoiceId);
  return next;
}

// ---------- Contractor CRUD ----------

export function createContractor(data: AppData, input: CreateContractorInput): AppData {
  const fullName = requireNonEmptyValue(input.fullName, "El nombre del contratista es obligatorio.");
  const trade = requireNonEmptyValue(input.trade, "El oficio es obligatorio.");

  const next = structuredClone(data);
  next.contractors.push({
    id: createId("contractor"),
    fullName,
    trade,
    phone: input.phone?.trim() ?? "",
    email: input.email?.trim() ?? "",
    notes: input.notes?.trim() ?? "",
    isActive: true,
  });

  return next;
}

export function updateContractor(data: AppData, input: UpdateContractorInput): AppData {
  const next = structuredClone(data);
  const contractor = next.contractors.find((c) => c.id === input.id);

  if (!contractor) {
    throw new Error("Contratista no encontrado.");
  }

  contractor.fullName = requireNonEmptyValue(input.fullName, "El nombre del contratista es obligatorio.");
  contractor.trade = requireNonEmptyValue(input.trade, "El oficio es obligatorio.");
  contractor.phone = input.phone?.trim() ?? "";
  contractor.email = input.email?.trim() ?? "";
  contractor.notes = input.notes?.trim() ?? "";
  if (typeof input.isActive === "boolean") {
    contractor.isActive = input.isActive;
  }

  return next;
}

export function deleteContractor(data: AppData, contractorId: string): AppData {
  const next = structuredClone(data);
  const index = next.contractors.findIndex((c) => c.id === contractorId);

  if (index === -1) {
    throw new Error("Contratista no encontrado.");
  }

  const hasContracts = next.contractorContracts.some((c) => c.contractorId === contractorId);
  if (hasContracts) {
    throw new Error("No se puede eliminar un contratista con contratos asociados.");
  }

  next.contractors.splice(index, 1);
  return next;
}

// ---------- ContractorContract CRUD ----------

export function createContractorContract(
  data: AppData,
  input: CreateContractorContractInput,
): AppData {
  requireProject(data, input.projectId);

  const scopeDescription = requireNonEmptyValue(
    input.scopeDescription,
    "La descripción del alcance es obligatoria.",
  );

  if (input.agreedTotal <= 0) {
    throw new Error("El monto acordado debe ser mayor a cero.");
  }

  const next = structuredClone(data);
  const contractor = next.contractors.find((c) => c.id === input.contractorId);

  if (!contractor) {
    throw new Error("Contratista no encontrado.");
  }

  if (input.categoryId) {
    requireCategory(next, input.categoryId);
    if (input.subcategoryId) {
      requireSubcategory(next, input.categoryId, input.subcategoryId);
    }
  }

  next.contractorContracts.push({
    id: createId("contract"),
    projectId: input.projectId,
    contractorId: input.contractorId,
    categoryId: input.categoryId ?? null,
    subcategoryId: input.subcategoryId ?? null,
    scopeDescription,
    agreedTotal: input.agreedTotal,
    status: input.status ?? "active",
    startDate: input.startDate ?? null,
    endDate: input.endDate ?? null,
    notes: input.notes?.trim() ?? "",
  });

  return next;
}

export function updateContractorContract(
  data: AppData,
  input: UpdateContractorContractInput,
): AppData {
  const next = structuredClone(data);
  const contract = next.contractorContracts.find((c) => c.id === input.id);

  if (!contract) {
    throw new Error("Contrato no encontrado.");
  }

  if (input.agreedTotal <= 0) {
    throw new Error("El monto acordado debe ser mayor a cero.");
  }

  if (input.categoryId) {
    requireCategory(next, input.categoryId);
    if (input.subcategoryId) {
      requireSubcategory(next, input.categoryId, input.subcategoryId);
    }
  }

  contract.scopeDescription = requireNonEmptyValue(
    input.scopeDescription,
    "La descripción del alcance es obligatoria.",
  );
  contract.agreedTotal = input.agreedTotal;
  contract.status = input.status;
  contract.categoryId = input.categoryId ?? null;
  contract.subcategoryId = input.subcategoryId ?? null;
  contract.startDate = input.startDate ?? null;
  contract.endDate = input.endDate ?? null;
  contract.notes = input.notes?.trim() ?? "";

  return next;
}

export function deleteContractorContract(data: AppData, contractId: string): AppData {
  const next = structuredClone(data);
  const index = next.contractorContracts.findIndex((c) => c.id === contractId);

  if (index === -1) {
    throw new Error("Contrato no encontrado.");
  }

  const hasPayments = next.contractorPayments.some((p) => p.contractorContractId === contractId);
  if (hasPayments) {
    throw new Error("No se puede eliminar un contrato con pagos registrados.");
  }

  next.contractorContracts.splice(index, 1);
  return next;
}

// ---------- BudgetVersion CRUD ----------

export function createBudgetVersion(data: AppData, input: CreateBudgetVersionInput): AppData {
  requireProject(data, input.projectId);
  const versionName = requireNonEmptyValue(
    input.versionName,
    "El nombre de la versión es obligatorio.",
  );

  const next = structuredClone(data);
  next.budgetVersions.push({
    id: createId("budget-version"),
    projectId: input.projectId,
    versionName,
    status: "draft",
    isLocked: false,
    approvedAt: null,
  });

  return next;
}

export function updateBudgetVersion(data: AppData, input: UpdateBudgetVersionInput): AppData {
  const next = structuredClone(data);
  const version = next.budgetVersions.find((v) => v.id === input.id);

  if (!version) {
    throw new Error("Versión de presupuesto no encontrada.");
  }

  if (version.isLocked) {
    throw new Error("La versión aprobada no puede editarse.");
  }

  version.versionName = requireNonEmptyValue(
    input.versionName,
    "El nombre de la versión es obligatorio.",
  );

  return next;
}

export function deleteBudgetVersion(data: AppData, budgetVersionId: string): AppData {
  const next = structuredClone(data);
  const index = next.budgetVersions.findIndex((v) => v.id === budgetVersionId);

  if (index === -1) {
    throw new Error("Versión de presupuesto no encontrada.");
  }

  const version = next.budgetVersions[index];
  if (version.isLocked) {
    throw new Error("La versión aprobada no puede eliminarse.");
  }

  const hasTransactions = next.transactions.some(
    (t) =>
      t.deletedAt === null &&
      t.budgetLineId !== null &&
      next.budgetLines.some(
        (l) => l.id === t.budgetLineId && l.budgetVersionId === budgetVersionId,
      ),
  );

  if (hasTransactions) {
    throw new Error("No se puede eliminar una versión con movimientos vinculados.");
  }

  next.budgetVersions.splice(index, 1);
  next.budgetSections = next.budgetSections.filter((s) => s.budgetVersionId !== budgetVersionId);
  next.budgetLines = next.budgetLines.filter((l) => l.budgetVersionId !== budgetVersionId);

  return next;
}

// ---------- BudgetSection UPDATE ----------

export function updateBudgetSection(
  data: AppData,
  input: UpdateBudgetSectionInput,
): AppData {
  const next = structuredClone(data);
  const section = next.budgetSections.find((s) => s.id === input.id);

  if (!section) {
    throw new Error("Sección no encontrada.");
  }

  const version = next.budgetVersions.find((v) => v.id === section.budgetVersionId);
  if (version?.isLocked) {
    throw new Error("La versión aprobada no puede editarse.");
  }

  section.code = input.code.trim();
  section.name = requireNonEmptyValue(input.name, "El nombre de la sección es obligatorio.");
  section.costType = input.costType;

  return next;
}

// ---------- Tarjetas, préstamos y finanzas de empresa (derive) ----------

export function deriveCardBalances(data: AppData): CardBalanceRow[] {
  const chargedByCard = new Map<string, number>();
  for (const txn of data.transactions) {
    if (txn.deletedAt !== null) continue;
    if (txn.transactionType !== "expense") continue;
    if (!txn.cardId) continue;
    chargedByCard.set(txn.cardId, (chargedByCard.get(txn.cardId) ?? 0) + txn.amount);
  }

  const paidByCard = new Map<string, number>();
  for (const payment of data.cardPayments ?? []) {
    paidByCard.set(payment.cardId, (paidByCard.get(payment.cardId) ?? 0) + payment.amount);
  }

  return (data.cards ?? [])
    .map<CardBalanceRow>((card) => {
      const charged = chargedByCard.get(card.id) ?? 0;
      const paid = paidByCard.get(card.id) ?? 0;
      return {
        cardId: card.id,
        name: card.name,
        charged,
        paid,
        balance: charged - paid,
        isActive: card.isActive,
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}

export function deriveLoanBalances(data: AppData): LoanBalanceRow[] {
  const disbursedByLoan = new Map<string, number>();
  const paidByLoan = new Map<string, number>();

  for (const movement of data.loanMovements ?? []) {
    if (movement.type === "disbursement") {
      disbursedByLoan.set(
        movement.loanId,
        (disbursedByLoan.get(movement.loanId) ?? 0) + movement.amount,
      );
    } else {
      paidByLoan.set(
        movement.loanId,
        (paidByLoan.get(movement.loanId) ?? 0) + movement.amount,
      );
    }
  }

  return (data.loans ?? [])
    .map<LoanBalanceRow>((loan) => {
      const disbursed = disbursedByLoan.get(loan.id) ?? 0;
      const paid = paidByLoan.get(loan.id) ?? 0;
      return {
        loanId: loan.id,
        name: loan.name,
        lender: loan.lender,
        disbursed,
        paid,
        balance: disbursed - paid,
        isActive: loan.isActive,
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}

export function deriveAccountsReceivable(
  data: AppData,
  projectId?: string,
): { total: number; items: AccountsReceivableRow[] } {
  const items = data.invoices
    .filter((invoice) => (projectId ? invoice.projectId === projectId : true))
    .filter((invoice) => invoice.status === "sent")
    .map<AccountsReceivableRow>((invoice) => ({
      invoiceId: invoice.id,
      projectId: invoice.projectId,
      invoiceNumber: invoice.invoiceNumber,
      recipientName: invoice.recipientName,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      total: invoice.total,
    }))
    .sort((left, right) => left.issueDate.localeCompare(right.issueDate));

  const total = items.reduce((sum, item) => sum + item.total, 0);
  return { total, items };
}

export function deriveAccountsPayable(
  data: AppData,
  projectId?: string,
): AccountsPayableSummary {
  const contractors = deriveContractorBalances(data, projectId).reduce(
    (sum, row) => sum + row.pendingBalance,
    0,
  );
  // Tarjetas y préstamos son a nivel empresa; no se asignan a un proyecto.
  const cards = projectId
    ? 0
    : deriveCardBalances(data).reduce((sum, row) => sum + row.balance, 0);
  const loans = projectId
    ? 0
    : deriveLoanBalances(data).reduce((sum, row) => sum + row.balance, 0);

  return { contractors, cards, loans, total: contractors + cards + loans };
}

export function deriveCompanyFinance(data: AppData): CompanyFinanceSummary {
  let cash = 0;
  for (const txn of data.transactions) {
    if (txn.deletedAt !== null) continue;
    if (txn.transactionType === "income") {
      cash += txn.amount;
    } else if (!txn.cardId) {
      cash -= txn.amount;
    }
  }

  for (const movement of data.loanMovements ?? []) {
    cash += movement.type === "disbursement" ? movement.amount : -movement.amount;
  }
  for (const payment of data.cardPayments ?? []) {
    cash -= payment.amount;
  }

  const cardsPayable = deriveCardBalances(data).reduce((sum, row) => sum + row.balance, 0);
  const loansPayable = deriveLoanBalances(data).reduce((sum, row) => sum + row.balance, 0);
  const receivable = deriveAccountsReceivable(data).total;

  return { cash, cardsPayable, loansPayable, receivable };
}

export function deriveMonthlyMovements(
  data: AppData,
  projectId?: string,
): MonthlyMovementRow[] {
  const groups = new Map<string, MonthlyMovementRow>();
  const ensure = (monthKey: string) => {
    let row = groups.get(monthKey);
    if (!row) {
      row = {
        monthKey,
        ventas: 0,
        gastos: 0,
        cobros: 0,
        pagosTarjeta: 0,
        abonosPrestamo: 0,
        prestamosRecibidos: 0,
      };
      groups.set(monthKey, row);
    }
    return row;
  };

  // Ventas = facturado (facturas emitidas o pagadas), por fecha de emisión.
  for (const invoice of data.invoices) {
    if (projectId && invoice.projectId !== projectId) continue;
    if (invoice.status !== "sent" && invoice.status !== "paid") continue;
    ensure(monthKeyFromDate(invoice.issueDate)).ventas += invoice.total;
  }

  for (const txn of data.transactions) {
    if (txn.deletedAt !== null) continue;
    if (projectId && txn.projectId !== projectId) continue;
    const row = ensure(monthKeyFromDate(txn.transactionDate));
    if (txn.transactionType === "income") {
      row.cobros += txn.amount;
    } else {
      row.gastos += txn.amount;
    }
  }

  // Movimientos a nivel empresa (solo en la vista global, sin filtrar por proyecto).
  if (!projectId) {
    for (const payment of data.cardPayments ?? []) {
      ensure(monthKeyFromDate(payment.date)).pagosTarjeta += payment.amount;
    }
    for (const movement of data.loanMovements ?? []) {
      const row = ensure(monthKeyFromDate(movement.date));
      if (movement.type === "payment") {
        row.abonosPrestamo += movement.amount;
      } else {
        row.prestamosRecibidos += movement.amount;
      }
    }
  }

  return [...groups.values()].sort((left, right) =>
    left.monthKey.localeCompare(right.monthKey),
  );
}

// ---------- Tarjetas (CRUD) ----------

export function createCard(data: AppData, input: CreateCardInput): AppData {
  const name = requireNonEmptyValue(input.name, "El nombre de la tarjeta es obligatorio.");
  const next = structuredClone(data);

  const exists = next.cards.find(
    (card) => normalizeLookupValue(card.name) === normalizeLookupValue(name),
  );
  if (exists) {
    return next;
  }

  next.cards.push({ id: createId("card"), name, isActive: true });
  return next;
}

export function updateCard(data: AppData, input: UpdateCardInput): AppData {
  const next = structuredClone(data);
  const card = next.cards.find((item) => item.id === input.id);

  if (!card) {
    throw new Error("Tarjeta no encontrada.");
  }

  card.name = requireNonEmptyValue(input.name, "El nombre de la tarjeta es obligatorio.");
  if (typeof input.isActive === "boolean") {
    card.isActive = input.isActive;
  }

  return next;
}

export function deleteCard(data: AppData, cardId: string): AppData {
  const next = structuredClone(data);
  const index = next.cards.findIndex((item) => item.id === cardId);

  if (index === -1) {
    throw new Error("Tarjeta no encontrada.");
  }

  const used =
    next.transactions.some((txn) => txn.cardId === cardId && txn.deletedAt === null) ||
    next.cardPayments.some((payment) => payment.cardId === cardId);
  if (used) {
    throw new Error("No se puede eliminar una tarjeta con movimientos. Desactívala.");
  }

  next.cards.splice(index, 1);
  return next;
}

export function createCardPayment(
  data: AppData,
  input: CreateCardPaymentInput,
): AppData {
  if (input.amount <= 0) {
    throw new Error("El monto debe ser mayor a cero.");
  }

  const next = structuredClone(data);
  const card = next.cards.find((item) => item.id === input.cardId);

  if (!card) {
    throw new Error("Tarjeta no encontrada.");
  }

  next.cardPayments.push({
    id: createId("card-payment"),
    cardId: input.cardId,
    date: input.date,
    amount: input.amount,
    paymentMethod: input.paymentMethod?.trim() ?? "efectivo",
    notes: input.notes?.trim() ?? "",
  });

  return next;
}

// ---------- Préstamos (CRUD) ----------

export function createLoan(data: AppData, input: CreateLoanInput): AppData {
  const name = requireNonEmptyValue(input.name, "El nombre del préstamo es obligatorio.");
  const next = structuredClone(data);

  next.loans.push({
    id: createId("loan"),
    name,
    lender: input.lender?.trim() ?? "",
    notes: input.notes?.trim() ?? "",
    isActive: true,
  });

  return next;
}

export function updateLoan(data: AppData, input: UpdateLoanInput): AppData {
  const next = structuredClone(data);
  const loan = next.loans.find((item) => item.id === input.id);

  if (!loan) {
    throw new Error("Préstamo no encontrado.");
  }

  loan.name = requireNonEmptyValue(input.name, "El nombre del préstamo es obligatorio.");
  loan.lender = input.lender?.trim() ?? loan.lender;
  loan.notes = input.notes?.trim() ?? loan.notes;
  if (typeof input.isActive === "boolean") {
    loan.isActive = input.isActive;
  }

  return next;
}

export function deleteLoan(data: AppData, loanId: string): AppData {
  const next = structuredClone(data);
  const index = next.loans.findIndex((item) => item.id === loanId);

  if (index === -1) {
    throw new Error("Préstamo no encontrado.");
  }

  const used = next.loanMovements.some((movement) => movement.loanId === loanId);
  if (used) {
    throw new Error("No se puede eliminar un préstamo con movimientos. Desactívalo.");
  }

  next.loans.splice(index, 1);
  return next;
}

// ---------- Tabla de precios ----------

/** Busca el precio por categoría+subcategoría+nombre; cae a categoría+nombre. */
export function findPriceItemMatch(
  data: AppData,
  query: { categoryId: string | null; subcategoryId?: string | null; name: string },
): PriceItem | null {
  const n = normalizeLookupValue(query.name);
  if (!n) return null;
  const cat = query.categoryId ?? null;
  const sub = query.subcategoryId ?? null;
  const items = data.priceItems ?? [];
  return (
    items.find((p) => p.categoryId === cat && p.subcategoryId === sub && p.normalizedName === n) ??
    items.find((p) => p.categoryId === cat && p.normalizedName === n) ??
    null
  );
}

export function createPriceItem(data: AppData, input: CreatePriceItemInput): AppData {
  const name = requireNonEmptyValue(input.name, "El nombre es obligatorio.");
  const next = structuredClone(data);
  const normalizedName = normalizeLookupValue(name);
  const cat = input.categoryId ?? null;
  const sub = input.subcategoryId ?? null;

  const existing = next.priceItems.find(
    (p) => p.categoryId === cat && p.subcategoryId === sub && p.normalizedName === normalizedName,
  );
  if (existing) {
    existing.name = name;
    existing.unit = input.unit ?? existing.unit;
    existing.unitPrice = input.unitPrice;
    return next;
  }

  next.priceItems.push({
    id: createId("price"),
    categoryId: cat,
    subcategoryId: sub,
    name,
    normalizedName,
    unit: input.unit ?? null,
    unitPrice: input.unitPrice,
  });
  return next;
}

export function updatePriceItem(data: AppData, input: UpdatePriceItemInput): AppData {
  const next = structuredClone(data);
  const item = next.priceItems.find((p) => p.id === input.id);
  if (!item) {
    throw new Error("Precio no encontrado.");
  }
  item.categoryId = input.categoryId ?? null;
  item.subcategoryId = input.subcategoryId ?? null;
  item.name = requireNonEmptyValue(input.name, "El nombre es obligatorio.");
  item.normalizedName = normalizeLookupValue(item.name);
  item.unit = input.unit ?? null;
  item.unitPrice = input.unitPrice;
  return next;
}

export function deletePriceItem(data: AppData, id: string): AppData {
  const next = structuredClone(data);
  next.priceItems = next.priceItems.filter((p) => p.id !== id);
  return next;
}

/** Aplica los precios de la tabla a las partidas del proyecto que coincidan. */
export function applyPricesToProjectBudget(data: AppData, projectId: string): { data: AppData; updated: number } {
  const next = structuredClone(data);
  let updated = 0;
  for (const line of next.budgetLines) {
    if (line.projectId !== projectId) continue;
    const match = findPriceItemMatch(next, {
      categoryId: line.categoryId,
      subcategoryId: line.subcategoryId,
      name: line.description,
    });
    if (!match || match.unitPrice === line.unitPrice) continue;
    line.unitPrice = match.unitPrice;
    line.totalBudgeted = Math.round((line.quantity ?? 1) * match.unitPrice * 100) / 100;
    line.isManualTotal = false;
    updated++;
  }
  return { data: next, updated };
}

export function createLoanMovement(
  data: AppData,
  input: CreateLoanMovementInput,
): AppData {
  if (input.amount <= 0) {
    throw new Error("El monto debe ser mayor a cero.");
  }

  const next = structuredClone(data);
  const loan = next.loans.find((item) => item.id === input.loanId);

  if (!loan) {
    throw new Error("Préstamo no encontrado.");
  }

  next.loanMovements.push({
    id: createId("loan-movement"),
    loanId: input.loanId,
    type: input.type,
    date: input.date,
    amount: input.amount,
    notes: input.notes?.trim() ?? "",
  });

  return next;
}
