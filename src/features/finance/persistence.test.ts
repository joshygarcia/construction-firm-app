import { mkdtempSync, readFileSync } from "node:fs";
import { rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import type { AppData } from "@/features/finance/ledger";
import {
  createAppDataPersistence,
  type AppDataPersistence,
} from "@/features/finance/persistence";

function buildFixture(): AppData {
  return {
    organization: {
      id: "org-1",
      name: "Control Central",
    },
    currentUser: {
      id: "user-1",
      name: "Mariela",
      role: "admin",
    },
    categories: [],
    subcategories: [],
    projects: [],
    budgetVersions: [],
    budgetSections: [],
    budgetLines: [],
    contractors: [],
    contractorContracts: [],
    transactions: [],
    contractorPayments: [],
    suggestionOptions: [],
    invoices: [],
  };
}

describe("app data persistence", () => {
  let tempDir: string;
  let persistence: AppDataPersistence;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "construction-firm-app-"));
    persistence = createAppDataPersistence(join(tempDir, "app-data.json"));
  });

  afterEach(async () => {
    await rm(tempDir, { force: true, recursive: true });
  });

  it("persists data to disk and reloads it for a fresh instance", () => {
    const fixture = buildFixture();

    persistence.write(fixture);

    const freshPersistence = createAppDataPersistence(join(tempDir, "app-data.json"));
    const reloaded = freshPersistence.read(() => buildFixture());

    expect(reloaded).toEqual(fixture);
    expect(JSON.parse(readFileSync(join(tempDir, "app-data.json"), "utf8"))).toEqual(
      fixture,
    );
  });

  it("seeds the file only once when no persisted data exists", () => {
    const first = persistence.read(() => buildFixture());
    const second = persistence.read(() => {
      throw new Error("seed function should not run again once file exists");
    });

    expect(first).toEqual(buildFixture());
    expect(second).toEqual(buildFixture());
  });

  it("backfills missing fields for legacy persisted data", () => {
    const legacyData = {
      ...buildFixture(),
    };

    delete (legacyData as Partial<AppData>).suggestionOptions;
    persistence.write(legacyData as AppData);

    const reloaded = persistence.read(() => buildFixture());

    expect(reloaded.suggestionOptions).toEqual([]);
    expect(
      JSON.parse(readFileSync(join(tempDir, "app-data.json"), "utf8")).suggestionOptions,
    ).toEqual([]);
  });
});
