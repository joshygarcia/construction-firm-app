# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev          # Next dev server (browser dev, http://localhost:3000)
npm run build        # Production build (output: "standalone")
npm run lint         # ESLint
npm run test         # Vitest (single run)
npm run test:watch   # Vitest (watch mode)
npx vitest run src/features/finance/ledger.test.ts  # Run a single test file

# Electron / desktop
npm run electron:dev      # Run the app inside Electron against `next dev` (live reload)
npm run electron:compile  # Compile electron/*.ts → electron/dist/ (tsconfig.electron.json)
npm run electron:build    # next build + copy standalone assets + compile electron
npm run dist              # electron:build, then package into dist-electron/ (@electron/packager)
npm run dist:zip          # dist, then zip into dist-electron/Control-Central-windows-x64.zip
```

**Releasing:** push a `vX.Y.Z` git tag. `.github/workflows/release.yml` verifies the tag matches `package.json` version, runs `dist:zip`, and publishes the zip as a GitHub Release asset. The desktop app's auto-updater polls that release. The `version` in `package.json` and the git tag must stay in sync.

## Architecture

**"Control Central"** — an **offline Windows desktop app** for a construction firm's financial control (Spanish UI, locale `es-DO`, currency `DOP`). A Next.js 16 / React 19 / Tailwind 4 / shadcn-ui app wrapped in Electron, shipped as a self-contained zip with a GitHub-based auto-updater. There is no server, no login, and no internet dependency except update checks.

### Electron shell (`electron/`)

- `main.ts` — On launch (packaged), finds a free port, sets `APP_DATA_DIR` to `app.getPath("userData")` (`%APPDATA%\Control Central`) and `CONTROL_CENTRAL_BLANK_SEED=1`, then `require()`s the bundled Next **standalone** `server.js` **in-process** and loads `http://127.0.0.1:<port>` in a `BrowserWindow`. In dev, `next dev` is started externally by `electron:dev` and the window just waits for port 3000. Spanish app menu; external links open in the system browser.
- `updater.ts` — Reads the `updater` field in `package.json` (`owner`/`repo`/`assetName`), queries the GitHub "latest release" API, compares semver, downloads the zip with a progress window, then writes and spawns a detached `apply-update.cmd` that waits for the app to exit, `robocopy /MIR`s the new build over the install dir, and relaunches. Runs silently on startup and on demand via "Ayuda → Buscar actualizaciones…". User data in `%APPDATA%` is never touched by updates.
- Source compiles to `electron/dist/` (git-ignored); `package.json` `main` points there.

### Packaging (`scripts/`)

- `copy-standalone-assets.mjs` — copies `.next/static` and `public/` into `.next/standalone`, and **scrubs** stray repo files the Next file tracer pulls in (keeps only `server.js`, `package.json`, `node_modules`, `.next`, `public`, `src`).
- `package-electron.mjs` — uses `@electron/packager` (not electron-builder; avoids the winCodeSign symlink failure on Windows without Developer Mode). `asar: false` because the standalone server reads files dynamically. An aggressive `ignore` keeps only `package.json`, `electron/dist`, and `.next/standalone`.
- `zip-dist.mjs` — `Compress-Archive` the packaged folder into the release zip.
- `next.config.ts` sets `output: "standalone"` and pins `outputFileTracingRoot` so the tracer doesn't climb above the repo.

### Data layer (local JSON store)

The single source of truth is a JSON file at `<APP_DATA_DIR>/finance-store.json` (`.data/finance-store.json` in dev, `%APPDATA%\Control Central\` packaged).

- `paths.ts` — resolves `APP_DATA_DIR` (falls back to `cwd/.data`), the store file, and the receipts dir.
- `persistence.ts` — `read`/`write` with legacy migration: `normalizeAppData` backfills any missing top-level collections from the seed so old stores keep working after the schema grows.
- `store.ts` (`"server-only"`) — lazily constructs persistence, exposes `getX`/`saveX`/`editX`/`removeX` helpers. Every read `structuredClone`s; every mutation calls a pure `ledger.ts` function then `persistence.write`.
- `seed.ts` — `getInitialSeed()` returns the full demo dataset, or a **blank seed** (chart of accounts only, no transactional data) when `CONTROL_CENTRAL_BLANK_SEED=1` — that's what shipped clients start from.

A Supabase Postgres schema in `supabase/migrations/` mirrors the domain model but is **not used at runtime** — legacy reference only.

### Domain (`src/features/finance/`)

- `ledger.ts` — all domain types plus pure `create*/update*/delete*` and `derive*` functions over an immutable `AppData` snapshot. Entities: categories/subcategories, projects, **budgetVersions** (lockable/approvable), **budgetSections**, budgetLines, contractors, **contractorContracts**, **contractorPayments**, transactions (expense/income, soft-deleted via `deletedAt`), **invoices**, and **suggestionOptions** (autocomplete memory). Derive functions (`deriveProjectSummary`, `deriveBudgetVsActual`, `deriveBudgetVsActualMonthly`, `deriveBudgetAdvances`, `deriveCashflow`, `deriveMonthlyControl`, `deriveContractorBalances`) are pure — keep them side-effect free.
- `schemas.ts` — Zod v4 validation, one schema per input type.
- `actions.ts` — `"use server"` actions that validate → call a `store.ts` mutation → `refresh()` (Next 16's `next/cache` API, **not** `revalidatePath`). Return `ActionResult` (`{ ok, message, fieldErrors? }`) consumed by forms for toast feedback.
- `excel-import.ts` — parses the client's legacy Excel workbooks (`xlsx`) into importable records. `app-specs.md` documents the original workbook structure and import mapping.

### Routing

App Router, no auth (the offline build has a single implicit user). `/` redirects to `/projects`. All app pages live under the `(app)` route group whose layout sets `export const dynamic = "force-dynamic"` (prerendering would bake dev seed data into shipped HTML). Project pages: `projects/[projectId]/{budgets,transactions,income,contractors,invoices,reports,calendario}`, plus top-level `settings`. `src/app/api/` route handlers serve PDF/Excel exports (`jspdf`) and receipt upload/serve.

### Conventions

- Path alias `@/*` → `./src/*`.
- UI primitives in `src/components/ui/` are shadcn on top of `@base-ui/react` headless primitives + `cva` + `tailwind-merge`.
- Tests use Vitest + jsdom + Testing Library; setup in `src/test/setup.ts`.
