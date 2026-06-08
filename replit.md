# F1 Draft League

Fantasy F1 game in PT-BR where users draft 3 drivers + 1 constructor team per GP weekend within a rolling budget. Points from race/quali/sprint results, fastest lap, pole, DNF, overtakes, pit stop rankings, and constructor standings. Public/private leagues, friendships via @handle, factory league with bonus budget, admin panel, OpenF1 API sync.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, served at `/api`)
- `pnpm --filter @workspace/f1-draft run dev` — run the frontend (served at `/`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL`, `SESSION_SECRET`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5, JWT auth (SESSION_SECRET), bcryptjs passwords
- DB: PostgreSQL + Drizzle ORM (`lib/db`)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec at `lib/api-spec/openapi.yaml`)
- Frontend: React + Vite, TanStack Query, wouter, shadcn/ui, Tailwind
- Build: esbuild (CJS bundle)

## Where things live

- `lib/db/src/schema/` — Drizzle schema files (users, seasons, grand_prix, drivers, constructor_teams, drafts, draft_scores, leagues, friends, scoring_rules)
- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for API contracts)
- `lib/api-client-react/src/generated/api.ts` — generated React Query hooks
- `lib/api-zod/src/generated/api.ts` — generated Zod validation schemas
- `artifacts/api-server/src/routes/` — Express route handlers (auth, users, seasons, gps, drivers, teams, drafts, leagues, friends, scores, admin)
- `artifacts/api-server/src/lib/` — auth (JWT), scoring engine, OpenF1 client, logger
- `artifacts/f1-draft/src/pages/` — frontend pages (home, dashboard, draft, standings, leagues, friends, profile, admin)
- `artifacts/f1-draft/src/contexts/AuthContext.tsx` — JWT auth context (token in localStorage as "f1dl_token")

## Architecture decisions

- JWT-based auth (not Supabase Auth) — token stored in `localStorage["f1dl_token"]`, attached as Bearer via `custom-fetch.ts`
- Budget recharges each GP — baseBudget from the active season, plus bonusBudget (factory league top-3 reward)
- Reserve driver rule enforced server-side: must cost strictly less than the cheapest of the 3 main drivers
- Scoring rules stored in DB (single row, admin-editable); seeded with defaults on first use
- OpenF1 sync pulls sessions by meeting_key, maps driver numbers to DB driver IDs by number field
- Factory league: `isFactory=true` league; top 3 at season end get bonus budget (admin-managed)

## Product

- Landing page with next GP countdown and global top-5 preview
- Register/login with email + password + @handle
- Dashboard: next GP card, season score summary, leagues quick view
- Draft page: pick 3 drivers + 1 constructor within budget; optional reserve driver; price change indicators
- Draft results: per-entity point breakdown with green/red line items
- Global standings, league standings, league management (public/private, invite code)
- Friends system (add by @handle, accept/reject requests)
- Admin panel: stats, GP/driver/team management, scoring rules editor, OpenF1 sync, score recalculation

## User preferences

- PT-BR interface (all text in Portuguese)
- Dark theme only, F1 red (#E8002D) as primary accent
- Dense, data-rich UI — "cockpit, not a form"

## Gotchas

- After adding new DB tables: run `pnpm run typecheck:libs` to rebuild lib declarations before typechecking leaf packages
- After editing `lib/db/src/schema/`: run `pnpm --filter @workspace/db run push` to apply to DB
- After editing `lib/api-spec/openapi.yaml`: run `pnpm --filter @workspace/api-spec run codegen`
- `useGetGlobalRanking`, `useGetMyScoreSummary`, `useListDrivers`, `useListConstructorTeams`, `useListLeagues` all take params as first argument (even if undefined) and options as second
- `useSaveDraft` requires `{ gpId, data: DraftInput }` — gpId is in the mutation args, not a path param
- `useSyncGPData` requires `{ id: string }` (the GP id), `useRecalculateGPScores` requires `{ gpId: string }`

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
