# Fuse Tool — GB Auto Fuse & Cable Protection

Fleet **fuse and cable protection calculator** for GB Engineering (GBA-0002). Replaces the legacy Excel workbook with a **tested TypeScript engine**, **normalized JSON vehicle library**, and a **mobile-friendly web UI**.

> **New user?** Start with **[docs/USER_GUIDE.md](./docs/USER_GUIDE.md)** — inputs, outputs, and glossary.

## Version 2 (current)

Version 2 completes the **simple web app** scope from the GBA-0002 vehicle database specification.

| Feature | Status |
|---------|--------|
| Vehicle library with completeness labels | Done |
| Full recommendations only for **complete** vehicles | Done |
| Incomplete vehicles visible but **blocked** from unsafe partial results | Done |
| **Manual entry** mode with input validation | Done |
| PDF-required cable & fuse output panel | Done |
| Pass / warning / fail / unavailable status cards | Done |
| Expandable calculation details | Done |
| Engineering disclaimer | Done |
| Engine unit tests (completeness, validation, calculations) | Done |

### Complete vs incomplete vehicles

A library vehicle must have all required fields before cable/fuse recommendations run:

- Peak cranking current, alternator continuous current
- Cable type, size, continuous rating, length, operating temperature
- Peak current cutoff, electrical system voltage
- Cranking time (measured or required)

Incomplete vehicles appear in the model list with **Incomplete data** or **Engineering data required** badges. Missing fields are listed; calculations are blocked until data is complete or the user switches to **Manual entry**.

### Manual entry mode

Enter parameters directly when a vehicle is not in the library or data is incomplete:

- Safety factor, cranking time, system voltage, cranking current, alternator current
- Cable type, size, continuous rating, length, operating temperature
- Peak current cutoff, voltage drop limit
- Optional: K-factor override, battery voltage checks

Inputs are validated before any calculation runs.

### Calculation checks (V2)

| Check | Notes |
|-------|--------|
| Starter cranking current limit | When peak cranking and cutoff available |
| Battery cranking voltage | When measured voltage and minimum available |
| Battery cranking time | When measured and allowed time available |
| Cable continuous current | Alternator vs cable rating |
| Cable inrush / short-time (adiabatic) | K × size / √t vs cranking current |
| Voltage drop | Configurable limit (default from `constants.json`) |
| Fuse sizing | Safety factor on alternator continuous |
| Fuse MEGA32V withstand | Graph lookup when data available |
| I²t required | Supplementary thermal check |
| Fuse protects cable | Selected fuse ≤ cable continuous rating |

### Assumptions and limitations

Documented in `data/constants.json` and surfaced in calculation `derived.assumptionsUsed`:

- Default safety factor **25%**, voltage drop limit **3%**, minimum cranking time **5 s**
- Default peak cranking limit **1000 A** used only when a vehicle has no cutoff value
- K-factor from **Copper_K_Factor** lookup by cable type, or manual override — not hard-coded in logic
- Fuse escalation follows MEGA32V graph withstand; I²t is supplementary
- Cable peak uses **K × A / √t** (adiabatic); the PDF formula layout should be verified with engineering
- **Not** a substitute for qualified engineering sign-off — see disclaimer in the app

### Version 3 (planned)

- Admin UI to edit `machines.json` and completeness workflow
- Parallel fuse logic
- PDF export of results
- Field-level technician validation workflow
- Enhanced derating and installation-method rules

## Quick start

### Prerequisites

- **Node.js 18+**
- **Python 3.10+** with `openpyxl` (data re-import only)

```bash
pip install openpyxl
```

### Install and test

```bash
cd fuse-tool
npm install
npm run import:data    # Optional — regenerate JSON from Excel
npm test               # Engine unit tests (26 tests)
```

### Run web app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Use **Vehicle library** or **Manual entry** tabs.

### Production build

```bash
npm run build
npm run start -w @fuse-tool/web
```

Deploy `apps/web` to Vercel or Netlify.

## Project structure

```
fuse-tool/
├── apps/web/              # Next.js + Tailwind UI
├── packages/engine/       # @fuse-tool/engine — pure TypeScript calculations
├── data/                  # JSON from Fuse_GUI_APP.xlsx
├── scripts/               # import_from_xlsx.py
└── docs/                  # Specs, user guide, calculation docs
```

## Engine API (V2)

```typescript
import { calculate, recommend, listVehiclesWithCompleteness, loadDatabase } from "@fuse-tool/engine";
import bundle from "./data/bundle.json";

const db = loadDatabase(bundle);

// Library mode — blocked if vehicle incomplete
const library = calculate(db, { mode: "library", modelId: "B45E" });
console.log(library.blocked, library.outputs);

// Manual entry
const manual = calculate(db, {
  mode: "manual",
  inputs: {
    safetyFactorPercent: 25,
    crankingTimeRequiredS: 5,
    electricalSystemV: 24,
    voltageDropLimitPercent: 3,
    peakCrankingCurrentA: 200,
    alternatorContinuousA: 80,
    cableType: "Thermosetting 90°C XLPE EDR",
    cableSizeMm2: 70,
    cableContinuousA: 314,
    cableLengthM: 6,
    operatingTempC: 60,
    peakCurrentCutoffA: 500,
  },
});

// Legacy wrapper (library only)
const result = recommend(db, { modelId: "B45E" });
```

## Legacy corrections

Fixes vs Excel/MATLAB documented in `docs/LEGACY_BUGS_FIXED.md` and `implementationNotes` on each result.

## Disclaimer

This tool is a **design aid**. Outputs depend on imported fleet data and documented assumptions. **Final fuse and cable selections require engineering approval** before installation.

## Related documents

- [User guide](./docs/USER_GUIDE.md)
- [Engineering brief (LaTeX)](./docs/engineering/GBA_FUSE_TOOL_ENGINEERING_BRIEF.tex) — equations, architecture, client communication
- [Calculation spec](./docs/CALCULATION_SPEC.md)
- [Standards & formulas](./docs/STANDARDS_AND_CALCULATIONS.md)
- [Full project plan](../docs/FUSE_TOOL_ANALYSIS_AND_IMPLEMENTATION_PLAN.md)
