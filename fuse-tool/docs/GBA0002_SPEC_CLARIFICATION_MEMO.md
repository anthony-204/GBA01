# GBA-0002 Fuse Tool — Specification Clarification Memo

**To:** Client / specification author (GBA-0002)  
**From:** GB Engineering — Fuse Tool development team  
**Date:** June 2026  
**Re:** Items requiring confirmation before finalising the client prototype (`client/v0`)

**References:**

- GBA-0002 Vehicle database (2).pdf — calculation guide  
- MachinesOnSite data (Excel / CSV export)  
- Implemented prototype: `client/v0` branch

**Supporting documents:**

- [`V0_MACHINE_PARAMETERS.md`](./V0_MACHINE_PARAMETERS.md) — machine data used in v0  
- [`V0_CALCULATIONS.md`](./V0_CALCULATIONS.md) — full formula reference  
- [`V0_MACHINE_PARAMETERS.xlsx`](./V0_MACHINE_PARAMETERS.xlsx) — spreadsheet overview

---

## Purpose

We have implemented the GBA-0002 prototype per your written specification. During validation against the PDF, the MachinesOnSite workbook, and electrical engineering practice, we identified **ambiguities, inconsistencies, and implementation choices** that need your written confirmation.

This memo is intended to make those gaps explicit so you can correct the specification, confirm our interpretation, or accept documented deviations.

---

## Executive summary — decisions needed

| # | Topic | PDF / data says | We implemented | **Your decision needed** |
|---|--------|-----------------|----------------|--------------------------|
| 1 | Starter current for cable/fuse | Column **Q** (line 9) | Column **T** | Confirm Q, T, or R for each check |
| 2 | Meaning of “inrush worst case” | Label on line 9 | Not used | Map to Q, T, or R explicitly |
| 3 | Fuse withstand current | Example uses 1000 A | Same as cable current (T) | Confirm current for withstand |
| 4 | Minimum starter voltage | 16 V constant (line 5) | 16 V fixed | Confirm vs per-machine cutoff (col N) |
| 5 | Additional sample machines | 9 listed | 11 calculable on T path | Expand list to include 120T, 69T? |

---

## 1. Starter current — columns Q, T, and R (CRITICAL)

### 1.1 What the PDF says

**Line item 9:** “Starter cranking current (A) (inrush during worse case)”  
→ Look up machine in MachinesOnSite column **D**, read column **Q**.

Column **Q** header: *“Peak current cut off(A) from power & eff calcukatuiion”*.

### 1.2 What columns Q, T, and R actually contain

| Column | Header | Nature | D10T example |
|--------|--------|--------|--------------|
| **Q** | Peak current cut off (power & eff) | **Calculated** from cols N, O, P | **1000 A** |
| **T** | Peak continuous current during cranking | **Event current** (5 s window) | **500 A** |
| **R** | Inrush current measured | **Measured transient peak** | **1200 A** |

### 1.3 How column Q is calculated in Excel

Q is **not measured**. It is derived from:

\[
I_Q = \frac{\text{Power at cutoff (kW)} \times 1000}{\text{Efficiency} \times \text{Cutoff voltage (V)}}
\]

**D10T check:** \(9 \times 1000 / (0.5625 \times 16) = 1000\) A ✓

This is the electrical current implied if the starter delivers the stated **mechanical power at cutoff voltage** at the stated **efficiency**. We refer to this as a **design limit**, not the measured cranking waveform.

### 1.4 The inconsistency in the PDF

- Line 9 **label** says “**inrush** during worse case” → suggests column **R** (measured inrush).  
- Line 9 **column** points to **Q** → a power/efficiency calculation, not inrush.  
- Line 14–15 thermal formula uses line 9 as \(I\) → affects cable sizing.  
- Line 20 fuse example: “withstand **1000 A** (starter motor inrush)” → matches **Q** for D10T, not T (500 A) or R (1200 A).

**Three different numbers exist on most machines.** They are not interchangeable.

