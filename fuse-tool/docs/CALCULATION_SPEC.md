# Calculation specification — Phase 1 (mine-site / library mode)

Authoritative rules for `@fuse-tool/engine`. Supersedes legacy Excel/MATLAB where noted.

## Input mode

Phase 1: **mine-site library** — select `modelId`, optional `safetyFactorPercent` (default 25).

## Constants

See `data/constants.json`. Key values: safety factor 25%, cranking limit 1000 A, min cranking time 5 s, K fallback 143.

## Checks

| ID | Formula | Inputs | Legacy fix |
|----|---------|--------|------------|
| `cranking-limit` | I_crank ≤ I_limit | T, Q | Excel G21 |
| `battery-voltage` | V_crank ≥ V_min | W, I | G19 compared manufacturer to voltage — **fixed** |
| `cable-continuous` | I_alt ≤ I_cable | Z, AG | MATLAB missed col AG |
| `cable-peak` | I_crank ≤ K×S/√t | T, AE, time | G13=0.015s bug, G31 wrong compare — **fixed** |
| `voltage-drop` | ΔV% formula | length, R, V | G35 |
| `fuse-rating` | 1.25× I_alt → closest | Z, library | G39–G40 |
| `fuse-withstand` | graph time ≥ t_req | MEGA32V | G42–G52 |
| `fuse-i2t` | I²t cross-check | supplementary | MATLAB |
| `fuse-gb-part` | library lookup | | G61 |

Full detail in source comments: `packages/engine/src/recommend.ts`, `cableChecks.ts`, `fuseSelection.ts`.

## Tests

`npm test` — golden vectors for B45E, D10T, synthetic high cranking.
