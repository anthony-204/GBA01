# Fuse & Cable Protection Tool — User Guide

**For first-time users** · No Excel or prior tool knowledge required

---

## What is this tool?

This application helps you check whether a **fleet vehicle’s starting circuit** (battery → cable → starter motor) is adequately protected and whether a suitable **fuse** can be recommended.

It answers questions such as:

- Is the starter motor drawing too much current when cranking?
- Is the battery voltage too low during cranking?
- Can the existing cable handle **continuous** load (alternator) and **peak** load (cranking)?
- What **fuse rating** and **part number** best fits this machine?

The tool is aimed at **heavy machinery and fleet vehicles** on mine sites and similar operations (e.g. trucks, rollers at tailings dam projects). Electrical system assumptions are typically **24 V** with high cranking currents (hundreds to ~1000 A for short periods).

---

## Is it ready to use?

**Yes — as a basic field calculator**, with these boundaries:

| Works now | Not yet available |
|-----------|-------------------|
| Pick a machine from the **fleet library** (37 models) | Typing in custom machine specs in the web UI |
| Adjust **fuse safety factor** (default 25%) | Editing machine data without updating the database file |
| View pass/fail checks with colour coding | Parallel fuse recommendations |
| See recommended fuse size (A) and GB part # | PDF / email export of results |
| Mobile-friendly web layout | User accounts or login |

Machine electrical data (cable size, cranking current, alternator rating, etc.) is **already stored** in the app’s database. You do **not** enter those values manually in Phase 1 — you only choose **which machine** to analyse.

Outputs are **recommendations**. A qualified engineer or technician should confirm results before changing parts on a vehicle.

---

## What you need before starting

### To run the web app on your computer

