# GBA-0002 Client v0 — Prototype Build

**Branch:** `client/v0`  
**Spec:** GBA-0002 Vehicle database (2).pdf + prototype functionality spec

## Purpose

Minimal single-page prototype implementing the GBA-0002 simplified workflow: four user inputs, local data lookups, cable/fuse calculations, and required result fields.

**Engineering theory** (including why max voltage drop = battery V − 16 V): see [`GBA0002_ENGINEERING_THEORY.md`](./GBA0002_ENGINEERING_THEORY.md).

## Included

| Area | Location |
|------|----------|
| Calculator | `packages/engine/src/gba0002/calculate.ts` |
| Helpers (K-factor by cable type, temperature) | `packages/engine/src/gba0002/helpers.ts` |
| UI | `apps/web/src/components/Gba0002Calculator.tsx` |
| Tests | `packages/engine/tests/gba0002.test.ts`, `docs/TEST_CASES.md` |

## Key calculation rules (PDF update)

| Rule | Implementation |
|------|----------------|
| K-factor | Cable type (MachinesOnSite AD) → Copper_k_factor A:B — **not** machine model |
| Thermal pass | `(k×S/I)² ≥ 5 s` ⟺ `I ≤ k×S/√5` |
| Voltage drop budget | `battery V during cranking − 16 V` |
| Fuse | `cable ≥ fuse ≥ alternator × (1 + safety%)` + withstand + temperature |

## Status labels

`PASS` · `FAIL` · `DATA MISSING` · `ENGINEERING REVIEW REQUIRED`

## Run

```bash
cd fuse-tool
npm install
npm test --workspace=@fuse-tool/engine -- gba0002
npm run build
npm run dev --workspace=@fuse-tool/web
```

## Omitted (see v1 / v2)

- Polished production UI  
- PDF export, auth, admin editor  
- Full v2 validation guardrail layer  
