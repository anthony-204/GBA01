# Fuse & Cable Protection Tool — User Guide

**GB Auto · Version 2** · For first-time users · No Excel or MATLAB knowledge required

---

## Table of contents

1. [What is this tool?](#what-is-this-tool)
2. [What problem does it solve?](#what-problem-does-it-solve)
3. [GBA-0002 coverage at a glance](#gba-0002-coverage-at-a-glance)
4. [Before you start](#before-you-start)
5. [Starting the app](#starting-the-app)
6. [Using the web app](#using-the-web-app)
7. [Vehicle library mode](#vehicle-library-mode)
8. [Manual entry mode](#manual-entry-mode)
9. [Understanding outputs](#understanding-outputs)
10. [Engineering checks explained](#engineering-checks-explained)
11. [Status colours and badges](#status-colours-and-badges)
12. [Worked examples](#worked-examples)
13. [What the tool does not do yet](#what-the-tool-does-not-do-yet)
14. [Updating fleet data (admins)](#updating-fleet-data-admins)
15. [Deploying for field use](#deploying-for-field-use)
16. [Glossary](#glossary)
17. [Further reading](#further-reading)
18. [Disclaimer](#disclaimer)

---

## What is this tool?

This web application checks whether a **heavy machine’s starting circuit** is adequately sized and protected:

**Battery → cable → starter motor → fuse**

It compares measured or specified machine demand against limits from GB Engineering’s data libraries (fleet machines, cable capacity, fuse catalogue, MEGA32V time-current curves, and copper K-factors).

The tool is a **design aid** for mine-site and fleet vehicles (trucks, dozers, rollers, etc.) on **24 V** systems with high cranking currents. It does **not** replace qualified electrical engineering sign-off.

---

## What problem does it solve?

When a machine is hard to start, blows fuses, or needs a cable/fuse review, this tool helps you answer:

| Question | Where to look |
|----------|----------------|
| Is the battery voltage too low during cranking? | Battery voltage check |
| Is cranking taking too long? | Battery cranking time check |
| Is the starter drawing too much current? | Starter cranking limit check |
| Can the cable handle running load (alternator)? | Cable continuous check |
| Can the cable survive the cranking surge? | Cable inrush / peak check |
| Is voltage drop acceptable? | Voltage drop check |
| What fuse size fits? | Fuse rating + GB part number |
| Will the fuse survive cranking? | Fuse time-current / I²t checks |
| Does the fuse protect the cable? | Fuse protects cable check |

---

## GBA-0002 coverage at a glance

This app implements **Version 2** of the GBA-0002 “simple web app” specification.

### Implemented (Version 2)

| GBA-0002 requirement | Status |
|----------------------|--------|
| Select machine make/model from fleet library | Done — 37 vehicles in database |
| Manual entry when library data is missing | Done — **Manual entry** tab |
| Safety factor (%), cranking time, system voltage | Done |
| Starter cranking current, alternator current | Done |
| Cable type, size, rating, length, operating temperature | Done |
| Voltage drop limit (%) | Done — adjustable in library mode |
| Outputs: cable type, size, rating, length (mm), temp | Done — **Cable & fuse specification** panel |
| Outputs: suggested fuse size, make/model, fuse temp | Done |
| Cable and fuse suitability pass/warning/fail | Done |
| Battery voltage and cranking time checks | Done when data available |
| Starter cranking current check | Done |
| Cable continuous and inrush checks | Done |
| I²t calculation | Done |
| Voltage drop check | Done |
| Fuse sizing with safety factor | Done |
| Fuse library closest-match selection | Done |
| Fuse MEGA32V time-current withstand | Done |
| Fuse protects cable check | Done (no installation derating in V2) |
| Incomplete vehicles visible but blocked | Done — badges + missing field list |
| Mobile-friendly result cards | Done |
| Expandable calculation details | Done — **Calculation details** on each card |
| Engineering disclaimer | Done — footer on every screen |

**Fleet data note:** Of 37 library vehicles, **9 currently have complete data** for full recommendations (`B45E`, `D10T`, `D11`, `14M`, `155 / D155AX-6`, `375/ D375-5E0`, `777 (07)`, `793F`, `992K`). The rest appear in the list but are blocked until data is completed or you use **Manual entry**.

### Not yet implemented (planned Version 3+)

| GBA-0002 / workbook feature | Status |
|-----------------------------|--------|
| **Parallel fuse** sizing and derating | Not implemented |
| **Starter motor library** lookup to *calculate* cranking current from mechanical power | Not implemented — app uses stored/measured cranking current |
| **Cable/fuse temperature derating** (grouping, enclosure, ambient) | Not applied in calculations |
| **Interrupting / fault-current** verification | Not implemented |
| **PDF export** of results | Not implemented — results shown on screen only |
| **Admin UI** to edit fleet records in the browser | Not implemented |
| Limit to **10 sample machines** only | Not enforced — full fleet imported |

Constants (safety factor default 25%, voltage drop 3%, K-factor lookup, etc.) come from `data/constants.json` and are listed under **Documented assumptions** on each result — they are not hidden hard-coded values in the calculation logic.

---

## Before you start

### To run on your computer

| Requirement | Notes |
|-------------|-------|
| **Node.js 18+** | [https://nodejs.org](https://nodejs.org) (LTS) |
| Project folder | `fuse-tool` inside the GB Engineering repository |
| ~5 minutes | First-time `npm install` |

You do **not** need Excel, MATLAB, or Python unless you are re-importing fleet data from the master spreadsheet.

### To use in the field

After the app is deployed to a web host, users only need a phone, tablet, or laptop with a browser and the URL.

---

## Starting the app

Open PowerShell, Command Prompt, or Terminal:

```bash
cd fuse-tool
npm install
npm run dev
```

Open **http://localhost:3000** in your browser.

### Verify the calculation engine

```bash
npm test
```

You should see **26 tests passed**.

### Troubleshooting

| Problem | What to try |
|---------|-------------|
| `npm` not found | Install Node.js and restart the terminal |
| Port 3000 in use | `npm run dev -- -p 3001` and open port 3001 |
| Blank page | Run `npm run build` and check terminal errors |
| Empty model list | Ensure `fuse-tool/data/bundle.json` exists |

---

## Using the web app

The screen has two modes at the top:

| Tab | When to use |
|-----|-------------|
| **Vehicle library** | Machine exists in the fleet database and you want stored specs |
| **Manual entry** | Machine not in library, data incomplete, or you want to test “what-if” values |

Below the inputs you will see:

1. **Summary** — overall verdict and recommended next step  
2. **Cable & fuse specification (GBA-0002)** — required output fields (complete vehicles / valid manual entry only)  
3. **Engineering checks** — one card per calculation, with expandable details  
4. **Documented assumptions** — which defaults and limits were applied  
5. **Disclaimer** — engineering approval reminder  

---

## Vehicle library mode

### Step 1 — Find your machine

1. Type in **Search make / model** to filter (e.g. `B45`, `D10`, `Caterpillar`).
2. Select a **Machine model** from the dropdown.

Each option shows a warning marker (⚠) if data is incomplete.

### Step 2 — Check the completeness badge

| Badge | Meaning |
|-------|---------|
| **Complete** | All required fields present — full recommendation will run |
| **Incomplete data** | Some fields missing — calculation blocked; missing fields listed |
| **Engineering data required** | Many critical fields missing — use Manual entry or update database |

If blocked, you will see an amber panel listing **Missing fields** and guidance to switch to **Manual entry**.

### Step 3 — Adjust optional limits

| Input | Default | Purpose |
|-------|---------|---------|
| **Fuse safety factor (%)** | 25 | Target fuse = alternator continuous × (1 + safety/100) |
| **Voltage drop limit (%)** | 3 | Maximum acceptable voltage drop during cranking |

Only change these if your engineering lead has specified different values. Typical safety factor range: **15–30%**.

### Step 4 — Read results

- **Green summary** — all checks passed; fuse recommendation shown  
- **Amber summary** — warnings or missing optional data; review with engineer  
- **Red summary** — one or more checks failed; do not install without review  

---

## Manual entry mode

Use this when:

- The vehicle is **not** in the library  
- The library record is **incomplete**  
- You want to verify a **proposed** cable or fuse before updating fleet data  

### Required inputs

| Field | Example | Description |
|-------|---------|-------------|
| Machine label | `Site truck #4` | Display name only |
| Safety factor (%) | `25` | Fuse sizing margin |
| Required cranking time (s) | `5` | Duration used for peak and fuse checks |
| System voltage (V) | `24` | Electrical system voltage |
| Voltage drop limit (%) | `3` | Maximum acceptable drop |
| Starter cranking current (A) | `200` | Peak current during start |
| Alternator continuous current (A) | `80` | Running load on starter cable |
| Starter peak current limit (A) | `500` | Maximum allowed cranking (site/machine limit) |
| Cable type | `Thermosetting 90°C XLPE EDR` | Used for K-factor lookup |
| Cable size (mm²) | `70` | Cross-sectional area |
| Cable current rating (A) | `314` | Continuous ampacity of installed cable |
| Cable length (m) | `6` | One-way length (out and return counted in voltage drop) |
| Cable operating temp (°C) | `60` | Conductor operating temperature |

### Optional inputs

| Field | Purpose |
|-------|---------|
| Measured cranking voltage (V) | Enables battery voltage check |
| Min battery voltage (V) | Threshold for battery pass/fail (default 16.48 V on 24 V systems) |
| Max allowed cranking time (s) | Enables battery cranking time check |
| K-factor override | Skips lookup table; use only when engineer specifies |

Click **Calculate recommendation**. Invalid inputs show a red error list — fix them before results appear.

---

## Understanding outputs

### 1. Summary box

Plain-language verdict, for example:

- *Suggested fuse 125 A — engineering approval required before installation.*  
- *Address failed checks: Does the fuse rating protect the cable?*  

For library mode, manufacturer, category, and site are shown when available.

### 2. Cable & fuse specification (GBA-0002)

This panel matches the PDF “simple web app” results:

**Cable**

| Output | Description |
|--------|-------------|
| Cable type | Insulation / construction label |
| Cable size (mm²) | Cross-section |
| Cable current rating (A) | Continuous rating used in checks |
| Cable length (mm) | Length converted from metres (× 1000) |
| Operating temp (°C) | Cable operating temperature |

**Fuse**

| Output | Description |
|--------|-------------|
| Suggested fuse size (A) | Closest standard rating from fuse library |
| Fuse make & model | Manufacturer, description, part number |
| Fuse operating temp | Temperature range from fuse datasheet |

**Suitability badges**

| Badge | Meaning |
|-------|---------|
| Cable suitability | Worst status across continuous, peak, and voltage-drop checks |
| Fuse suitability | Worst status across rating, withstand, I²t, protects-cable, and part lookup |

### 3. Engineering check cards

Each card shows:

- **Title** — the question being answered  
- **Status badge** — Pass / Fail / Warning / Unavailable  
- **Value** — YES/NO, amps, percent, or part number  
- **Message** — human-readable explanation  
- **Calculation details** (expandable) — formula and legacy Excel reference  

### 4. Documented assumptions

Lists values applied during the run, for example:

- K-factor from cable type lookup  
- Voltage drop limit percentage  
- Default peak cranking limit when not specified on vehicle  

Use this section when auditing or comparing results with the old Excel workbook.

---

## Engineering checks explained

Checks run in a logical order. Some appear only when the required inputs exist.

| Check | GBA-0002 section | Pass means |
|-------|------------------|------------|
| Vehicle data completeness | — | All required library fields present |
| Machine found in library | — | Model ID exists in database |
| Starter cranking within limit | §5 Starter motor | Cranking current ≤ machine peak limit |
| Cranking battery voltage | §4 Battery | Measured voltage ≥ minimum allowed |
| Cranking time within limit | §4 Battery | Measured time ≤ allowed time |
| Cable continuous current | §6 | Alternator current ≤ cable continuous rating |
| Cable inrush / peak | §7 | Cranking current ≤ K × size ÷ √time |
| Voltage drop | §9 | Drop % ≤ your limit |
| Fuse rating (closest match) | §10–11 | Standard fuse selected for target current |
| Fuse withstand (MEGA32V) | §12 | Fuse holds peak current for required cranking time |
| I²t required | §8 | Fuse thermal energy sufficient (supplementary) |
| Fuse protects cable | §13 | Selected fuse ≤ cable continuous rating |
| GB Part # | — | Fuse holder / part identified in catalogue |

**Key formulas** (also shown on each card):

- Cable peak capability = **K × cable size (mm²) ÷ √(cranking time in seconds)**  
- I²t required = **current² × time** (e.g. 1000 A × 5 s → 5,000,000 A²s)  
- Voltage drop % = **(I × L × 2 × R/km ÷ 1000) ÷ V × 100**  
- Target fuse current = **alternator continuous × (1 + safety factor % ÷ 100)**  

---

## Status colours and badges

| Status | Colour | Meaning | Action |
|--------|--------|---------|--------|
| **Pass** | Green | Requirement met | None for this item |
| **Fail** | Red | Requirement not met | Do not rely on this circuit; engineer review |
| **Warning** | Amber | Marginal or review needed | Discuss with qualified person |
| **Unavailable** | Grey | Data missing or check not run | Add data or use Manual entry |
| **Blocked** | Amber panel | Incomplete library vehicle | Complete data or switch mode |

---

## Worked examples

### Example A — Complete library vehicle (`B45E`)

1. Open **Vehicle library**  
2. Select **B45E** — badge shows **Complete**  
3. Leave safety factor at **25%**  

**Typical outcome:**

- Cranking **200 A** vs limit **500 A** → Pass  
- Alternator **80 A** vs cable **314 A** continuous → Pass  
- Cable peak at **5 s** → Pass  
- Fuse target ~**100 A**, GB part shown → Pass  
- **Cable & fuse specification** panel populated  

### Example B — Incomplete library vehicle

1. Select a machine marked ⚠ in the dropdown  
2. Badge shows **Incomplete data** or **Engineering data required**  
3. Amber **Blocked** panel lists missing fields (e.g. cable type, cable length)  
4. No cable/fuse specification panel — unsafe partial results are prevented  
5. Switch to **Manual entry** and enter known values, or update fleet data  

### Example C — Manual entry for a new site truck

1. Open **Manual entry**  
2. Enter measured cranking current, alternator rating, and proposed cable details  
3. Click **Calculate recommendation**  
4. Review all check cards and the GBA-0002 output panel  
5. Share results with your electrical engineer before ordering parts  

---

## What the tool does not do yet

- Replace a formal electrical design certificate or compliance sign-off  
- Calculate cranking current from starter motor mechanical power (uses measured/stored amps)  
- Recommend **parallel fuses** when a single fuse is insufficient  
- Apply full **cable derating** for ambient temperature, grouping, or enclosure  
- Verify **fault interrupting rating** at the battery terminals  
- Export results to **PDF** or email  
- Connect to live telematics — uses **recorded** fleet specifications only  

See **Version 3** items in `README.md` for the development roadmap.

---

## Updating fleet data (admins)

To add or correct a machine:

1. Update `Resources/Tool/APP_Fuse/Fuse_GUI_APP.xlsx` (sheet **MachinesOnSite**), **or** edit `fuse-tool/data/machines.json` directly  
2. Re-import from Excel if needed:

   ```bash
   cd fuse-tool
   pip install openpyxl
   npm run import:data
   ```

3. Run tests: `npm test`  
4. Restart: `npm run dev`  

See `docs/DATA_MIGRATION.md` for column mappings.

**Required fields for a “complete” vehicle:**

- Peak cranking current, alternator continuous current  
- Cable type, size, continuous rating, length, operating temperature  
- Peak current cutoff, electrical system voltage  
- Cranking time (measured or required)  

---

## Deploying for field use

To share without local Node.js installs:

```bash
cd fuse-tool
npm run build
```

Deploy `apps/web` to **Vercel** or **Netlify** (monorepo root: `fuse-tool`). Share the public URL with field users.

---

## Glossary

| Term | Meaning |
|------|---------|
| **Cranking current** | High current drawn by the starter while turning the engine |
| **Inrush / peak current** | Short burst of very high current at start |
| **Continuous current** | Steady current after the engine is running (mainly alternator) |
| **Alternator** | Charges the battery and powers electrical loads |
| **Fuse rating (A)** | Current the fuse is designed to carry long-term |
| **I²t** | Thermal energy (current² × time) — fuse must absorb cranking heat |
| **K-factor** | Constant for short-term cable overload capability |
| **Safety factor** | Extra margin (%) above alternator current when sizing fuse |
| **MEGA32V** | Littelfuse slow-blow fuse family; time-current curve used for withstand |
| **GB Part #** | GB Engineering internal part number for fuse / holder |
| **24 V system** | Common on heavy machinery (two 12 V batteries in series) |
| **Adiabatic** | Short-duration assumption used for cable peak capability |

---

## Further reading

| Topic | Document |
|-------|----------|
| Formulas and check IDs | `docs/CALCULATION_SPEC.md` |
| Standards (AS/NZS, etc.) | `docs/STANDARDS_AND_CALCULATIONS.md` |
| Excel → JSON import | `docs/DATA_MIGRATION.md` |
| Developer / API usage | `docs/USAGE.md` |
| Legacy Excel/MATLAB fixes | `docs/LEGACY_BUGS_FIXED.md` |
| Full project plan | `../docs/FUSE_TOOL_ANALYSIS_AND_IMPLEMENTATION_PLAN.md` |
| README (technical overview) | `README.md` |

---

## Disclaimer

This calculator follows standard electrical sizing logic but is a **design aid only**.

Before using any result in a real application, confirm:

- Applicable **AS/NZS**, IEC, and site standards  
- **Manufacturer datasheets** for fuse time-current, I²t, interrupting rating, and temperature  
- **Cable derating** for installation conditions  
- **Battery and starter condition** on the actual machine  
- **Engineering review** by a qualified electrical engineer or competent person  

**Final cable and fuse selection must be approved before implementation.** Incorrect protection can cause nuisance trips, failed starts, or thermal events.

---

*GB Engineering · Fuse Tool Version 2 · User Guide · GBA-0002*
