# GBA-0002 Client v0 — Machine Parameters Used in Calculation

**Branch:** `client/v0`  
**Source data:** `fuse-tool/data/machines.json` (imported from MachinesOnSite)  
**Machines in UI:** 9 (see table below)

---

## Why these nine machines (and not eleven)

The dropdown shows **nine** machines because of a **hardcoded allow-list** (`GBA0002_CLIENT_MACHINE_IDS`), not because only nine rows have calculation data.

| Factor | What happened |
|--------|----------------|
| **Client scope** | When the GBA-0002 client deliverable was built, the client confirmed a **nine-machine sample** (PDF machine list names only **D10T**; nine slots total). |
| **How the nine were chosen** | IDs were taken from the **V2 completeness audit** on the full fleet: machines that pass `assessVehicleCompleteness()` — including valid **column Q** (`peakCurrentCutoffA` > 0), column **T**, alternator, cable block, system voltage, etc. Exactly **nine** of 37 pass. |
| **What v0 actually calculates with** | `calculateGba0002()` uses **column T** for cranking current, **not** Q. It does **not** require Q. |
| **Why 120T and 69T are missing** | Both have **T** + cable data (GBA-calculable), but they **fail the V2/Q gate** (120T: Q = `#VALUE!`; 69T: Q = 0). They were never added to the allow-list when the nine were frozen. |
| **16 V** | **Not** a filter. Sixteen volts is a **global constant** for max voltage drop (`battery V − 16`). It applies to all machines equally. |

**Eleven** machines have enough fields for v0’s **T-path** calculation; **nine** are **V2-complete** (stricter). The UI still shows nine until the allow-list is expanded and the client agrees — see [`GBA0002_SPEC_CLARIFICATION_MEMO.md`](./GBA0002_SPEC_CLARIFICATION_MEMO.md) §2.

Full history: [`DATA_REPORT.md`](./DATA_REPORT.md) §4.5.

---

This document lists **only** values that `calculateGba0002()` reads at runtime. Columns **Q**, **R**, and power-at-cutoff fields are **not** used by v0 but are shown in the reference section because the PDF spec refers to them.

**Related:** [`V0_CALCULATIONS.md`](./V0_CALCULATIONS.md) · [`GBA0002_SPEC_CLARIFICATION_MEMO.md`](./GBA0002_SPEC_CLARIFICATION_MEMO.md) · Excel export: [`V0_MACHINE_PARAMETERS.xlsx`](./V0_MACHINE_PARAMETERS.xlsx)

---

## User inputs (entered in the app)

| Parameter | PDF line | Type | Allowed / notes |
|-----------|----------|------|-----------------|
| Safety factor | 1 | User | 25% or 50% |
| Machine model | 2 | User | Dropdown — 9 machines below |
| Battery voltage during cranking | 3 | User | Volts (e.g. 20 V); must be > 0 and ≤ 36 |
| Operating temperature | 4 | User | °C — compared to cable/fuse limits |

---

## Fixed constants (not from MachinesOnSite)

| Parameter | PDF line | Value |
|-----------|----------|-------|
| Minimum starter voltage | 5 | **16 V** |
| Cranking time | 11 | **5 s** |

---

## Lookup tables (not per machine)

| Lookup | Source sheet | Used for |
|--------|--------------|----------|
| K-factor | Copper_K_Factor (match cable type col A → K col B) | Cable thermal withstand |
| Resistance Ω/km | Cable_Capacity (match size col F → R col H) | Max allowable cable length |
| Fuse ratings / withstand | Fuse_Library + MEGA32V | Fuse size and time-current check |

---

## Per-machine calculation parameters (9 machines in v0)

**MachinesOnSite columns used by v0:**

| JSON field | Excel col | Header |
|------------|-----------|--------|
| `peakCrankingCurrentA` | **T** | Peak continuous current during cranking (A) |
| `alternatorContinuousA` | **Z** | Alternator continuous current (A) |
| `cableType` | **AD** | Cable type |
| `cableSizeMm2` | **AE** | Cable size (mm²) |
| `cableContinuousA` | **AG** | Continuous current (A) |
| `operatingTempC` | **AF** | Operating temperature (°C) on record |

**Derived at runtime from lookups:**

| Field | Source |
|-------|--------|
| K-factor | Copper_K_Factor via `cableType` |
| Resistance Ω/km | Cable_Capacity via `cableSizeMm2` |

### Summary table

