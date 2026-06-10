# B2B-LAW Monorepo — Walkthrough

## Overview

B2B-LAW is a legal case management system with dual-mode architecture (Cloud via Axios, Desktop via Electron IPC). Arabic RTL UI, Tailwind CSS (`tw-` prefix, Preflight disabled), Vuetify + shadcn-vue progressive coexistence.

---

## Project Structure

```
g:\w2w\
├── src/renderer/          # Vue 3 frontend (Vite + Vuetify + Tailwind)
│   └── src/
│       ├── views/         # Page-level Vue components
│       │   ├── cases/     # Sub-components for Cases.vue (9 files)
│       │   ├── case-details/ # Sub-components for CaseDetails.vue (7 files)
│       │   ├── contracts/ # Sub-components for Contracts.vue (5 files)
│       │   ├── sessions/  # Sub-components for Sessions.vue (5 files)
│       │   ├── session-room/ # Sub-components for SessionRoom.vue (7 files)
│       │   ├── users/     # Sub-components for UsersManagement.vue (7 files)
│       │   └── ...        # Other views
│       ├── utils/         # Utility functions
│       ├── assets/        # CSS (main.css with full design system)
│       ├── plugins/       # Vuetify config (vuetify.ts)
│       └── stores/        # Pinia stores
├── cloud-server/          # Node.js/Express backend
│   └── src/
│       ├── db/            # Drizzle ORM (51 tables, 12 schema files)
│       │   ├── schema/    # Table definitions + relations
│       │   ├── migrations/ # SQL migration files
│       │   └── services/  # Business logic (case, contract, auth, enforcement)
│       └── routes/        # API routes
├── dist/web/              # Production build output
├── .github/workflows/     # CI/CD (ci-cd.yml)
└── Dockerfile + docker-compose.yml + nginx.conf
```

---

## What Was Done

### Phase 1: Database & Schema (Drizzle ORM)

- **51 tables** across 12 schema files with full relations
- Migration pipeline: `connection.ts` → `runMigrations()`, build copies `migrations/` to `dist/`
- SQL migration (`0000_dear_domino.sql`): 870 lines, 51 CREATE TABLE, 63 ALTER TABLE (FK constraints)
- Verified with `drizzle-kit up` (schema matches code) and tested on staging DB

### Phase 2: File Splitting (9 Large Vue Files → 24 Sub-components)

| Original File | Lines (Before) | Lines (After) | Sub-components |
|---|---|---|---|
| Cases.vue | 2585 | ~250 | 9 |
| CaseDetails.vue | 2813 | ~200 | 7 |
| Dashboard.vue | 1527 | ~978 | 7 |
| Settings.vue | 1566 | ~1368 | 4 |
| Tasks.vue | 1640 | ~1347 | 4 |
| Sessions.vue | 1142 | ~170 | 5 |
| UsersManagement.vue | 1316 | ~150 | 7 |
| SessionRoom.vue | 1476 | ~310 | 7 |
| Contracts.vue | 1746 | ~170 | 5 |

All pass `vue-tsc --noEmit` typecheck.

### Phase 3: Theme Design

- **Dark mode**: Gold (`#E9C349`) + Charcoal (`#111622`) + Deep background (`#050A15`)
- **Light mode**: Navy (`#1A437D`) + Warm sand (`#F1F5F9`) + White (`#F5F7FB`)
- CSS variables for both themes in `main.css` (glassmorphism, gold tokens, shadows)
- 4 hardcoded colors replaced with CSS variables

### Phase 4: Infrastructure

- **Docker**: `docker-compose.yml` (3 services: PostgreSQL 16 → backend:8080 → frontend nginx:80), health checks, persistent volume
- **CI/CD**: GitHub Actions workflow (3 stages: verify → build → deploy)
  - Deploy frontend to Netlify, backend to Render
- **Testing**: Vitest (34/35 passing), Playwright (Chromium, E2E smoke test)

### Phase 5: Production Build

- Frontend: 2606 modules, ~13s build, chunk-split (vuetify, charts, vue-vendor, vendor)
- Backend: tsc + migration copy to dist

### Phase 6: Mock OTP Mode Refactoring

- **Decoupled bypass logic**: Switched from legacy token-based check (`mock-`) to environment variable `VITE_USE_MOCK_OTP`.
- **MockBanner UI Component**: Created a sleek, top-fixed, glassmorphic banner in Arabic to alert developers and users when mock OTP mode is enabled.
- **Improved Integration**: Placed `MockBanner` outside the main flex `v-row` in both `Register.vue` and `Login.vue` to ensure zero layout interference with the centered cards.
- **Unit Testing**: Created `src/__tests__/mockMode.test.ts` to verify the banner's visibility toggles correctly based on `import.meta.env.VITE_USE_MOCK_OTP` using Vitest and Vue Test Utils.

---

## Key Decisions

| Decision | Rationale |
|---|---|
| `emptyOutDir: false` in `vite.config.ts` | Windows EPERM on `dist/web/assets/` (file handle lock) |
| Supabase CLI + Docker for migrations | No local Postgres access (admin rights, shared memory) |
| All sub-components are self-contained dialogs | Dialogs manage own API calls, emit `done` events |
| Tailwind `tw-` prefix + Preflight disabled | Vuetify coexistence |
| `cloud-server/.env` never committed | Production DB password + JWT secret |

---

## Blockers

| Issue | Status |
|---|---|
| Local PostgreSQL inaccessible | Admin rights needed for `pg_hba.conf`, password unknown for `postgres` user |
| Second PG instance fails | Windows shared memory conflict between instances |
| Docker Desktop not installed | Supervisor will test `docker compose up -d` on his machine |
| `uiAudits.test.ts` pre-existing failure | Looks for `src/main` (Electron dir) — not related to web build |

---

## GitHub Secrets Required

| Secret | Purpose |
|---|---|
| `NETLIFY_AUTH_TOKEN` | Netlify deploy auth |
| `NETLIFY_SITE_ID` | Netlify site identifier |
| `RENDER_DEPLOY_HOOK_URL` | Render deploy webhook URL |

---

## Commands

```bash
# Development
npm run dev                    # Frontend dev server (localhost:5173)
npm --prefix cloud-server dev  # Backend dev server

# Testing
npm test                       # Vitest unit tests
npm run test:e2e               # Playwright E2E tests

# Build
npm run build                  # Frontend production build
npm --prefix cloud-server run build  # Backend production build

# Type checking
npm run typecheck              # vue-tsc check
npx tsc --noEmit               # Backend TS check (in cloud-server/)

# Database
npm --prefix cloud-server run migrate  # Run Drizzle migrations
```

---

## Known Limitations

1. **Vuetify CSS is large** (436 KB) — bundled as separate chunk
2. **`vendor.js` > 500 KB** — could be split further with dynamic imports
3. **Playwright tests need dev server** — configured to auto-start via `webServer`
4. **`uiAudits.test.ts` fails** — scans for `src/main` (Electron) which doesn't exist in web-only mode
5. **Cleanup after staging DB test** — portable PG files at `C:\Users\saleh\AppData\Local\Temp\pg16_portable\` can be deleted
