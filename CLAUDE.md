# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev          # Start dev server (Next.js 16 + Turbopack)
npm run build        # Production build
npm run lint         # ESLint
npm run test         # Vitest (single run)
npm run test:watch   # Vitest (watch mode)
npx vitest run src/features/finance/ledger.test.ts  # Run a single test file
```

## Architecture

**"Control Central"** — a construction firm financial control app (Spanish UI, locale `es-DO`, currency `DOP`). Built with Next.js 16, React 19, Tailwind CSS 4, and shadcn/ui components.

### Data layer (dual-track)

The app currently uses a **JSON file store** (`store.ts` → `persistence.ts`) that reads/writes to `.data/finance-store.json`, seeded from `seed.ts`. All domain mutations go through pure functions in `ledger.ts` that accept and return an immutable `AppData` snapshot. A Supabase Postgres schema exists in `supabase/migrations/` with RLS, views, and triggers mirroring the same domain model — but the app does not connect to Supabase yet.

### Feature organization

- `src/features/auth/` — cookie-based role auth (`admin` | `member`), no real user accounts yet. `session.ts` reads role from cookie; `actions.ts` has server actions for login/logout.
- `src/features/finance/` — core domain. `ledger.ts` contains all types, pure create/derive functions. `store.ts` wraps persistence with `"server-only"`. `schemas.ts` has Zod v4 validation. `actions.ts` has server actions that validate → mutate → `refresh()`.
- `src/components/ui/` — shadcn primitives (uses `@base-ui/react` headless primitives, `cva`, `tailwind-merge`).
- `src/components/projects/`, `src/components/reports/`, `src/components/shared/` — feature-level UI.

### Routing

Next.js App Router with route groups:
- `(auth)/login` — public login page
- `(app)/` — protected layout that calls `requireSession()`. Contains: `dashboard`, `projects`, `projects/[projectId]`, `transactions`, `budgets`, `contractors`, `reports`, `settings`.

### Key patterns

- Server actions return `ActionResult` (`{ ok, message, fieldErrors? }`) — components use this for toast/form feedback.
- `ledger.ts` derive functions (`deriveBudgetVsActual`, `deriveCashflow`, `deriveProjectSummary`, `deriveContractorBalances`, `deriveMonthlyControl`) are pure computations over `AppData` — keep them side-effect free.
- Path alias: `@/*` maps to `./src/*`.
- Tests use Vitest + jsdom + Testing Library. Setup in `src/test/setup.ts`.
