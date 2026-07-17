---
name: database-recovery
description: Recover or create a new PostgreSQL database on Render, run migrations, and seed the admin user
license: MIT
metadata:
  audience: developers
---

# Database Recovery & Setup

Use when the Render PostgreSQL database is deleted, expired, or needs re-creation.

## Steps

### 1. Create a New PostgreSQL on Render

- Go to Render Dashboard → New → PostgreSQL
- Choose region: **Singapore (Southeast Asia)**
- Choose plan: Free or Basic
- Name: `b2b-law-db` (or similar)
- Click **Create Database**

### 2. Get Connection String

After creation, go to the database page → **Connections** → copy:
- **Internal Database URL** (for Render services)
- **External Database URL** (for local connections)

### 3. Update DATABASE_URL on Render Service

- Go to your service (`b2b-law`) → **Environment**
- Find `DATABASE_URL`, paste the **Internal** connection string
- Click **Save Changes** — service redeploys automatically

### 4. Run Migrations (if needed from local)

```bash
# Set the database URL
set DATABASE_URL=postgresql://user:pass@host/db

# Run base schema migrations
cd cloud-server
npx tsx src/db/migrate.ts

# Run extra migrations
npx tsx src/db/migrate_extra.ts
```

### 5. Seed Admin User

The server auto-seeds admin on startup (`seedSuperAdmin()`). To seed manually:

```sql
-- Insert owner company
INSERT INTO companies (id, name, email, is_verified, trial_expires_at)
VALUES ('00000000-0000-0000-0000-000000000000', 'الشركة المالكة للنظام', 'owner@b2blaw.local', TRUE, '2099-12-31 23:59:59+03')
ON CONFLICT (id) DO NOTHING;

-- Insert admin user (password hash for 'admin1390' via bcrypt)
INSERT INTO users (id, company_id, username, full_name, password_hash, role_key, is_active, must_change_password, recovery_email, created_at)
VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'admin', 'مدير النظام العام', '<bcrypt_hash>', 'admin', TRUE, TRUE, 'admin@b2blaw.local', NOW());
```

### 6. Apply Missing Tables (if schema.sql fails due to FK order)

Create dependent tables manually after base schema:

- `legal_engagements` (depends on companies, contracts, clients, users)
- `tasks_v2` (depends on legal_engagements)
- `task_audit_log`, `task_notifications` (depends on tasks_v2)
- `documents_v2` (depends on tasks_v2, legal_engagements)
- `agencies` (depends on clients)
- `time_logs` (depends on tasks_v2)
- `payment_schedules`, `payment_history` (depends on legal_engagements)
- `consultation_service_details`, `litigation_service_details`, `contract_service_details` (depends on legal_engagements)

### 7. Verify

```bash
# Test login
curl -X POST https://b2b-law-g2qr.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"<password>"}'

# Run audit
node cloud-server/full_audit.js
```

### Important Notes

- Render free PostgreSQL expires after 30 days — **data will be lost**
- Always maintain backups for production
- Upgrade to PostgreSQL **Pro** plan for automated daily backups
