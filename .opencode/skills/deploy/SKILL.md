---
name: deploy
description: Deploy frontend to Netlify and backend to Render via GitHub Actions CI/CD
license: MIT
metadata:
  audience: developers
---

# Deploy B2B-LAW

## Automated Deployment (CI/CD)

Push to `main` branch triggers GitHub Actions workflow (`.github/workflows/ci-cd.yml`):

1. **Code Quality** — lint, typecheck, test
2. **Build** — both frontend + backend
3. **Docker Build & Push** — builds `cloud-server/Dockerfile` → `ghcr.io`
4. **Deploy to Netlify** — deploys frontend to `b2b-law.netlify.app`
5. **Deploy to Render** — triggers Render deploy hook

```bash
git add .
git commit -m "description"
git push origin main
```

## Manual Deploy — Frontend

```bash
# Build frontend
npm run build

# Deploy to Netlify
npx netlify-cli deploy --dir=dist/web --prod
```

## Manual Deploy — Backend (Render)

From Render Dashboard:
1. Go to your service → **Manual Deploy**
2. Select **Deploy latest image**

Or trigger the deploy hook:
```bash
curl -X POST <RENDER_DEPLOY_HOOK_URL>
```

## Environment Variables (Render)

Key variables to set in service → Environment:

| Key | Description |
|-----|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | JWT signing secret |
| `FRONTEND_URL` | `https://b2b-law.netlify.app` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `GOOGLE_CALLBACK_URL` | `https://b2b-law-g2qr.onrender.com/api/auth/google/callback` |
| `SMTP_HOST/PORT/USER/PASS` | Email settings |
| `NODE_ENV` | `production` |
| `PORT` | `8080` |

## Check Deployment Status

- GitHub: https://github.com/saleh1232112225222/-b2b-law/actions
- Render: https://dashboard.render.com (service: b2b-law)
- Netlify: https://app.netlify.com/sites/b2b-law
