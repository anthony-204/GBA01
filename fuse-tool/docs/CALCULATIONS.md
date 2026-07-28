# GBA-0002 Calculation Reference

**App version:** 1.3  
**Engine:** `packages/engine/src/gba0002/calculate.ts`  
**Spec:** GBA-0002 Vehicle database (2).pdf

## User inputs

| Input | PDF | Notes |
|-------|-----|-------|
| Safety factor | 1 | 25% or 50% |
| Machine model | 2 | From MachinesOnSite |
| Battery voltage during cranking | 3 | Must be above 16 V |
| Operating temperature | 4 | Checked against cable and fuse ratings |

## Sizing current

From v1.1 onward, column **Q** (`peakCurrentCutoffA`) is used for cable thermal, max length, and fuse withstand.

| Column | Field | Role |
|--------|-------|------|
| Q | `peakCurrentCutoffA` | Design limit used for sizing |
| T | `peakCrankingCurrentA` | Measured cranking; must not exceed Q |
| R | `inrushCurrentA` | Not used in the client app |

If Q is missing in the database, the user may enter an approved value when prompted.

## Calculation flow

1. Validate inputs and load machine record.
2. Fail if battery voltage is below 16 V.
3. Fail if measured T exceeds Q.
4. Fail if measured cranking time X exceeds 5 s.
5. Look up cable resistance and K-factor.
6. Check existing cable thermal, continuous, and temperature limits.
7. Search Cable_Capacity for an upgrade if needed.
8. Compute max one-way cable length from voltage drop.
9. Select fuse from Fuse_Library using required fuse current and MEGA 32V withstand.
10. Return PASS or FAIL with cable and fuse recommendations.

## Key formulas

**Max voltage drop**

\[
V_{drop} = V_{bat} - 16\text{ V}
\]

**Max one-way cable length**

\[
L_{max} = \frac{V_{drop} \times 1000}{I_Q \times 2 \times R_{\Omega/km}}
\]

**Cable thermal withstand**

\[
t_{thermal} = \left(\frac{k \times S}{I_Q}\right)^2
\]

Must be at least 5 s.

**Required fuse current**

\[
I_{fuse,req} = I_{alt} \times \left(1 + \frac{SF}{100}\right)
\]

## Data sources

| Table | JSON file | Used for |
|-------|-----------|----------|
| MachinesOnSite | `machines.json` | Machine inputs |
| Cable_Capacity | `cable-capacity.json` | Resistance, upgrade options |
| Fuse_Library | `fuse-library.json` | Fuse part data |
| Copper_K_Factor | `copper-k-factors.json` | K lookup by cable type |
| MEGA 32V curve | `mega32v-curve.json` | Fuse withstand times |

Data is imported from `Fuse_GUI_APP.xlsx` using `npm run import:data`, then patched with `npm run patch:machines-v1.1`.
