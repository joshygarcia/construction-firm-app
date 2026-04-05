import type {
  BudgetLine,
  BudgetVsActualRow,
  Contractor,
  ContractorBalanceRow,
  ContractorContract,
  Project,
  ProjectSummary,
} from "@/features/finance/ledger";
import {
  deriveQuickEntryPreview,
  type QuickEntryPreviewContext,
} from "@/features/finance/quick-entry-preview";

function buildContext(): QuickEntryPreviewContext {
  const projects: Project[] = [
    {
      id: "project-1",
      name: "Plaza Tigaiga",
      clientName: "Grupo Tigaiga",
      location: "Santiago, RD",
      status: "active",
      startDate: "2026-03-01",
      endDate: null,
      notes: "",
    },
  ];

  const projectSummaries: ProjectSummary[] = [
    {
      projectId: "project-1",
      totalBudget: 57000,
      totalIncome: 30000,
      totalExpenses: 12000,
      budgetRemaining: 45000,
      cashAvailable: 18000,
      pendingContractorBalances: 28000,
      budgetConsumedPercent: 21.05,
    },
  ];

  const budgetRows: Array<BudgetVsActualRow & { projectId: string }> = [
    {
      projectId: "project-1",
      key: "cat-plomeria:sub-plomero",
      categoryId: "cat-plomeria",
      categoryName: "PLOMERIA",
      subcategoryId: "sub-plomero",
      subcategoryName: "M.D.O. Plomero",
      budgeted: 25000,
      actual: 12000,
      remaining: 13000,
      variance: -13000,
      variancePercent: -52,
      status: "on_track",
    },
  ];

  const budgetLines: BudgetLine[] = [
    {
      id: "budget-line-1",
      budgetVersionId: "budget-version-1",
      projectId: "project-1",
      sectionId: null,
      categoryId: "cat-plomeria",
      subcategoryId: "sub-plomero",
      phase: "N1",
      area: "Banos",
      lineCode: "PL-001",
      description: "Instalacion sanitaria principal",
      quantity: 1,
      unit: "PA",
      unitPrice: 25000,
      totalBudgeted: 25000,
      notes: "",
      sortOrder: 1,
      isManualTotal: false,
    },
  ];

  const contractors: Contractor[] = [
    {
      id: "contractor-1",
      fullName: "Plomero Juan",
      trade: "Plomeria",
      phone: "",
      email: "",
      notes: "",
      isActive: true,
    },
  ];

  const contracts: ContractorContract[] = [
    {
      id: "contract-1",
      projectId: "project-1",
      contractorId: "contractor-1",
      categoryId: "cat-plomeria",
      subcategoryId: "sub-plomero",
      scopeDescription: "Trabajo general de plomeria",
      agreedTotal: 40000,
      status: "active",
      startDate: "2026-03-01",
      endDate: null,
      notes: "",
    },
  ];

  const contractorBalances: ContractorBalanceRow[] = [
    {
      contractorContractId: "contract-1",
      contractorId: "contractor-1",
      contractorName: "Plomero Juan",
      projectId: "project-1",
      scopeDescription: "Trabajo general de plomeria",
      agreedTotal: 40000,
      totalPaid: 12000,
      pendingBalance: 28000,
      lastPaymentDate: "2026-03-08",
    },
  ];

  return {
    projects,
    projectSummaries,
    budgetRows,
    budgetLines,
    contractors,
    contracts,
    contractorBalances,
  };
}

describe("deriveQuickEntryPreview", () => {
  it("projects expense impact into cash and budget consumption", () => {
    const preview = deriveQuickEntryPreview(buildContext(), {
      mode: "expense",
      projectId: "project-1",
      transactionDate: "2026-03-20",
      amount: 5000,
      categoryId: "cat-plomeria",
      subcategoryId: "sub-plomero",
      budgetLineId: "budget-line-1",
    });

    expect(preview).toEqual(
      expect.objectContaining({
        projectName: "Plaza Tigaiga",
        monthKey: "2026-03",
        cashDelta: -5000,
        projectedCashAvailable: 13000,
        categoryName: "PLOMERIA",
        subcategoryName: "M.D.O. Plomero",
        projectedActual: 17000,
        projectedRemaining: 8000,
        matchedBudgetLineDescription: "Instalacion sanitaria principal",
      }),
    );
  });

  it("projects contractor payment impact into pending balance", () => {
    const preview = deriveQuickEntryPreview(buildContext(), {
      mode: "contractor_payment",
      projectId: "project-1",
      transactionDate: "2026-03-20",
      amount: 8000,
      contractorContractId: "contract-1",
    });

    expect(preview).toEqual(
      expect.objectContaining({
        cashDelta: -8000,
        projectedCashAvailable: 10000,
        contractorName: "Plomero Juan",
        contractorPendingBalanceBefore: 28000,
        contractorPendingBalanceAfter: 20000,
      }),
    );
  });

  it("projects income impact into available cash", () => {
    const preview = deriveQuickEntryPreview(buildContext(), {
      mode: "income",
      projectId: "project-1",
      transactionDate: "2026-03-20",
      amount: 15000,
    });

    expect(preview).toEqual(
      expect.objectContaining({
        cashDelta: 15000,
        projectedCashAvailable: 33000,
        projectedBudgetRemaining: 45000,
      }),
    );
  });

  it("projects a new budget line into total budget without affecting cash", () => {
    const preview = deriveQuickEntryPreview(buildContext(), {
      mode: "budget_line",
      projectId: "project-1",
      amount: 18000,
      categoryId: "cat-plomeria",
      subcategoryId: "sub-plomero",
      budgetVersionId: "budget-version-1",
    });

    expect(preview).toEqual(
      expect.objectContaining({
        cashDelta: 0,
        projectedCashAvailable: 18000,
        projectedBudgetTotal: 75000,
        projectedBudgetRemaining: 63000,
      }),
    );
  });
});
