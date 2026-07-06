# GBA-0002 Client v0 — Prototype Build

**Branch:** `client/v0`  
**Spec:** `gb_auto_prototype_functionality_spec.md` + GBA-0002 calculation guide

## Purpose

Minimal single-page prototype implementing the GBA-0002 simplified workflow: four user inputs, local data lookups, cable/fuse calculations, and required result fields.

## Included

| Area | Location |
|------|----------|
| Calculator | `packages/engine/src/gba0002/calculate.ts` |
| Helpers (K-factor, temperature) | `packages/engine/src/gba0002/helpers.ts` |
| UI | `apps/web/src/components/Gba0002Calculator.tsx` |
| Tests | `packages/engine/tests/gba0002.test.ts`, `docs/TEST_CASES.md` |

## Calculation flow

1. Max voltage drop = battery V during cranking − 16 V  
2. Cable resistance from `Cable_Capacity` by size  
3. K-factor from `Copper_k_factor` by cable type (no default guess)  
4. Thermal withstand \((k×S/I)²\) vs 5 s cranking time  
5. Existing cable current rating vs alternator continuous current  
6. Operating temperature vs cable and fuse ranges  
7. Replacement cable search from `Cable_Capacity` when existing fails  
8. Fuse: cable ≥ fuse ≥ alternator × (1 + safety factor), withstand ≥ 5 s  

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