| Model | Mfr | Category | **I crank (T)** A | Alt (Z) A | Cable type (AD) | Size (AE) mm² | Cont. (AG) A | Site temp (AF) °C | K | R Ω/km |
|-------|-----|----------|-------------------|-----------|-----------------|---------------|--------------|-------------------|---|--------|
| D10T | Caterpillar | Dozer | **500** | 95 | Narva | 70 | 314 | 60 | 150 | 0.327 |
| B45E | Bell | Truck | **200** | 80 | OEM Wiring | 70 | 314 | 60 | 143 | 0.327 |
| D11 | Caterpillar | Dozer | **750** | 150 | Weldflex | 95 | 375 | 60 | 150 | 0.236 |
| 14M | Caterpillar | Grader | **350** | 150 | Weldflex | 70 | 314 | 60 | 150 | 0.327 |
| 155 / D155AX-6 | Komatsu | Dozer | **400** | 35 | weldflex | 95 | 375 | 60 | 150 | 0.236 |
| 375/ D375-5E0 | Komatsu | Dozer | **750** | 60 | Weldflex | 95 | 375 | 60 | 150 | 0.236 |
| 777 (07) | Caterpillar | Off-highway truck | **1200** | 150 | Weldflex | 95 | 375 | 40 | 150 | 0.236 |
| 793F | Caterpillar | Mining truck | **1200** | 150 | Weldflex | 120 | 440 | 40 | 150 | 0.188 |
| 992K | Caterpillar | Wheel loader | **950** | 150 | Weldflex | 120 | 440 | 60 | 150 | 0.188 |

**Bold I crank (T):** value actually used in v0 for thermal, voltage-drop length, and fuse withstand checks.

---

## Reference only — NOT used by v0 (PDF / data context)

These columns exist on MachinesOnSite and appear in the PDF, but **v0 does not read them**:

| JSON field | Excel col | Header | Notes |
|------------|-----------|--------|-------|
| `peakCurrentCutoffA` | **Q** | Peak current cut off (from power & eff) | PDF line 9 points here; **v0 uses T instead** |
| `inrushCurrentA` | **R** | Inrush current measured (A) | Not used in v0 |
| `powerAtCutoffKw` | **O** | Power at cut off voltage (kW) | Feeds Excel formula for Q only |
| `cutoffVoltageV` | **N** | Cut off voltage (V) | Feeds Excel formula for Q only |
| `efficiencyPercent` | **P** | Efficiency (%) | Feeds Excel formula for Q only |
| `cableLengthM` | **AI** | Cable length (m) | Not used in v0 (length is an output, not input) |
| `fuseInstalledA` | **L** | Fuse installed (A) | Display / legacy only |

### Q vs T vs R for the nine v0 machines

| Model | Q (cutoff calc) A | **T (used)** A | R (inrush) A | Q / T ratio |
|-------|-------------------|----------------|--------------|-------------|
| D10T | 1000 | **500** | 1200 | 2.00 |
| B45E | 500 | **200** | 330 | 2.50 |
| D11 | 1000 | **750** | 2000 | 1.33 |
| 14M | 812 | **350** | 450 | 2.32 |
| 155 / D155AX-6 | 1223 | **400** | 680 | 3.06 |
| 375/ D375-5E0 | 834 | **750** | 960 | 1.11 |
| 777 (07) | 1000 | **1200** | 2000 | 0.83 |
| 793F | 1000 | **1200** | 2000 | 0.83 |
| 992K | 1000 | **950** | 1380 | 1.05 |

See [`GBA0002_SPEC_CLARIFICATION_MEMO.md`](./GBA0002_SPEC_CLARIFICATION_MEMO.md) for why this matters.

---

## Full fleet — machines calculable if added to v0

Using the **same** field requirements as v0 (T + alternator + cable type/size), across all **37** MachinesOnSite records:

| Current path | Count | Machines |
|--------------|-------|----------|
| **T path** (as implemented) | **11** | Current 9 + `120T /EX 1200-7 / EX 2000-7` + `69T / ZX650H` |
| **Q path** (strict PDF line 9) | **9** | Current 9 only — excludes 120T (Q = `#VALUE!`) and 69T (Q = 0) |

**Additional machines unlocked by T vs Q:** 2 (`120T`, `69T`). Details in the clarification memo.

---

## Regenerating the Excel file

```bash
cd fuse-tool
python scripts/export_v0_parameters_xlsx.py
```

Output: `docs/V0_MACHINE_PARAMETERS.xlsx`
