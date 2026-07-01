# Manual Entry Excel Presets — Branch Documentation

**Branch:** `feature/excel-manual-presets`  
**Workbook authority:** `Resources/Tool/APP_Fuse/Fuse_GUI_APP.xlsx`  
**Cross-check:** `Resources/Tool/GBA-RMIT-0002 Vehicle database.xlsx`

---

## Summary

This branch adds a **Field preset** switch on the Manual entry tab:

| Preset | Source | Purpose |
|--------|--------|---------|
| **App default (B45E-style)** | Original web app | 200 A cranking, 70 mm², 80 A alternator — aligned with complete fleet example B45E |
| **Excel column O** | `User Input` sheet columns O–Q | Manual-entry block titled *“When information about the machine is unavailable”* |

Users can switch presets to load Excel-aligned defaults, then edit fields before calculating.

---

## Workbook comparison

Both Excel files share the same sheet structure and **identical manual-entry column O/Q values** for calculation inputs.

| Item | Fuse_GUI_APP.xlsx | GBA-RMIT-0002 Vehicle database.xlsx |
|------|-------------------|-------------------------------------|
| Manual column O/Q inputs | Same (Q5=5, Q8=100, Q11=1000, Q17=120, …) | Same |
| Library model in G5 | D10T / B45E (varies by column) | 637G / B45E |
| MachinesOnSite rows | Same fleet import | Same |

**Decision:** Use **`Fuse_GUI_APP.xlsx`** as the authoritative source (already used by `scripts/import_from_xlsx.py`). The RMIT-named file is a snapshot with the same calculation logic; only the selected library demo model in G5 differs.

---

## Excel column O → app field mapping

| Excel cell | Label (column P) | Value | App field |
|------------|------------------|-------|-----------|
| Q3 | System Voltage (V) | 16 | `minBatteryVoltageV` |
| Q4 | Starter circuit | 24 | `electricalSystemV` |
| Q5 | Cranking time (s) | 5 | `crankingTimeRequiredS` |
| Q8 | Alternator Continuous Current (A) | 100 | `alternatorContinuousA` |
| Q11 | Starter Motor Cranking/Peak Current (A) | 1000 | `peakCrankingCurrentA` |
| Q14 | Cable Type | Two Single Core | `cableType` |
| Q17 | Cable Size (mm2) | 120 | `cableSizeMm2` |
| Q18 | Operating Temperature (°C) | 90 | `operatingTempC` |
| Q19 | In rush current noticed/ allowed (A) | 1000 | `peakCurrentCutoffA` |
| Q20 | Voltage drop (%) | 3 | `voltageDropLimitPercent` |
| Q21 | Safety current factor (%) | **125** | `safetyFactorPercent: 25` (see note) |
| Q24 | Cable continuous (computed) | 389 | `cableContinuousA` |
| Q31 | Cable length for 3% drop (computed) | 3.3 | `cableLengthM` |

**Not mapped one-to-one:** Q15 Insulation, Q16 Location — engine uses combined `cableType` + optional `kFactorCopper` override (143 for X-90 XLPE).

### Safety factor note

- Excel **library column G3** uses `25` with formula `(G3+100)/100 × alternator` → **1.25× alternator**.
- Excel **manual column Q21** uses `125` with formula `(Q21/100) × Q24` → **1.25× cable continuous** (different base).

The engine follows the **corrected G39 library formula** (alternator-based). The Excel preset stores `safetyFactorPercent: 25` so engine output matches G39, not Q33.

---

## Calculation verification

Verified against `Fuse_GUI_APP.xlsx` (computed values, `data_only=True`):

| Check | Excel | Engine | Match? |
|-------|-------|--------|--------|
| Cable continuous 120 mm² | Q24 = 389 A | Preset + check pass | Yes |
| K × S / √t peak (K=143, S=120, t=5) | Q26 = #N/A (lookup fail) | 7674 A | Engine fixes lookup via K override |
| Fuse target (alternator path) | Q33 = 486.25 A (cable×1.25) | 125 A (100×1.25) | **Intentional difference** |
| Fuse target B45E library G39 | 100 A | 100 A | Yes |
| Voltage drop @ 1000 A, 3.3 m | > 3% | ~5.17% warning | Yes |
| Cable continuous @ 100 A alt | Q25 = YES | pass | Yes |
| Cranking 1000 A vs limit | pass | pass | Yes |

Run automated checks:

```bash
cd fuse-tool
npm test
```

New suite: `packages/engine/tests/manualEntryPresets.test.ts`

---

## Code changes (this branch)

| File | Change |
|------|--------|
| `packages/engine/src/manualEntryPresets.ts` | Preset definitions + Excel expected constants |
| `packages/engine/src/index.ts` | Export presets |
| `packages/engine/tests/manualEntryPresets.test.ts` | Verification tests |
| `apps/web/src/components/ManualEntryForm.tsx` | Preset selector UI |
| `apps/web/src/components/Calculator.tsx` | Preset state |
| `apps/web/src/components/NumericInput.tsx` | *(from main)* text-based numeric fields |

---

## Known Excel issues (unchanged in engine)

1. **G13 / L13** uses `15/1000` s in cable peak — engine uses real cranking time.
2. **G31** compared cutoff to capability — engine compares cranking to capability.
3. **Q28** K-factor VLOOKUP on `"Two Single Core"` returns #N/A — preset sets `kFactorCopper: 143`.
4. **Q33** fuse sizing uses cable continuous, not alternator — engine uses alternator (G39).

---

## UI usage

1. Open **Manual entry** tab.
2. Click **App default** or **Excel column O**.
3. Fields reload from preset; edit as needed.
4. **Calculate recommendation**.

Clearing numeric fields no longer forces `0` (fixed on `main` in `NumericInput`).

---

## Follow-up (Version 3)

- Import manual preset defaults from Excel via script (avoid hard-coding Q values).
- Support Q15/Q16 insulation/location as separate fields.
- Optional toggle: alternator-based vs cable-based fuse target (Excel Q33 path) for audit comparison only.
