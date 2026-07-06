# GBA-0002 Client Deliverable

**Branch:** `feature/gba0002-client-deliverable`  
**Specification:** `GBA-0002 Vehicle database (1).pdf` (revised client scope)

This branch is the **simplified client deliverable** — a condensed app scoped to the nine confirmed fleet machines and the revised PDF calculation flow.

---

## Scope vs Version 2

| Aspect | Version 2 (main) | GBA-0002 client (this branch) |
|--------|------------------|-------------------------------|
| Machines | 37 in library | **9 client sample only** |
| User inputs | Library + full manual entry | **4 inputs** per PDF |
| Voltage drop | Percentage limit | **Volts** (battery V − 16 V) |
| Cable logic | Continuous + peak checks | **Thermal withstand** (k×S/I)² ≥ 5 s first |
| Cable output | Fixed from record | **No change / upgrade / unsuitable** |
| Fuse logic | Alternator × safety → closest | **Cable ≥ fuse ≥ alternator** + withstand |
| UI | Multi-tab, all checks | **Simplified results panel** |

---

## Client machine sample (9)

| # | Model ID |
|---|----------|
| 1 | D10T |
| 2 | B45E |
| 3 | D11 |
| 4 | 14M |
| 5 | 155 / D155AX-6 |
| 6 | 375/ D375-5E0 |
| 7 | 777 (07) |
| 8 | 793F |
| 9 | 992K |

Data sourced from `MachinesOnSite` in `Fuse_GUI_APP.xlsx` (complete records only).

---

## User inputs (PDF)

| # | Input | UI control |
|---|-------|------------|
| 1 | Safety factor (%) | 25 or 50 |
| 2 | Machine make/model | Dropdown (9 machines) |
| 3 | Battery voltage during cranking (V) | Numeric |
| 4 | Operating temperature (°C) | Numeric |

---

## Constants (PDF)

| Item | Value |
|------|-------|
| Minimum starter voltage | 16 V |
| Cranking time | 5 s |

---

## Calculation flow

```
User inputs + machine lookup (MachinesOnSite)
    ↓
Max voltage drop (V) = battery V during cranking − 16
    ↓
Lookup: cable size (AE), resistance (Cable_Capacity), cranking (Q), alternator (Z), cable type (AD), **k-factor by cable type** (Copper_k_factor A:B — not machine model)
    ↓
Thermal withstand time = (k × S / I)²  ⟺  I ≤ k × S / √(cranking time)  — see `docs/GBA0002_ENGINEERING_THEORY.md`
    ↓
Pass? ──YES──► Keep existing cable → rating from AG → max length → fuse select
    │
    NO ──► Search Cable_Capacity for upgrade
              ├── Found → upgraded cable
              └── Not found → "existing cable is not suitable..."
    ↓
Fuse: alternator ≤ fuse ≤ cable rating AND MEGA32V withstand ≥ 5 s at inrush
    ↓
Outputs: cable type/size, rating, max length, temp; fuse size, make/part, temp
```

---

## Key formulas

| Line | Formula |
|------|---------|
| 6 | ΔV_max = V_battery_cranking − 16 |
| 14 | t_thermal = (k × S / I)² |
| 15 | Pass if t_thermal ≥ 5 s |
| 18 | L_max = (ΔV_max × 1000) / (I × 2 × R_Ω/km) |
| 20 | Cable rating ≥ fuse ≥ alternator; withstand ≥ 5 s |

---

## Outputs (PDF results 16–22)

Displayed in the **Results (GBA-0002)** panel:

- Cable type & size (no change / upgrade / unsuitable message)
- Cable current rating (A)
- Maximum allowable one-way cable length (m)
- Cable operating temperature range
- Suggested fuse size (A)
- Fuse make & part number
- Fuse operating temperature range

Expandable **Calculation trace** shows line items 5–22 with pass/fail status.

---

## Code layout

```
packages/engine/src/gba0002/
  constants.ts    — 9 machine IDs, 16 V, 5 s
  types.ts        — Gba0002Result, inputs
  calculate.ts    — calculateGba0002()
  index.ts

apps/web/src/components/Gba0002Calculator.tsx

packages/engine/tests/gba0002.test.ts
```

Entry point: `calculateGba0002(db, inputs)` exported from `@fuse-tool/engine`.

---

## Verification

```bash
cd fuse-tool
npm test        # includes gba0002.test.ts (10 tests)
npm run build
npm run dev
```

### Verified scenarios

- **B45E:** Thermal pass → no cable change; fuse within 80–314 A
- **D10T:** Full pipeline (PDF sample machine #1)
- **Formulas:** (k×S/I)², max length from voltage drop in volts
- **Validation:** Unknown machine blocked; zero voltage drop when battery = 16 V

---

## Not in scope (this branch)

- Parallel fuse logic (PDF §14)
- Full 37-vehicle library UI
- Manual entry of all cable fields
- Version 2 completeness gate / manual entry presets

These remain on `main` / `feature/excel-manual-presets` for engineering use.

---

## Workbook authority

Calculations verified against **`Resources/Tool/APP_Fuse/Fuse_GUI_APP.xlsx`**.  
`GBA-RMIT-0002 Vehicle database.xlsx` shares the same sheet structure; client deliverable uses the APP_Fuse fleet import already in `data/bundle.json`.

---

## Disclaimer

Design aid only — engineering approval required before installation.
