import { join } from "node:path";

export function getAppDataDir() {
  return process.env.APP_DATA_DIR ?? join(process.cwd(), ".data");
}

export function getStoreFilePath() {
  return join(getAppDataDir(), "finance-store.json");
}

export function getReceiptsDir() {
  return join(getAppDataDir(), "receipts");
}
