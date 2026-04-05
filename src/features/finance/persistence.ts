import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import type { AppData } from "@/features/finance/ledger";

export type AppDataPersistence = {
  read: (seed: () => AppData) => AppData;
  write: (data: AppData) => AppData;
};

function ensureDirectory(filePath: string) {
  mkdirSync(dirname(filePath), { recursive: true });
}

function normalizeAppData(data: AppData, seedData: AppData) {
  return {
    ...data,
    categories: data.categories ?? seedData.categories,
    subcategories: data.subcategories ?? seedData.subcategories,
    projects: data.projects ?? seedData.projects,
    budgetVersions: data.budgetVersions ?? seedData.budgetVersions,
    budgetLines: data.budgetLines ?? seedData.budgetLines,
    contractors: data.contractors ?? seedData.contractors,
    contractorContracts: data.contractorContracts ?? seedData.contractorContracts,
    transactions: data.transactions ?? seedData.transactions,
    contractorPayments: data.contractorPayments ?? seedData.contractorPayments,
    suggestionOptions: data.suggestionOptions ?? seedData.suggestionOptions ?? [],
    invoices: data.invoices ?? [],
  } satisfies AppData;
}

function hasLegacyGaps(data: Partial<AppData>) {
  return (
    data.categories === undefined ||
    data.subcategories === undefined ||
    data.projects === undefined ||
    data.budgetVersions === undefined ||
    data.budgetLines === undefined ||
    data.contractors === undefined ||
    data.contractorContracts === undefined ||
    data.transactions === undefined ||
    data.contractorPayments === undefined ||
    data.suggestionOptions === undefined ||
    data.invoices === undefined
  );
}

export function createAppDataPersistence(filePath: string): AppDataPersistence {
  return {
    read(seed) {
      ensureDirectory(filePath);

      if (!existsSync(filePath)) {
        const initial = seed();
        writeFileSync(filePath, JSON.stringify(initial, null, 2), "utf8");
        return structuredClone(initial);
      }

      const parsed = JSON.parse(readFileSync(filePath, "utf8")) as Partial<AppData>;

      if (!hasLegacyGaps(parsed)) {
        return structuredClone(parsed as AppData);
      }

      const seeded = seed();
      const normalized = normalizeAppData(parsed as AppData, seeded);
      writeFileSync(filePath, JSON.stringify(normalized, null, 2), "utf8");

      return structuredClone(normalized);
    },
    write(data) {
      ensureDirectory(filePath);
      writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
      return structuredClone(data);
    },
  };
}
