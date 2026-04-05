import {
  createCategory,
  createContractorPayment,
  createExpense,
  createSubcategory,
  deriveBudgetVsActual,
  deriveCashflow,
  deriveContractorBalances,
  deriveProjectSummary,
  upsertSuggestionOption,
  type AppData,
} from "@/features/finance/ledger";

function buildFixture(): AppData {
  return {
    organization: {
      id: "org-1",
      name: "Estudio Tigaiga",
    },
    currentUser: {
      id: "user-1",
      name: "Mariela Acosta",
      role: "admin",
    },
    categories: [
      { id: "cat-plomeria", name: "PLOMERIA", sortOrder: 1, isActive: true },
      { id: "cat-solar", name: "SOLAR", sortOrder: 2, isActive: true },
    ],
    subcategories: [
      {
        id: "sub-plomero",
        categoryId: "cat-plomeria",
        name: "M.D.O. Plomero",
        sortOrder: 1,
        isActive: true,
      },
      {
        id: "sub-materiales",
        categoryId: "cat-plomeria",
        name: "Materiales de plomeria",
        sortOrder: 2,
        isActive: true,
      },
    ],
    projects: [
      {
        id: "project-1",
        name: "Plaza Tigaiga",
        clientName: "Tigaiga",
        location: "Santiago, RD",
        status: "active",
        startDate: "2026-03-01",
        endDate: null,
        notes: "Proyecto piloto",
      },
    ],
    budgetVersions: [
      {
        id: "budget-version-1",
        projectId: "project-1",
        versionName: "Presupuesto Base",
        status: "approved",
        isLocked: true,
        approvedAt: "2026-03-01T00:00:00.000Z",
      },
    ],
    budgetSections: [],
    budgetLines: [
      {
        id: "budget-line-1",
        budgetVersionId: "budget-version-1",
        projectId: "project-1",
        sectionId: null,
        categoryId: "cat-plomeria",
        subcategoryId: "sub-plomero",
        phase: "N1",
        area: null,
        lineCode: "PL-001",
        description: "Instalacion sanitaria",
        quantity: 1,
        unit: "PA",
        unitPrice: 25000,
        totalBudgeted: 25000,
        notes: "",
        sortOrder: 1,
        isManualTotal: false,
      },
    ],
    contractors: [
      {
        id: "contractor-1",
        fullName: "Plomero Juan",
        trade: "Plomeria",
        phone: "",
        email: "",
        notes: "",
        isActive: true,
      },
    ],
    contractorContracts: [
      {
        id: "contract-1",
        projectId: "project-1",
        contractorId: "contractor-1",
        categoryId: "cat-plomeria",
        subcategoryId: "sub-plomero",
        scopeDescription: "Trabajo de plomeria",
        agreedTotal: 40000,
        status: "active",
        startDate: "2026-03-01",
        endDate: null,
        notes: "",
      },
    ],
    transactions: [
      {
        id: "txn-expense-1",
        projectId: "project-1",
        budgetLineId: "budget-line-1",
        categoryId: "cat-plomeria",
        subcategoryId: "sub-plomero",
        transactionType: "expense",
        transactionDate: "2026-03-08",
        amount: 12000,
        detail: "Avance 1 plomero",
        payeeOrSource: "Plomero Juan",
        paymentMethod: "transferencia",
        externalReference: "",
        contractorContractId: "contract-1",
        receiptPath: null,
        createdBy: "user-1",
        deletedAt: null,
      },
      {
        id: "txn-income-1",
        projectId: "project-1",
        budgetLineId: null,
        categoryId: null,
        subcategoryId: null,
        transactionType: "income",
        transactionDate: "2026-03-12",
        amount: 30000,
        detail: "Desembolso 1",
        payeeOrSource: "Cliente",
        paymentMethod: "deposito",
        externalReference: "",
        contractorContractId: null,
        receiptPath: null,
        createdBy: "user-1",
        deletedAt: null,
      },
    ],
    contractorPayments: [
      {
        id: "contractor-payment-1",
        contractorContractId: "contract-1",
        transactionId: "txn-expense-1",
        paymentDate: "2026-03-08",
        amount: 12000,
        notes: "Primer avance",
      },
    ],
    suggestionOptions: [],
    invoices: [],
  };
}

