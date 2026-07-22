# Deploy to Vercel (GBA-0002 client app)

## Prerequisites

- A copy of this project with the client app on branch **`v1_testing`** or **`client/v1`**
- Vercel account (free tier is fine): [https://vercel.com](https://vercel.com)

You do **not** need a backend server. The app is a static Next.js build with client-side calculations and embedded fleet data.

---

## Option A -- Vercel Git import (recommended)

1. Sign in at [vercel.com](https://vercel.com).
2. **Add New -> Project** and import your Git repository.
3. **Configure Project:**

   | Setting | Value |
   |---------|--------|
   | **Framework Preset** | Next.js |
   | **Root Directory** | `fuse-tool/apps/web` |
   | **Install Command** | `cd ../.. && npm install` |
   | **Build Command** | `cd ../.. && npm run build` |
   | **Output Directory** | *(leave default -- Next.js)* |

   These match `fuse-tool/apps/web/vercel.json`.

4. **Environment variables:** none required.
5. Click **Deploy** (first deploy uses the branch you select).
6. After the project exists: **Settings -> Git -> Production Branch**  
   Set to **`v1_testing`** (or your active client branch).

7. **Deploy a branch manually:**  
   **Deployments** -> **Create Deployment** -> select branch -> Deploy.

Every push to the production branch triggers a new deployment automatically.

---

## Option B -- Vercel CLI (from your machine)

```powershell
cd fuse-tool\apps\web
npx vercel login
npx vercel link
npx vercel --prod
```

- First `vercel login` opens a browser (one-time).
- `vercel link` connects this folder to a Vercel project.
- Omit `--prod` for a preview URL only; use `--prod` for the production domain.

---

## Local check before deploy

```powershell
cd fuse-tool
npm install
npm run patch:machines-v1.1
npm run build
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) -- you should see the GB Auto Fuse & Cable Protection Tool.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `Cannot find module @fuse-tool/engine` | Ensure **Install/Build** run from monorepo root (`cd ../..` in commands above). |
| Wrong UI or old version | Confirm Vercel deployed the correct client branch (`v1_testing` or `client/v1`). |
| Build fails on Node version | Set **Node.js 20.x** in Project -> Settings -> General. |

---

## What gets deployed

- Static Next.js app with **client-side** calculations
- Fleet data embedded from `data/bundle.json` at build time
- No API keys or backend required
