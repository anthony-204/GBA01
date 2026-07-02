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
| **`main`** | Full **Version 2 engineering tool** — 37-vehicle fleet, library + manual entry tabs, completeness gate, PDF outputs, 26+ engine tests, numeric-input fixes | Internal engineering |
| **`feature/excel-manual-presets`** | Manual-entry preset toggle — switch between app-default values and Excel column O presets | Engineering / QA |
| **`client/v0`** | **Barebones client build** — correct GBA-0002 calculations with minimal UI and code; no trace panels or validation layers | Baseline / teaching / audit |
| **`client/v1`** | **Client deliverable v1** — simplified GBA-0002 UI (9 machines, 4 inputs), full calculation trace, first client release | Client field trial |
| **`client/v2`** | **Client deliverable v2** — v1 + layered input/output validation guardrails per verification report; Simple/Advanced safety-factor modes | Client production |

### Which branch should I use?

- **Field technicians (client):** deploy `client/v2` (or `client/v1` if validation UI is not yet required).
- **Full fleet / manual what-if:** `main`.
- **Excel parity testing:** `feature/excel-manual-presets`.
- **Minimal reference implementation:** `client/v0`.

## Quick start

```bash
cd fuse-tool
npm install
npm run build
npm test --workspace=@fuse-tool/engine
npm run dev --workspace=@fuse-tool/web
```

Open [http://localhost:3000](http://localhost:3000).

### Deploy (client branches)

See `fuse-tool/docs/DEPLOY_VERCEL.md` — connect the Git branch (`client/v1` or `client/v2`) in the Vercel dashboard with root directory `fuse-tool/apps/web`.

## Client version history

### `client/v0` — barebones

Stripped from v1: core `calculateGba0002()` only, compact results panel, no line-item trace, no validation module. Documented in `fuse-tool/docs/CLIENT_V0.md`.

### `client/v1` — first client deliverable

Implements GBA-0002 revised PDF: 9-machine sample fleet, safety factor 25/50%, battery voltage during cranking, operating temperature. See `fuse-tool/docs/GBA0002_CLIENT_DELIVERABLE.md`.

### `client/v2` — validation guardrails

Addresses *Verification and Justification of Input Validation Guardrails*:

- Hard blocks for impossible inputs (negative voltage, >1.5× system class, cranking >30 s, etc.)
- Review warnings for abnormal but possible values
- Output sanity checks (e.g. derived cable length >100 m withholds Pass)
- Simple / Advanced safety-factor modes

Full traceability matrix: `fuse-tool/docs/CLIENT_V2_VALIDATION_GUARDRAILS.md`.

## Disclaimer

All branches produce **design aids**. Final cable and fuse selections require qualified engineering approval against AS/NZS standards and manufacturer datasheets.