describe("financial derivations", () => {
  it("derives budget vs actual per subcategory", () => {
    const result = deriveBudgetVsActual(buildFixture(), "project-1");

    expect(result).toEqual([
      expect.objectContaining({
        categoryName: "PLOMERIA",
        subcategoryName: "M.D.O. Plomero",
        budgeted: 25000,
        actual: 12000,
        remaining: 13000,
        variance: -13000,
        status: "on_track",
      }),
    ]);
  });

  it("derives project cashflow and summary", () => {
    const data = buildFixture();

    const cashflow = deriveCashflow(data, "project-1");
    const summary = deriveProjectSummary(data, "project-1");

    expect(cashflow).toEqual([
      expect.objectContaining({
        monthKey: "2026-03",
        totalIncome: 30000,
        totalExpense: 12000,
        netCashflow: 18000,
      }),
    ]);
    expect(summary).toEqual(
      expect.objectContaining({
        totalBudget: 25000,
        totalIncome: 30000,
        totalExpenses: 12000,
        budgetRemaining: 13000,
        cashAvailable: 18000,
        pendingContractorBalances: 28000,
      }),
    );
  });
});

describe("ledger mutations", () => {
  it("creates a category and subcategory for quick entry use", () => {
    const withCategory = createCategory(buildFixture(), {
      name: "PINTURA",
    });
    const createdCategory = withCategory.categories.at(-1);

    const withSubcategory = createSubcategory(withCategory, {
      categoryId: createdCategory!.id,
      name: "M.D.O. Pintor",
    });

    expect(createdCategory).toEqual(
      expect.objectContaining({
        name: "PINTURA",
      }),
    );
    expect(withSubcategory.subcategories.at(-1)).toEqual(
      expect.objectContaining({
        categoryId: createdCategory!.id,
        name: "M.D.O. Pintor",
      }),
    );
  });

  it("upserts global quick-entry suggestions without duplicating normalized values", () => {
    const withSuggestion = upsertSuggestionOption(buildFixture(), {
      kind: "counterparty",
      value: "Ferreteria Central",
    });
    const withDuplicate = upsertSuggestionOption(withSuggestion, {
      kind: "counterparty",
      value: " ferreteria central ",
    });

    expect(withSuggestion.suggestionOptions).toHaveLength(1);
    expect(withDuplicate.suggestionOptions).toHaveLength(1);
    expect(withDuplicate.suggestionOptions[0]).toEqual(
      expect.objectContaining({
        kind: "counterparty",
        value: "Ferreteria Central",
        normalizedValue: "ferreteria central",
      }),
    );
  });

  it("creates an expense and links the matching budget line", () => {
    const updated = createExpense(buildFixture(), {
      projectId: "project-1",
      transactionDate: "2026-03-20",
      categoryId: "cat-plomeria",
      subcategoryId: "sub-plomero",
      amount: 5000,
      detail: "Material adicional",
      payeeOrSource: "Ferreteria Central",
      paymentMethod: "efectivo",
      budgetLineId: null,
    });

    const transaction = updated.transactions.at(-1);

    expect(transaction).toEqual(
      expect.objectContaining({
        transactionType: "expense",
        budgetLineId: "budget-line-1",
        amount: 5000,
      }),
    );
  });

  it("creates a contractor payment and updates the pending balance atomically", () => {
    const updated = createContractorPayment(buildFixture(), {
      projectId: "project-1",
      contractorContractId: "contract-1",
      transactionDate: "2026-03-20",
      amount: 8000,
      detail: "Avance 2 plomero",
      paymentMethod: "transferencia",
      notes: "Segundo avance",
    });

    expect(updated.transactions).toHaveLength(3);
    expect(updated.contractorPayments).toHaveLength(2);
    expect(
      deriveContractorBalances(updated, "project-1").find(
        (item) => item.contractorContractId === "contract-1",
      ),
    ).toEqual(
      expect.objectContaining({
        totalPaid: 20000,
        pendingBalance: 20000,
      }),
    );
  });
});
