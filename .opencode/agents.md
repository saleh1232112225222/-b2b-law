# B2B-LAW Web Application - Project Context

## Project Location
- Local path: `g:\w2w`
- GitHub repo: `saleh1232112225222/-b2b-law`
- Repo name stays as-is (only development, no rename)

## Deployed Services
- **Frontend (Vue 3 / Vite)**: Netlify → `https://b2b-law.netlify.app`
- **Backend API (Express / TypeScript)**: Render → `https://b2b-law-g2qr.onrender.com`
- **Database**: PostgreSQL on Render

## Environment Files
- Frontend env: `src/renderer/.env` → `VITE_API_BASE_URL=https://b2b-law-g2qr.onrender.com/api`
- Server env: `cloud-server/.env` → DATABASE_URL, JWT_SECRET, etc.

## Key Config
- vite.config.ts: root = `src/renderer`, outDir = `dist/web`
- Render settings: Root = `cloud-server`, Build = `npm install && npm run build`, Start = `node dist/index.js`
- Netlify: Publish dir = `dist/web`, Build cmd = `npm run build`

## Deployment Workflow
1. Edit code locally at `g:\w2w`
2. `git add . && git commit -m "message" && git push`
3. Render auto-deploys backend (or Manual Deploy)
4. Netlify auto-deploys frontend (or Trigger Deploy)

## Project Structure
- Monorepo: Frontend (Vite + Vue 3 + Vuetify + Pinia) + Backend (Express + PostgreSQL)
- Dual-mode API: Cloud (Axios) / Electron (IPC) via ApiAdapter.ts
- Multi-tenant: all tables have `company_id`

## MCP Servers (مسجلة في opencode.json)

### Browser MCP
- **الغرض**: تحكم بالمتصفح (تسجيل الدخول، تعبئة نماذج، اختبارات E2E)
- **الإعداد المطلوب**: ثبّت إضافة المتصفح من https://browsermcp.io/install (Chrome/Edge)
- **الاستخدام**: `browsermcp_*` tools متاحة تلقائياً

### Figma MCP (Remote - مفضل)
- **الغرض**: جلب معلومات التصميم من Figma أثناء البرمجة
- **الإعداد**: مكون كـ Remote MCP (`https://mcp.figma.com/mcp`) مع OAuth
- **الاستخدام**: أول استخدام راح يطلب تسجيل الدخول عبر Figma OAuth
- إذا ما اشتغل Remote MCP، ارجع الخيار اليدوي أدناه:
  - **بديل يدوي (Desktop MCP)**:
    1. افتح **Figma Desktop** ← افتح ملف تصميم
    2. اضغط `Shift + D` لدخول **Dev Mode**
    3. في اللوحة اليمنى (Inspect panel)، ابحث عن **MCP server**
    4. اضغط **Enable desktop MCP server**
    5. السيرفر يشتغل على `http://127.0.0.1:3845/mcp`

### TestSprite (موجود مسبقاً)
- اختبارات E2E آلية

## Tech Stack
- Frontend: Vue 3, TypeScript, Vuetify 3, Pinia, Vue Router, Chart.js, Axios, Lucide
- Backend: Node.js, Express, TypeScript, PostgreSQL (pg), JWT, bcryptjs, Zod, Nodemailer
- Tools: Vite, ESLint, Prettier, vue-tsc, Docker (Node 20 Alpine)