1. **Node.js 18 or newer** — [https://nodejs.org](https://nodejs.org) (LTS version)
2. A copy of this project (clone from GitHub or open the `fuse-tool` folder)
3. About 5 minutes for first-time setup

You do **not** need Excel, MATLAB, or Python unless you are updating the machine database from the original spreadsheet.

### To use in the field

- A phone, tablet, or laptop with a browser
- After deployment to a web host (optional), you only need the URL — no install

---

## How to start the tool (first time)

Open a terminal (Command Prompt, PowerShell, or Terminal) and run:

```bash
cd fuse-tool
npm install
npm run dev
```

Then open your browser at:

**http://localhost:3000**

You should see the **Fuse & Cable Protection** screen with a model dropdown.

### If something goes wrong

| Problem | What to try |
|---------|-------------|
| `npm` not found | Install Node.js and restart the terminal |
| Port 3000 in use | Stop other apps or run `npm run dev -- -p 3001` and open port 3001 |
| Blank page / error | Run `npm run build` and check the terminal for errors |
| Model list empty | Ensure `fuse-tool/data/bundle.json` exists (it is included in the repo) |

To verify the calculation engine is healthy:

```bash
npm test
```

You should see **12 tests passed**.

---

## How to use the web app (step by step)

### Step 1 — Find your machine

1. Use **Search model** to filter the list (e.g. type `B45` or `D10`).
2. Open **Machine model** and select your vehicle (e.g. `B45E`, `D10T`).

Each model corresponds to a row in the fleet database (site, manufacturer, cable size, measured cranking data, etc.).

### Step 2 — Set fuse safety factor (optional)

**Fuse safety factor (%)** defaults to **25**.

- This means the tool targets a fuse rating of **125%** of the alternator’s continuous current (a 25% safety margin).
- Only change this if your engineering lead has specified a different margin.
- Typical range: **15–30%**. Leave at **25** if unsure.

### Step 3 — Read the summary

The **Summary** box at the top gives a short verdict, for example:

- *Install 125 A fuse (GB161280).* — checks passed and a fuse was selected
- *Address: Can the cable handle the continuous current demand?* — one or more checks failed

Below the summary you may see **manufacturer**, **category** (Truck, Roller, etc.), and **site** (e.g. tailings dam location).

### Step 4 — Review each check card

Each card is one engineering check. The badge on the right shows the status:

| Badge | Meaning | What to do |
|-------|---------|------------|
| **Pass** (green) | Requirement met | No action for this item |
| **Fail** (red) | Requirement not met | Follow the message (e.g. larger cable, investigate starter) |
| **Warning** (amber) | Review needed | Discuss with engineer (e.g. high voltage drop, long cranking) |
| **Data unavailable** (yellow) | Missing fleet data | Update machine record or use engineering judgement |

Tap **Specification** on any card to see the formula or rule used.

### Step 5 — Note fuse and part details

Scroll to the cards for:

- **Closest match for fusing rating (A)** — recommended fuse size in amps
- **Can the fuse handle peak current for required cranking time?** — whether the fuse survives cranking duration
- **GB Part # (fuse holder)** — internal GB part number and manufacturer fuse details

The **Derived values** section shows supporting numbers (K-factor, cable peak capability, voltage drop %, etc.).

---

## What you input vs what the tool uses

### What **you** enter in the web app (Phase 1)

| Input | Required? | Default | Description |
|-------|-----------|---------|-------------|
| **Machine model** | Yes | First model in list | Select from fleet library |
| **Fuse safety factor (%)** | No | 25 | Extra margin above alternator continuous current when sizing fuse |

That is all. Two fields.

### What the tool loads automatically (from the database)

When you select a model, the engine reads stored values for that machine, including:

| Data | Example use |
|------|-------------|
| Manufacturer, site, category | Identification |
| Peak cranking current (A) | Starter load during engine start |
| Cranking time (s) | How long high current lasts |
| Cranking voltage (V) | Battery health during start |
| Alternator continuous current (A) | Load after engine is running |
| Cable size (mm²) | Cross-section of starter cable |
| Cable continuous rating (A) | How much current cable can carry continuously |
| Cable length (m) | Voltage drop estimate |
| Cable type | K-factor for peak current formula |
| Peak current cut-off (A) | Maximum allowed cranking (often ~1000 A) |

You do not type these in the UI. If they are wrong or missing, results may show **Data unavailable** or incorrect passes/fails — the database must be updated (see [Updating machine data](#updating-machine-data-for-admins) below).

### Reference data (built into the app, not user input)

- **Fuse library** — Littelfuse MEGA 32V ratings, I²t, part numbers
- **Cable capacity table** — resistance per cable size
- **Copper K-factors** — for peak current calculation
- **MEGA32V time-current curve** — how long a fuse can withstand cranking current

---

## What the tool outputs

### 1. Overall summary

- **Overall status** — worst result across all checks (pass / fail / warning)
- **Recommended action** — plain-language next step

### 2. Check results (one card each)

Typical checks, in order:

| Check | Pass means | Fail often means |
|-------|------------|------------------|
| Machine found in library | Model exists in database | Wrong name or machine not added yet |
| Starter cranking within limit | Cranking current ≤ limit (~1000 A) | Starter motor or configuration issue |
| Cranking battery voltage acceptable | Voltage above minimum (e.g. 16.48 V on 24 V systems) | Weak battery or poor connections |
| Cable handles **continuous** current | Alternator load ≤ cable rating | Cable too small for running load — **size up** |
| Cable handles **inrush / cranking** current | Cranking current ≤ cable peak capability | Cable too small for start — **size up** |
| Voltage drop (informational) | Drop within ~3% guideline | Long or undersized cable — review |
| Fuse rating (A) | Closest standard size to calculated target | — |
| Fuse withstands cranking time | Fuse survives required cranking duration | Fuse may need larger size |
| I²t thermal cross-check (supplementary) | Fuse thermal energy sufficient | Marginal — engineer review |
| GB Part # | Part identified in catalogue | No matching part for rating |

### 3. Fuse recommendation block

| Output | Description |
|--------|-------------|
| **Target rating (A)** | Calculated ideal fuse size before rounding to standard size |
| **Selected rating (A)** | Standard fuse size chosen (may be escalated if smaller fuse fails time check) |
| **Withstand time (s)** | How long selected fuse can carry peak current per manufacturer curve |
| **Required cranking time (s)** | At least 5 s, or measured cranking time if longer |
| **GB part / manufacturer part** | Ordering information |

### 4. Derived values (technical detail)

| Value | Meaning |
|-------|---------|
| K-factor used | Constant in peak cable formula (depends on cable insulation type) |
| Cable peak capability (A) | Max current cable can carry for the cranking duration |
| Cranking time used (s) | Time used in peak cable calculation |
| Voltage drop (%) | Estimated percentage loss along cable during cranking |

### 5. Implementation notes

Short list of fixes applied versus old Excel/MATLAB tools. For auditors and engineers; casual users can ignore.

---

## How to read results — worked example

**Machine:** `B45E` (Bell truck)

**Typical outcome:**

- Cranking current **200 A** — well below **1000 A** limit → **Pass**
- Alternator **80 A**, cable rated **314 A** continuous → **Pass**
- Cable peak check at **5 s** cranking time → **Pass**
- Fuse target ~**100 A**, selected rating from library → **Pass** with GB part number

**If cable continuous failed:**

- Summary would say to address continuous cable check
- Message: alternator current **exceeds** cable rating → recommend **next cable size up**

**If starter cranking failed:**

- Cranking current above site limit → investigate **starter motor** or engine mechanical condition

---

## Status colours (quick reference)

```
Pass     → Green   → OK
Fail     → Red     → Action required before relying on this circuit
Warning  → Amber   → Engineer review
Unavailable → Yellow → Data missing in fleet database
```

---

## What this tool does **not** do (yet)

- **Does not** replace a full electrical design sign-off or compliance certificate
- **Does not** model every parallel fuse, temperature de-rating, or short-circuit coordination rule from the old Excel workbook
- **Does not** let you enter a brand-new machine entirely through the web form — the machine must exist in `data/machines.json` (or be added via database update)
- **Does not** connect to live vehicle telematics — it uses **recorded** fleet specifications

Phase 2 will add manual entry, easier data updates, and more Excel feature parity.

---

## Updating machine data (for admins)

If a machine is missing or specs are wrong:

1. Update the master Excel file: `Resources/Tool/APP_Fuse/Fuse_GUI_APP.xlsx` (sheet **MachinesOnSite**), **or** edit `fuse-tool/data/machines.json` directly
2. If using Excel, regenerate JSON:

   ```bash
   cd fuse-tool
   pip install openpyxl
   npm run import:data
   ```

3. Run tests: `npm test`
4. Restart the web app: `npm run dev`

See `docs/DATA_MIGRATION.md` for column mappings.

---

## Deploying for others to use (optional)

To share without everyone installing Node.js:

1. Build: `npm run build`
2. Deploy the `apps/web` Next.js app to **Vercel** or **Netlify** (connect GitHub repo, set root to `fuse-tool/apps/web` or monorepo as appropriate)
3. Share the public URL

Fleet users then only need a browser.

---

## Glossary (plain language)

| Term | Meaning |
|------|---------|
| **Cranking current** | High current drawn by the starter motor while turning the engine |
| **Inrush / peak current** | Short burst of very high current when starting |
| **Continuous current** | Steady current after the engine is running (mainly alternator charging) |
| **Alternator** | Generator that powers electrical loads and charges the battery |
| **Fuse rating (A)** | Current at which the fuse is designed to operate long-term |
| **I²t** | Thermal energy measure — fuse must absorb cranking heat without blowing |
| **K-factor** | Constant for how much short-term overload a cable can take |
| **Safety factor** | Extra margin (%) above alternator current when picking fuse size |
| **GB Part #** | GB Engineering internal part number for fuse holder / fuse |
| **24 V system** | Common voltage for heavy machinery (two 12 V batteries in series) |

---

## Getting help

| Topic | Document |
|-------|----------|
| Formulas and rules | `docs/CALCULATION_SPEC.md` |
| Standards (AS/NZS, etc.) | `docs/STANDARDS_AND_CALCULATIONS.md` |
| Excel → JSON import | `docs/DATA_MIGRATION.md` |
| Developer / CLI usage | `docs/USAGE.md` |
| Full project plan | `../docs/FUSE_TOOL_ANALYSIS_AND_IMPLEMENTATION_PLAN.md` |
| What was built in Phase 1 | `docs/PHASE1_COMPLETED.md` |

---

## Important disclaimer

This tool provides **decision support** based on imported data and documented engineering assumptions. Conditions on site (temperature, cable condition, loose terminals, aged batteries) can differ from the database.

**Always verify recommendations with a qualified person before installing fuses or changing cables.** Incorrect protection can cause nuisance trips, failed starts, or thermal events.

---

*GB Engineering · Fuse Tool Phase 1 · User Guide*
