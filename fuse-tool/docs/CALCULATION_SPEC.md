# Calculation specification — Version 2

Authoritative rules for `@fuse-tool/engine`. Supersedes legacy Excel/MATLAB where noted.

## Input modes

| Mode | Entry point | Gate |
|------|-------------|------|
| **library** | `calculate(db, { mode: "library", modelId })` | `assessVehicleCompleteness()` — blocked if incomplete |
| **manual** | `calculate(db, { mode: "manual", inputs })` | `validateManualEntry()` — blocked if invalid |

Legacy `recommend()` wraps library mode only.

## Constants

See `data/constants.json`. Defaults are **not** hard-coded in calculation logic — they load from constants and are listed in `derived.assumptionsUsed`.

## Completeness (V2)

Required library fields: peak cranking, alternator, cable type/size/rating/length/temp, peak cutoff, system voltage, cranking time.

## Checks

| ID | Formula | Notes |
|----|---------|--------|
| `data-completeness` | all required fields | Blocks calculation when incomplete |
| `cranking-limit` | I_crank ≤ I_limit | Starter motor limit |
| `battery-voltage` | V_crank ≥ V_min | When data available |
| `battery-cranking-time` | t_meas ≤ t_allowed | When data available |
| `cable-continuous` | I_alt ≤ I_cable | |
| `cable-peak` | I_crank ≤ K×S/√t | Adiabatic short-time |
| `voltage-drop` | ΔV% vs limit | Configurable limit |
| `fuse-rating` | (1+safety/100)×I_alt → closest | |
| `fuse-withstand` | graph time ≥ t_req | MEGA32V |
| `fuse-i2t` | I²t_fuse ≥ I²×t | Supplementary |
| `fuse-protects-cable` | I_fuse ≤ I_cable | V2 |
| `fuse-gb-part` | library lookup | |

Source: `packages/engine/src/calculate.ts`, `cableChecks.ts`, `fuseSelection.ts`, `completeness.ts`, `validation.ts`.

## PDF outputs

`buildPdfOutputs()` — cable/fuse fields per GBA-0002 simple web app.

## Tests

`npm test` — Phase 1 golden vectors + V2 completeness, validation, blocked vehicles, fuse-protects-cable.
