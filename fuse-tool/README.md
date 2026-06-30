# Fuse Tool — Phase 1 Implementation

Fleet **fuse and cable protection calculator** for GB Engineering. This package replaces the legacy Excel workbook and incomplete MATLAB prototype with a **tested TypeScript engine**, **normalized JSON data**, and a **mobile-friendly web UI**.

## What was completed (Phase 1)

| Step | Status | Location |
|------|--------|----------|
| Excel → JSON data migration | Done | `scripts/import_from_xlsx.py`, `data/` |
| Calculation engine (corrected logic) | Done | `packages/engine/` |
| Automated tests (Vitest) | Done | `packages/engine/tests/` |
| Web UI (model picker + results) | Done | `apps/web/` |
| Calculation specification | Done | `docs/CALCULATION_SPEC.md` |
| Standards & formulas | Done | `docs/STANDARDS_AND_CALCULATIONS.md` |
| Legacy bug register | Done | `docs/LEGACY_BUGS_FIXED.md` |
| Usage guide | Done | `docs/USAGE.md` |
| Data migration guide | Done | `docs/DATA_MIGRATION.md` |
| Phase 1 completion log | Done | `docs/PHASE1_COMPLETED.md` |

## Quick start

### Prerequisites

- **Node.js 18+** (LTS recommended)
- **Python 3.10+** with `openpyxl` (for data re-import only)

```bash
pip install openpyxl
```

### Install and test

```bash
cd fuse-tool
npm install
npm run import:data    # Regenerate JSON from Excel (optional if data/ exists)
npm test               # Run engine unit tests (12 tests)
```

### Run web app (development)

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Select a machine model to see fuse/cable checks.

### Build for production

```bash
npm run build
npm run start -w @fuse-tool/web
```

Deploy `apps/web` to Vercel or Netlify (Next.js).

## Project structure

```
fuse-tool/
├── apps/web/              # Next.js + Tailwind UI
├── packages/engine/       # Pure TypeScript calculation engine
├── data/                  # JSON exported from Fuse_GUI_APP.xlsx
├── scripts/               # import_from_xlsx.py
└── docs/                  # Specifications and guides
```

## Using the engine programmatically

```typescript
import { recommend, loadDatabase } from "@fuse-tool/engine";
import bundle from "./data/bundle.json";

const db = loadDatabase(bundle);
const result = recommend(db, { modelId: "B45E", safetyFactorPercent: 25 });

console.log(result.summary.recommendedAction);
console.log(result.checks);
console.log(result.fuse.selectedRatingA);
```

## Legacy corrections

This implementation **fixes known Excel and MATLAB bugs** (see `docs/LEGACY_BUGS_FIXED.md`):

- Cable peak formula uses **cranking time**, not `G13 = 15/1000` seconds
- Cable peak compares **cranking current** to capability, not cutoff current
- Battery check compares **voltage**, not manufacturer name
- Full machine columns (Z, AE, AG) — not truncated A:X range
- K-factor from lookup table, not hard-coded 143

## Next steps (Phase 2+)

- Manual entry mode (Excel columns J/L)
- Missing-data workflow (columns O/Q)
- Parallel fuse logic
- Admin UI for updating `machines.json`
- PDF export of results
- Field validation with technicians

## Disclaimer

Tool outputs are **engineering recommendations** based on imported fleet data and documented assumptions. Always verify on site before installing fuses or changing cables.

## Related documents

- [Analysis & full project plan](../docs/FUSE_TOOL_ANALYSIS_AND_IMPLEMENTATION_PLAN.md) (repo root `docs/`)
- [Calculation spec](./docs/CALCULATION_SPEC.md)
- [Usage guide](./docs/USAGE.md)
