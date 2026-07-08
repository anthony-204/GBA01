# GB Auto — Fuse & Cable Protection Tool

Monorepo for the GB Auto fuse and cable protection engineering tools, derived from the `Fuse_GUI_APP.xlsx` workbook and GBA-0002 client specification.

**GitHub:** [anthony-204/GBA01](https://github.com/anthony-204/GBA01)

## Repository layout

```
GB Engineering/
├── README.md                 ← this file (branch guide)
├── fuse-tool/                ← application monorepo
│   ├── apps/web/             ← Next.js field UI (Vercel-ready)
│   ├── packages/engine/      ← calculation engine + tests
│   ├── data/bundle.json      ← normalized fleet / library data
│   └── docs/                 ← specifications, validation evidence, deploy notes
├── Resources/Tool/           ← authoritative Excel workbook
└── docs/                     ← project-level analysis and plans
```

## Branches

| Branch | Purpose | Audience |
|--------|---------|----------|
| **`main`** | Full **Version 2 engineering tool** — 37-vehicle fleet, library + manual entry, completeness gate | Internal engineering |
| **`feature/excel-manual-presets`** | Manual-entry Excel preset toggle | Engineering / QA |
| **`client/v1`** | **Active client prototype** (app v1.1) — GBA-0002, 9 machines, 4 inputs, v1.1 checks, column Q sizing | Client / field trial |
| **`client/old1`** | *Deprecated* — former `client/v1` (trace UI deliverable) | Archive |
| **`client/old2`** | *Deprecated* — former `client/v2` (validation guardrails) | Archive |

`client/v0` has been **renamed to `client/v1`** (July 2026). Deploy the client tool from **`client/v1`**.

### Which branch should I use?

- **Current GBA-0002 client prototype (v1.1):** `client/v1`
- **Full fleet / manual what-if:** `main`
- **Legacy trace UI or validation builds:** `client/old1`, `client/old2`

## Quick start (`client/v1`)

```bash
cd fuse-tool
npm install
npm run patch:machines-v1.1
npm run build
npm test --workspace=@fuse-tool/engine -- gba0002
npm run dev --workspace=@fuse-tool/web
```

Open [http://localhost:3000](http://localhost:3000).

### Deploy (Vercel)

See `fuse-tool/docs/DEPLOY_VERCEL.md` — connect branch **`client/v1`**, root directory `fuse-tool/apps/web`.

## Client app version history

See `fuse-tool/docs/CHANGELOG.md`.

| App version | Date | Branch | Highlights |
|-------------|------|--------|------------|
| **1.1** | 14/07/2026 | `client/v1` | Column Q sizing; battery/starter/time checks; manufacturer; upgrade fix |
| **1.0** | June 2026 | `client/v0` (renamed) | Initial nine-machine prototype |

## Disclaimer

All branches produce **design aids**. Final cable and fuse selections require qualified engineering approval against AS/NZS standards and manufacturer datasheets.
