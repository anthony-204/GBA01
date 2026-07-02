# Deploy to Vercel (GBA-0002 client branch)

## Prerequisites

- Branch **`feature/gba0002-client-deliverable`** pushed to GitHub (`anthony-204/GBA01`)
- Vercel account (free tier is fine): [https://vercel.com](https://vercel.com)

You do **not** need to merge to `main` first. Vercel can deploy any branch as a **preview** or set this branch as **production**.

---

## Option A — GitHub import (recommended)

1. Sign in at [vercel.com](https://vercel.com) with GitHub.
2. **Add New… → Project** → import **`anthony-204/GBA01`**.
3. **Configure Project:**

   | Setting | Value |
   |---------|--------|
   | **Framework Preset** | Next.js |
   | **Root Directory** | `fuse-tool/apps/web` |
   | **Install Command** | `cd ../.. && npm install` |
   | **Build Command** | `cd ../.. && npm run build` |
   | **Output Directory** | *(leave default — Next.js)* |

   These match `fuse-tool/apps/web/vercel.json`.

4. **Environment variables:** none required.
5. Click **Deploy** (first deploy uses the branch you select in step 6).
6. After the project exists: **Settings → Git → Production Branch**  
   - Leave as `main` for previews only, **or**  
   - Set to **`feature/gba0002-client-deliverable`** to make this branch the live URL.

7. **Deploy this branch now:**  
   **Deployments** → **Create Deployment** → branch **`feature/gba0002-client-deliverable`** → Deploy.

Every `git push` to that branch triggers a new deployment automatically.

---

## Option B — Vercel CLI (from your machine)

```powershell
cd "d:\GB Engineering"
git checkout feature/gba0002-client-deliverable
git pull origin feature/gba0002-client-deliverable

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
cd "d:\GB Engineering\fuse-tool"
npm install
npm run build
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you should see the **GBA-0002** simplified UI (9 machines).

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `Cannot find module @fuse-tool/engine` | Ensure **Install/Build** run from monorepo root (`cd ../..` in commands above). |
| Wrong UI (old V2 tabs) | Confirm Vercel deployed branch **`feature/gba0002-client-deliverable`**, not `main`. |
| Build fails on Node version | Set **Node.js 20.x** in Project → Settings → General. |

---

## What gets deployed

- Static Next.js app with **client-side** calculations
- Fleet data embedded from `data/bundle.json` at build time
- No API keys or backend required
