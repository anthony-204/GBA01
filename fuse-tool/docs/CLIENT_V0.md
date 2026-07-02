# GBA-0002 Client v0 — Barebones Build

**Branch:** `client/v0`

## Purpose

Version 0 is the **smallest correct** implementation of the GBA-0002 client calculation flow. It exists as a reference baseline before v1 UI polish and v2 validation guardrails.

## What is included

- `packages/engine/src/gba0002/calculate.ts` — core cable thermal, voltage-drop length, and fuse selection logic
- `apps/web/src/components/Gba0002Calculator.tsx` — four inputs, compact results (cable, length, fuse)
- Three engine smoke tests in `packages/engine/tests/gba0002.test.ts`

## What is deliberately omitted

| Feature | v0 | v1 | v2 |
|---------|----|----|-----|
| PDF line-item trace | — | ✓ | ✓ |
| Layered validation guardrails | — | — | ✓ |
| Advanced safety-factor mode | — | — | ✓ |
| Deploy / user-guide docs | minimal | full | full |

## Validation

v0 only enforces:

- Positive finite battery voltage during cranking
- Machine must be in the 9-vehicle client list
- Standard GBA-0002 calculation pass/fail (no separate review layer)

## Run

```bash
cd fuse-tool
npm install
npm test --workspace=@fuse-tool/engine -- gba0002
npm run dev --workspace=@fuse-tool/web
```

## Relationship to other branches

- **`client/v1`** adds full calculation trace UI and client deliverable documentation.
- **`client/v2`** adds the verification-report validation model on top of v1.

v0 should be used when you need to verify **calculation correctness with minimal surface area**, not for field deployment without engineering oversight.
