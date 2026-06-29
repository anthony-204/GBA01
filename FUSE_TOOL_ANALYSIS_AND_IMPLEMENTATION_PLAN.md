# Fuse & Cable Protection Tool — Analysis & Implementation Plan

**Project:** GB Engineering — Tailings Dam / Fleet Circuit Protection  
**Sources reviewed:** `Admin/background.pdf`, `Resources/Tool/APP_Fuse/Fuse_GUI_APP.xlsx`, `fuse_matlab_code_extract/`  
**Date:** June 2025

---

## Table of contents

1. [Project context](#project-context)
2. [Current tool breakdown](#current-tool-breakdown)
3. [Excel calculation flow](#excel-calculation-flow)
4. [MachinesOnSite data model](#machinesonsite-data-model)
5. [Why Excel feels messy](#why-excel-feels-messy)
6. [MATLAB code interpretation](#matlab-code-interpretation)
7. [MATLAB vs Excel gaps](#matlab-vs-excel-gaps)
8. [Proposed stack assessment](#proposed-stack-assessment)
9. [Recommended implementation plan](#recommended-implementation-plan)
10. [Suggested project structure](#suggested-project-structure)
11. [MVP scope recommendation](#mvp-scope-recommendation)
12. [Key risks](#key-risks)
13. [Summary](#summary)

---

## Project context

From `Admin/background.pdf`, this project targets **fleet vehicles** used in demanding environments (emergency response, firefighting, forestry, utilities, off-road service fleets, tailings dam operations). These vehicles experience repeated high inrush and extended cranking events with additional auxiliary loads.

### Problem

OEM electrical systems often have **limited protective devices** around starting and power distribution circuits to avoid nuisance trips during critical operations. Fleet operators increasingly need an additional level of electrical protection to reduce risks of cable overheating, insulation damage, or thermal incidents.

### Objective

Develop and enhance a tool that **calculates and validates suitable cable and fuse combinations**, balancing:

- Protection against thermal and fault risks
- Reliable performance under high inrush and cranking conditions

### Project phases (from background.pdf)

| Phase | Focus |
|-------|-------|
| **Phase 1** | User requirements, acceptance criteria, assumptions, safety/misuse considerations |
| **Phase 2** | Asset database (machines, cables, fuses, standards, duty cycles, derating) |
| **Phase 3** | Excel tool with standards-based formulae, validation, edge-case testing |
| **Phase 4** | Mobile web application — **separate UI, calculation logic, and databases** |

Phase 4 explicitly calls for maintainable separation of concerns, version control, user guidance, and field deployment — which aligns with a TypeScript web application architecture.

### Domain context (presentation slides)

The bundled presentation (`Resources/Tool/otherfiles_zip`) describes the **Tailings Dam Circuit Protection Project** with these electrical boundary conditions:

- **Inrush current:** ~2000 A for &lt; 1 s
- **Cranking current:** ~1000 A for &lt; 10 s
- **Continuous load:** ~150 A after engine start
- **24V system minimum:** 16 V threshold for stable component operation
- **Cable standard reference:** AS/NZS welding cable duty cycles
- **Fuse reference:** Littelfuse MEGA 32V slow-blow fuses (I²t and time-current curves)

---

## Current tool breakdown

### Architecture (`Fuse_GUI_APP.xlsx`)

The workbook contains **16 sheets** and helper lists with ~1,900 rows. It combines three layers in one file:

| Layer | Sheets | Role |
|-------|--------|------|
| **UI / calculator** | `User Input` | Main workflow; triplicated columns for 3 input modes |
| **Asset database** | `MachinesOnSite` (~37 machines), `StarterMotors Library`, `Alternators24V Library`, `Popular_Cable_sizes` | Per-machine and component specs |
| **Reference libraries** | `Fuse_Library`, `MEGA32V`, `Cable_Capacity`, `WeldingCable`, `Copper_K_Factor` | Standards, fuse curves, cable tables |
| **Output / misc** | `Results`, `MD6250 Project`, `R&D`, `list values`, `StandardComplaince`, `CableInquiry` | Bulk lookup, assumptions, dropdown generators |

### Sheet inventory

| Sheet | Approx. size | Purpose |
|-------|--------------|---------|
| `User Input` | 117 × 71 | Main calculator UI and logic |
| `Results` | 1049 × 20 | Bulk results table linked to `MachinesOnSite` |
| `MachinesOnSite` | 952 × 83 | Fleet machine electrical specifications |
| `StarterMotors Library` | 85 × 27 | Starter motor reference data |
| `Fuse_Library` | 43 × 23 | Littelfuse MEGA 32V fuse catalogue |
| `MEGA32V` | 10 × 9 | Fuse time-current graph lookup table |
| `Cable_Capacity` | 50 × 19 | Cable sizing per installation method |
| `WeldingCable` | 7 × 18 | Welding cable duty cycle interpolation |
| `Popular_Cable_sizes` | 101 × 15 | Common cable products |
| `Copper_K_Factor` | 43 × 9 | K-factor by insulation type |
| `Alternators24V Library` | 25 × 4 | Alternator output ratings |
| `CableInquiry` | 55 × 3 | Supplier contact tracking |
| `StandardComplaince` | 1 × 1 | Standards references (AS/NZS) |
| `MD6250 Project` | 69 × 15 | Given values and equations |
| `R&D` | 33 × 5 | Experimental calculations |
| `list values` | 1602 × 3 | Dropdown option generators |

### High-level data flow

```
User selects Model
        ↓
INDEX/MATCH into MachinesOnSite
        ↓
    ┌───┴───┐
    ↓       ↓
Starter/   Cable continuous
battery    + peak/inrush checks
checks
    ↓       ↓
    └───┬───┘
        ↓
Fuse rating from continuous load + safety factor
        ↓
Closest fuse match in Fuse_Library
        ↓
MEGA32V graph / I²t withstand check
        ↓
    Passes cranking time? ──No──→ Escalate fuse size (iterative)
        ↓ Yes
GB part # + manufacturer details
        ↓
Parallel fuse logic (if required)
```

---

## Excel calculation flow

### `User Input` — mine-site mode (column G)

When a model (e.g. `D10T`) is selected, the sheet pulls values from `MachinesOnSite` and runs a **sequential decision tree**.

#### Step 1 — Machine & starter boundaries

| Check | Source / logic |
|-------|----------------|
| Minimum battery voltage | 24V system → 16.48V (16V + 3% voltage drop) |
| Cut-off voltage, power, efficiency | From machine row → peak current limit (typically **1000 A**) |
| Measured cranking voltage/time | "Should battery be replaced?" |
| Cranking current vs limit | "Should starter be replaced?" |

Key cells (column G, mine-site mode):

- `G5` — Model selection (e.g. `D10T`)
- `G8`–`G12` — Battery/starter boundary values (INDEX from `MachinesOnSite`)
- `G16`–`G18` — Manufacturer, measured cranking voltage, cranking time
- `G19` — Battery replacement recommendation
- `G20`–`G22` — Cranking current and starter replacement check

#### Step 2 — Cable adequacy

| Check | Formula / logic |
|-------|-----------------|
| **Continuous** | `Alternator current ≤ Cable continuous rating` |
| **Peak/inrush** | `K × cable_mm² / √(time)` vs peak cranking current |
| **K-factor** | Looked up from `Copper_K_Factor` by cable insulation type (not always 143) |
| **Voltage drop** | `(cable_current × length × 2 × resistance/km / 1000) × 100 / cranking_voltage` |

Key cells:

- `G23`–`G28` — Alternator current, cable type/size, continuous rating, continuous adequacy
- `G29`–`G31` — K-factor, short-circuit carrying capability, inrush adequacy
- `G32`–`G35` — I²t, cable resistance, length, voltage drop %

Peak cable capability formula (Excel):

```
Short circuit capability (A) = ROUND(K × cable_mm² / SQRT(time_s), 0)
```

#### Step 3 — Fuse selection (iterative)

| Step | Logic |
|------|-------|
| Target rating | `(1 + safety_factor%) × alternator continuous current` (default 25% → **1.25×**) |
| Closest match | Minimum absolute difference from `Fuse_Library` rating options (column M) |
| Withstand time | INDEX from `MEGA32V` graph via `Fuse_Library!I` (breaking current + rating match) |
| Escalation | If fuse cannot survive required cranking time → bump to next size (G44→G45→G50 loop) |
| De-rating | Operating temperature continuous current de-rating |
| Parallel fuses | If single fuse cannot protect cable → parallel configuration |
| Part lookup | Manufacturer, part #, GB fuse holder part #, website link |

Key cells:

- `G3` — Safety current factor (%) — default 25
- `G39` — `((G3+100)/100) × alternator_continuous_current`
- `G40` — Closest fuse rating match
- `G41`–`G43` — Availability, withstand time, cranking time adequacy
- `G44`–`G54` — Iterative fuse escalation and cable protection checks
- `G55`–`G57` — Parallel fuse logic
- `G58`–`G61` — Manufacturer and part numbers

Example array formulas (column G):

```
G40: Closest fuse rating
  IFERROR(INDEX(Fuse_Library!M2:M25,
    MATCH(MIN(ABS(Fuse_Library!M2:M25-G39)),
          ABS(Fuse_Library!M2:M25-G39), 0)),
    "Data Unavailable")

G42: Withstand time from graph
  IFERROR(INDEX(Fuse_Library!I:I,
    MATCH(1, (Fuse_Library!G:G=G12)*(Fuse_Library!E:E=G41), 0)),
    "NO MATCH")
```

#### Three input modes in `User Input`

The sheet triplicates logic across columns for different use cases:

| Column block | Mode |
|--------------|------|
| **E / G** | Values from machine spec library (mine-site) |
| **J / L** | Manual value entry |
| **O / Q** | When machine information is unavailable |

### `Fuse_Library` structure

| Column | Field |
|--------|-------|
| A | GB PART # (fuse holder) |
| B | Manufacturer |
| C | Description |
| D | Manufacturer part # |
| E | Current rating (A) |
| F | I²t (A²s) |
| G | Breaking current (A) |
| H | Time from I²t formula |
| I | Time from MEGA32V graph |
| J | Interrupting rating |
| K | Temperature range |
| L | Link |
| M | Fuse rating (A) options |

### `Results` sheet

Mirrors the full `MachinesOnSite` machine list with columns for suggested fuse size, cranking current, part numbers, I²t required, parallel configuration, and fuse match status. Used as a bulk lookup/reporting view rather than the interactive calculator.

---

## MachinesOnSite data model

**~37 machines** currently catalogued (e.g. `18T_Padfoot`, `B45E`, `D10T`, `14H`, `16M`).

**36 columns** (A–AJ). Key fields:

| Column | Field | Used for |
|--------|-------|----------|
| B | Site | Location (e.g. SEE Civil Pad, Tailings Dam, Cadia) |
| C | Manufacturer | Machine make |
| D | **Model** | Primary lookup key |
| F | Category | Truck, Roller, etc. |
| H | Electrical system (V) | 12V / 24V |
| I | Minimum battery voltage (V) | `IF(H=24, 16+(16×0.03), …)` |
| Q | Peak current cut-off (A) | From power & efficiency — typically 1000 A boundary |
| R | Inrush current (A) measured | |
| T | Peak continuous cranking current (A) | Starter load for checks |
| W | Cranking voltage (V) measured | Voltage drop calculations |
| X | Cranking time (s) measured | Fuse/cable time checks |
| Y | Cranking time (s) required | `IF(X<5, 5, X)` |
| Z | Alternator continuous current (A) | Continuous + fuse sizing |
| AD | Cable type | K-factor lookup |
| AE | Cable size (mm²) | Peak capability formula |
| AF | Operating temperature (°C) | Fuse de-rating |
| AG | Continuous current (A) | Cable continuous adequacy |
| AI | Cable length (m) | Voltage drop |

### Example: Bell B45E (row 5)

| Parameter | Value |
|-----------|-------|
| Site | SEE Civil Pad, Tailings Dam, Cadia |
| Electrical system | 24V |
| Peak current cut-off | ~1000 A (calculated from 4.5 kW @ 16V, 56.25% efficiency) |
| Cranking current | 200 A |
| Cranking time | 3 s |
| Alternator continuous | 80 A |
| Cable | OEM Wiring, 70 mm² |
| Cable continuous rating | 314 A |
| Cable length | 6 m |

---

## Why Excel feels messy

1. **Three parallel UI columns** (E/J/O and G/L/Q) for library vs manual vs missing-data modes — triples maintenance.
2. **Deep INDEX/MATCH chains** and array formulas scattered across 117 rows.
3. **Inconsistent naming** — typos (`Manufcturer`, `Cranking Voltge`, `StandardComplaince`).
4. **Suspected formula bugs** — e.g. `G13 = 15/1000` (0.015 s) is used in `SQRT(G13)` for cable peak capability in `G30`, but the label suggests cranking time; measured cranking time is in `G18` (5 s for D10T). This warrants engineering review before porting.
5. **`Results` duplicates** the entire machine list — any schema change requires updating multiple sheets.
6. **Logic spread across 16 sheets** with no single testable "engine" module.
7. **No automated tests** — changes can silently break downstream cells.

---

## MATLAB code interpretation

Location: `fuse_matlab_code_extract/`

The PDF source (`Code that works Fuse.pdf`) contains **MATLAB App Designer callback snippets**, not a complete `.mlapp` application. Files represent **incremental development stages**:

| File | Stage | What it does |
|------|-------|--------------|
| `indexing_machine_manufacturer.m` | v0.1 | Show manufacturer for selected model |
| `display_multiple_rows.m` | v0.2 | Add cranking current to display table |
| `display_after_logical_comparison.m` | v0.3 | Logical comparison display |
| `simplified_logical_results.m` | v0.4 | Simplified cable logic |
| `code_without_fuse_matching.m` | v0.5 | Cable YES/NO checks only |
| `code_with_data_types_and_colour.m` | v0.6 | 1000 A cranking limit + colour coding |
| `menu1_done_with_colour.m` | v0.7 | Expanded menu with colours |
| `ModelDropDownValueChanged_final_font.m` | **Final GUI** | Full callback with fuse matching + styled table |
| `fuseRecommendationFromExcel.m` | **Standalone** | Best reference — no App Designer required |
| `readExcelData.m` | Startup | Populates model dropdown from Excel |
| `startupFcn.m` | Startup | Calls `readExcelData` on app load |
| `convertValue.m` | Helper | Parses Excel cell values to numeric/string |

### MATLAB final algorithm (`fuseRecommendationFromExcel.m`)

Produces a **5-row result table**:

1. **Is the Starter Motor Cranking amps within the limit?** — cranking ≤ 1000 A
2. **Can the cable handle the in-rush current demand?** — `I_crank ≤ (143 × mm²) / √(t)` for t ≤ 5 s
3. **Can the cable handle the continuous current demand?** — `I_alt ≤ I_cable_continuous`
4. **Closest match for the fusing rating (A)** — `1.25 × I_cable_continuous` → nearest library rating
5. **GB Part #** — I²t match: `I²t_required = I_crank² × t` → fuse where `I²t_fuse > I²t_required`

Constants used:

- `FusingSafetyCurrentFactor = 125/100` (1.25)
- `KFactorCopper = 143` (hardcoded)
- Cranking limit: 1000 A
- Max cranking time for cable formula: 5 s

### MATLAB deployment

`Resources/Tool/APP_Fuse/Fuse.prj` targets **MATLAB Web App Compiler** (R2024b). This produces a web-deployable MATLAB runtime app — not a lightweight mobile-friendly solution and requires MATLAB Compiler licensing.

---

## MATLAB vs Excel gaps

| Issue | Detail |
|-------|--------|
| **Incomplete scope** | 5 outputs vs ~60 calculated fields in Excel |
| **Column range bug** | Reads headers `A2:X2` only; cable/alternator data is in columns **Z, AE, AG** (beyond X) |
| **Wrong column names** | Expects `Starter Motor Peak Current (A)` — Excel column T is `Peak continuous current during cranking (A)` |
| **Hardcoded K=143** | Excel looks up K from `Copper_K_Factor` by cable insulation type (70–150) |
| **Different fuse matching** | MATLAB uses **I²t thermal energy**; Excel primarily uses **MEGA32V time-current graph** lookup |
| **No iterative sizing** | MATLAB picks closest rating once; Excel escalates through multiple fuse sizes |
| **No parallel fuse logic** | Excel handles parallel configuration and de-rating |
| **No voltage drop** | Excel calculates voltage drop % |
| **No battery checks** | Excel checks cranking voltage and battery replacement |
| **Hardcoded file paths** | Multiple absolute paths to different users' machines |
| **Missing features** | No manual entry mode, no "data unavailable" workflow |

**Recommendation:** Treat MATLAB as a **partial prototype**. Use `fuseRecommendationFromExcel.m` as a starting sketch for MVP v0.1, but treat **Excel `User Input` column G as the authoritative calculation path** (after validating suspect formulas with engineering).

### Columns A–X vs full `MachinesOnSite` (MATLAB read range)

MATLAB reads only columns A–X. Mapping of expected vs actual:

| MATLAB expects | Actual in A–X | Actual full sheet |
|----------------|---------------|-------------------|
| `Starter Motor Peak Current (A)` | **Not present** | Column T: `Peak continuous current during cranking (A)` |
| `Cranking time (s)` | Column X: `Cranking time (s) Measured` | ✓ (in range) |
| `Cable Size(mm2)` | **Not in A–X** | Column AE |
| `Alternator Continuous Current (A)` | **Not in A–X** | Column Z |
| `Continuous Current (A)` | **Not in A–X** | Column AG |

---

## Proposed stack assessment

### Proposed stack

| Component | Choice |
|-----------|--------|
| Frontend | Next.js + TypeScript |
| UI | Tailwind CSS |
| Logic | TypeScript functions translated from Excel formulas |
| Data | JSON/CSV for cable tables, fuse ratings, standards, assumptions |
| Hosting | Vercel or Netlify |

### Verdict: **Appropriate — recommended with additions**

| Choice | Assessment |
|--------|------------|
| **Next.js + TypeScript** | Strong fit: responsive web app, PWA potential, optional API routes for future admin |
| **Tailwind CSS** | Strong fit: mobile-first layout, traffic-light status colours |
| **TypeScript calculation functions** | **Essential** — testable, versioned, auditable (Phase 3/4 requirement) |
| **JSON/CSV data** | **Essential** — replaces 16 Excel sheets with typed, importable modules |
| **Vercel / Netlify** | Suitable — calculations can run **100% client-side** for v1; no backend required initially |

### Recommended additions

| Addition | Purpose |
|----------|---------|
| **Vitest** | Golden-file tests: TS output vs Excel computed values for known machines |
| **Zod** | Input validation; handle `"TBC"`, `"Data Unavailable"`, out-of-range values |
| **PWA** | Offline field use on remote mine sites |
| **Monorepo** | `packages/engine` (pure TS) + `apps/web` (Next.js) — logic separate from UI |

### Alternatives (when to consider)

| Alternative | When |
|-------------|------|
| **Vite + React** (no Next.js) | If SSR/API not needed — slightly simpler toolchain |
| **Flutter / React Native** | Native offline app with device APIs required |
| **Retool / low-code** | Quick internal admin for data entry only — not for calculation engine |
| **MATLAB Web App** | Only if team is MATLAB-only — poor mobile UX, heavy runtime, licensing cost |

**Vercel vs Netlify:** Either works. Vercel pairs naturally with Next.js; choose based on team preference.

---

## Recommended implementation plan

### Phase 0 — Freeze the spec (1–2 weeks)

**Do not port all of Excel at once.**

1. Pick **one input mode** first: mine-site library (model dropdown).
2. Walk `User Input` column G row-by-row with an engineer; document each formula in plain English.
3. Flag and resolve Excel bugs (e.g. G13, G31 comparisons) before porting.
4. Define **acceptance cases**: 5–10 machines with expected outputs signed off by engineering.

**Deliverable:** `CALCULATION_SPEC.md` + golden test vectors (input JSON → expected output JSON).

### Phase 1 — Data migration (1 week)

Export sheets to typed JSON:

```
data/
  machines.json           # from MachinesOnSite
  fuse-library.json       # Fuse_Library + MEGA32V curve data
  cable-capacity.json     # from Cable_Capacity
  copper-k-factor.json    # from Copper_K_Factor
  alternators.json        # from Alternators24V Library
  starter-motors.json     # from StarterMotors Library
  constants.json          # safety factor defaults, 1000A limit, etc.
```

Provide a regeneration script (Python or TypeScript) to re-import when Excel is updated.

### Phase 2 — Pure calculation engine (2–3 weeks)

```
packages/engine/
  types.ts
  parseValue.ts           # "TBC", "Data Unavailable", NaN handling
  machineLookup.ts
  cableChecks.ts          # continuous + peak (K lookup)
  fuseSelection.ts        # iterative sizing + graph/I²t
  recommend.ts            # orchestrator
  __tests__/
    golden.test.ts        # D10T, B45E, etc.
```

Port **Excel logic**, not MATLAB. MATLAB's 5-step flow can serve as **MVP v0.1** if speed is critical, but must be labelled incomplete.

### Phase 3 — Mobile UI MVP (2 weeks)

Single-page flow optimised for phones:

1. **Searchable model picker**
2. **Status cards** (not a wide table):
   - Starter within limit
   - Cable inrush OK
   - Cable continuous OK
   - Recommended fuse (A)
   - GB part #
3. **Colour coding:** green / amber / red
4. Expandable **"show inputs"** section for transparency

### Phase 4 — Full feature parity (3–4 weeks)

- Manual entry mode (Excel columns J/L equivalents)
- "Data unavailable" guided workflow (columns O/Q)
- Voltage drop warning
- Parallel fuse recommendation
- Iterative fuse escalation (full G39–G54 logic)
- Export/share results (PDF or copy summary)

### Phase 5 — Data admin & deployment (ongoing)

- Admin interface or spreadsheet sync for non-developers to update machine data
- Version tags on data + engine (e.g. `v1.2.0`)
- Field trial with technicians → feedback loop
- Troubleshooting and process guide (Phase 4 requirement)

---

## Suggested project structure

```
fuse-tool/
├── apps/
│   └── web/                      # Next.js + Tailwind
│       ├── app/
│       │   └── page.tsx          # Main calculator
│       └── components/
│           ├── ModelSelect.tsx
│           ├── ResultCard.tsx
│           └── StatusBadge.tsx
├── packages/
│   └── engine/                   # Pure TypeScript — no React imports
│       ├── src/
│       │   ├── types.ts
│       │   ├── parseValue.ts
│       │   ├── machineLookup.ts
│       │   ├── cableChecks.ts
│       │   ├── fuseSelection.ts
│       │   └── recommend.ts
│       └── tests/
│           └── golden/
├── data/                         # JSON exported from Excel
│   ├── machines.json
│   ├── fuse-library.json
│   ├── cable-capacity.json
│   └── constants.json
├── scripts/
│   └── import-xlsx.ts            # Regeneration script
└── docs/
    ├── FUSE_TOOL_ANALYSIS_AND_IMPLEMENTATION_PLAN.md  # this document
    └── CALCULATION_SPEC.md       # Phase 0 deliverable
```

---

## MVP scope recommendation

### Include in v1

- Model lookup from `MachinesOnSite` library
- 5 core checks (MATLAB parity as minimum)
- Fuse rating + GB part number recommendation
- Mobile-responsive UI with status cards
- Golden tests validated against Excel for selected machines
- Assumptions and limitations displayed in UI

### Defer to later versions

- All 3 Excel input modes (manual entry, missing data)
- Full 60-field output parity
- Parallel fuse logic
- User accounts / authentication
- CMS / live database backend
- PDF report generation

**Target:** Usable field tool in **4–6 weeks**, then iterate toward full Excel parity.

---

## Key risks

| Risk | Mitigation |
|------|------------|
| **Excel formulas may contain errors** | Engineering review of column G before porting; golden tests |
| **MATLAB does not match Excel** | Do not use MATLAB as source of truth; document column range/name mismatches |
| **Fuse matching method ambiguity** | Align on I²t vs MEGA32V graph with engineering; document in spec |
| **Safety liability** | UI disclaimers: outputs are recommendations; state assumptions and limits |
| **Data staleness** | Version data files; provide update workflow for fleet changes |
| **Scope creep** | Strict MVP boundary; Phase 4 features only after v1 field trial |

---

## Summary

| Question | Answer |
|----------|--------|
| Is Next.js + TS + Tailwind + JSON + Vercel appropriate? | **Yes** |
| Is there a better approach? | Same stack + `packages/engine` + Vitest golden tests + PWA; avoid MATLAB for production |
| What is the current tool? | Overgrown 16-sheet Excel calculator + incomplete MATLAB wrapper with column mismatches |
| What to port first? | Excel `User Input` mine-site path (column G), not all sheets; MATLAB as hint only |
| What is the first deliverable? | Calculation spec + JSON data export + tested TS engine + mobile model-picker UI |
| How long to MVP? | ~4–6 weeks with focused scope |

---

## References

| Resource | Path |
|----------|------|
| Project background | `Admin/background.pdf` |
| Excel tool | `Resources/Tool/APP_Fuse/Fuse_GUI_APP.xlsx` |
| MATLAB extract | `fuse_matlab_code_extract/` |
| Standalone reference implementation | `fuse_matlab_code_extract/standalone_reference/fuseRecommendationFromExcel.m` |
| MATLAB App Designer callbacks | `fuse_matlab_code_extract/app_designer_methods/` |
| Domain presentation | `Resources/Tool/otherfiles_zip/` (Tailings Dam Circuit Protection Project) |

---

*Document generated from technical review of project artefacts. Calculation formulas should be validated by the engineering team before production use.*