### 1.5 What we implemented (v0)

We use column **T** (`peakCrankingCurrentA`) for:

- Cable thermal withstand \((kS/I)^2\)
- Maximum allowable cable length
- Fuse time-current / withstand lookup

**Reason (engineering):** For a **5 second** cranking event, the current flowing during that interval is best represented by T, not a theoretical power limit (Q) or a millisecond inrush (R).

### 1.6 Fleet impact where Q ≠ T

| Machine | Q (A) | T (A) | R (A) | If PDF requires Q vs our T |
|---------|-------|-------|-------|----------------------------|
| D10T | 1000 | 500 | 1200 | Q is **stricter** (shorter max cable, harder fuse pass) |
| B45E | 500 | 200 | 330 | Q is **stricter** |
| 777 (07) | 1000 | **1200** | 2000 | Q is **less strict** — **unsafe** if T reflects reality |
| 793F | 1000 | **1200** | 2000 | Same concern |

**On 777 and 793F, measured cranking (T) exceeds the calculated limit (Q).** Using Q for cable/fuse sizing would **under-protect** relative to actual cranking current.

### 1.7 Questions for you

1. For **cable thermal** over 5 s, should \(I\) be column **Q**, **T**, or **R**?  
2. For **voltage drop / max cable length**, same question?  
3. For **fuse withstand**, should we use the same current as (1), or always **R**?  
4. Is column **Q** intended only as a **starter motor limit** (`I_crank ≤ Q`), separate from cable/fuse load?  
5. Please rename line 9 in the next spec revision to match the chosen column (avoid “inrush” if Q is intended).

---

## 2. Machines calculable — T path vs Q path (full database)

If we applied v0’s **same minimum data rules** to all **37** MachinesOnSite records:

| Path | Count | Machines |
|------|-------|----------|
| **T path** (as implemented) | **11** | B45E, 14M, 777 (07), 793F, 992K, D10T, D11, **120T /EX 1200-7**, **69T / ZX650H**, 155, 375 |
| **Q path** (strict PDF line 9) | **9** | Same as current UI list only |

**Using T instead of Q unlocks 2 additional machines:**

| Machine | Why Q path fails | Why T path works |
|---------|----------------|------------------|
| **120T / EX 1200-7** | Q = `#VALUE!` (broken Excel formula) | T = 650 A, full cable block |
| **69T / ZX650H** | Q = **0** (no power at cutoff in sheet) | T = 400 A, full cable block |

**Question:** Should the prototype sample list expand from 9 to **11** machines?

Neither 120T nor 69T is in the current v0 UI dropdown.

---

## 3. 69T vs 120T — data asymmetry

| | **69T / ZX650H** | **120T / EX 1200-7** |
|---|------------------|----------------------|
| In v0 UI today | No | No |
| Power at cutoff (col O) | **Missing** | 7.5 kW |
| Q (col Q) | **0** | `#VALUE!` |
| T (col T) | 400 A | 650 A |
| Cable data complete | Yes | Yes |

The app does **not** read power-at-cutoff directly — only the Excel formula for Q uses it. So 120T having power does not help unless Q is fixed or derived; 69T missing power only matters if Q is required.

---

## 4. Minimum starter voltage — 16 V constant vs column N

**PDF line 5:** Minimum starter voltage = **16 V** (constant).  
**PDF line 6:** Max voltage drop = battery V during cranking − 16 V.

**MachinesOnSite column N** (cutoff voltage) is **16 V** on every machine that records it (14 of 37); 23 machines leave it blank.

**We use 16 V as a global constant** in v0 — we do **not** read column N per machine.

**Questions:**

1. Confirm 16 V applies to **all** machines regardless of column N?  
2. Should blank column N default to 16 V when deriving Q?

**Note:** Assuming 16 V + deriving Q from power/efficiency would fix Q for **120T** (→ 833 A) and make it “V2 complete” on the full engineering tool, but does **not** fix **69T** (no power at cutoff).

