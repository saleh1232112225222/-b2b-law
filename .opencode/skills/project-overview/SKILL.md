---
name: project-overview
description: B2B-LAW project overview — architecture, tech stack, and folder structure
license: MIT
metadata:
  audience: developers
---

# B2B-LAW برنامج المحامي الاحترافي

Multi-tenant SaaS for law firm management (Arabic).

## Tech Stack

- **Frontend**: Vue 3 + Vuetify 3 + Tailwind CSS + TypeScript
- **Backend**: Express 4 + TypeScript (cloud-server/)
- **Database**: PostgreSQL 18 + Drizzle ORM
- **Desktop**: Electron (src/electron/)
- **Mobile**: Capacitor
- **CI/CD**: GitHub Actions → Netlify (frontend) + Render (backend)
- **Hosting**: Netlify (`b2b-law.netlify.app`), Render (`b2b-law-g2qr.onrender.com`)

## Folder Structure

- `src/renderer/` — Vue 3 frontend app
- `cloud-server/` — Express backend API
- `cloud-server/src/routes/` — API route handlers
- `cloud-server/src/db/` — Database schema, migrations, connection
- `cloud-server/src/db/schema.sql` — Base schema file
- `cloud-server/src/db/migrations/` — Drizzle migration files
- `cloud-server/src/db/migrate.ts` — Schema migration runner
- `cloud-server/src/db/migrate_extra.ts` — Extra migrations (enforcement, contracts, etc.)
- `cloud-server/src/middleware/` — Auth, permissions middleware
- `cloud-server/src/services/` — Business logic services

## Key Commands

```bash
# Backend dev
npm --prefix cloud-server run dev

# Backend build
npm --prefix cloud-server run build

# Run migrations
npm --prefix cloud-server run migrate

# Frontend dev
npm run dev

# Frontend build
npm run build
```

## Database

- PostgreSQL via Render (Singapore region)
- SSL required (`rejectUnauthorized: false`)
- Connection string stored in `DATABASE_URL` env var
- Migrations auto-run on server startup via `autoMigrate()`
- Admin user seeded automatically if users table is empty
- Default seed: username=`admin`, password set via hash