---

## 5. Other specification vs implementation differences

### 5.1 Column R (inrush) never used

PDF line 9 label references inrush; column R holds measured inrush. **v0 does not use R** for any calculation.

**Question:** Should R be used for fuse withstand even if cable thermal uses T?

### 5.2 Cable peak column AH

Column **AH** (“Peak (A)”) duplicates column **T** when both are present. Neither is read separately in v0.

### 5.3 Cable continuous — column AG vs Cable_Capacity

Site **AG** values (e.g. 314 A for 70 mm² Narva) often **exceed** the generic **Cable_Capacity** table (274 A for 70 mm² XLPE). We use **AG** for the continuous check when cable is unchanged.

**Question:** Confirm site AG overrides the standard table?

### 5.4 K-factor — strict lookup

PDF line 13: match cable type (AD) to Copper_K_Factor. We do **not** guess a default K if the type is missing.

**Question:** Confirm no default K (e.g. 143) when type is unknown?

### 5.5 StarterMotors Library not imported

PDF section 3 references **StarterMotors Library**. Our data migration only imports MachinesOnSite columns. The separate library sheet is **not** in the web app database.

**Question:** Is MachinesOnSite sufficient, or should the library be imported?

### 5.6 Fuse library rows 8–9 corrupt

`fuse-library.json` contains two invalid rows (ratings 285 A and 0.43 A) from mis-parsed Excel cells.

**Action needed:** Clean Fuse_Library sheet in Excel and re-import.

### 5.7 `#VALUE!` on column Q (21 machines)

Many rows have a broken Excel formula for Q. Power (O) and efficiency (P) are often present — Q could be recalculated.

**Question:** Should we auto-derive Q in the import when the formula fails?

### 5.8 Case sensitivity — `weldflex` vs `Weldflex`

Machine **155 / D155AX-6** uses `weldflex` (lowercase). K lookup still works via substring match.

**Question:** Standardise cable type spelling on import?

---

## 6. PDF line item compliance matrix

| Line | Requirement | v0 status |
|------|-------------|-----------|
| 1–4 | User inputs | ✓ Implemented |
| 5 | Min starter 16 V | ✓ Constant |
| 6 | Max voltage drop | ✓ \(V_{bat}-16\) |
| 7 | Cable size AE | ✓ |
| 8 | Resistance from Cable_Capacity | ✓ |
| 9 | Starter current col **Q** | ✗ Uses col **T** — **needs your decision** |
| 10 | Alternator col Z | ✓ |
| 11 | Cranking time 5 s | ✓ |
| 12 | Cable type AD | ✓ |
| 13 | K-factor lookup | ✓ Strict |
| 14–15 | Thermal \((kS/I)^2\) | ✓ (with T not Q) |
| 16 | Cable recommendation | ✓ |
| 17 | Continuous AG | ✓ |
| 18 | Max one-way length | ✓ (with T not Q) |
| 19 | Cable temperature | ✓ |
| 20–22 | Fuse selection | ✓ (withstand uses T not Q/R) |

---

## 7. Recommended responses (for your convenience)

Please reply with item numbers, e.g.:

- **1.** Cable thermal: T · Voltage drop: T · Fuse withstand: R · Q is starter limit only: Yes  
- **2.** Expand machine list to 11: Yes / No  
- **4.** 16 V universal: Yes  
- **5.3** Site AG overrides table: Yes  
- etc.

We will update the specification, engineering brief, tests, and prototype to match your written answers.

---

## 8. Contact / next steps

Once we receive your responses:

1. Update `V0_CALCULATIONS.md` and the engineering brief  
2. Align `calculateGba0002()` with confirmed current columns  
3. Re-run test cases and share updated results  
4. Optionally expand the machine dropdown and regenerate `V0_MACHINE_PARAMETERS.xlsx`

Thank you for reviewing this memo. Resolving item **1** (Q vs T vs R) is the highest priority — it affects every cable and fuse result on every machine.
