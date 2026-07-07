# GBA-0002 Client v0 — Prototype Build

**Branch:** `client/v0`  
**Spec:** GBA-0002 Vehicle database (2).pdf + prototype functionality spec

## Purpose

Minimal single-page prototype: four user inputs, nine sample machines, local lookups, cable/fuse results.

**Theory:** [`GBA0002_ENGINEERING_THEORY.md`](./GBA0002_ENGINEERING_THEORY.md) · **Data:** [`DATA_REPORT.md`](./DATA_REPORT.md) · **LaTeX brief:** [`engineering/GBA_FUSE_TOOL_ENGINEERING_BRIEF.tex`](./engineering/GBA_FUSE_TOOL_ENGINEERING_BRIEF.tex)

## Code layout (v0 only)

```
apps/web/src/
  app/page.tsx              → Gba0002Calculator
  components/Gba0002Calculator.tsx
  lib/db.ts
packages/engine/src/gba0002/
  calculate.ts, helpers.ts, constants.ts, types.ts
docs/
  CLIENT_V0.md, DATA_REPORT.md, GBA0002_ENGINEERING_THEORY.md, TEST_CASES.md
```

Full-engineering UI (`Calculator.tsx`, `ManualEntryForm.tsx`, etc.) and main-branch docs are **not** included on this branch.

## Run

```bash
cd fuse-tool
npm install
npm test --workspace=@fuse-tool/engine -- gba0002
npm run build
npm run dev --workspace=@fuse-tool/web
```

## See also

- **`client/v1`** — trace UI + client deliverable docs  
- **`client/v2`** — validation guardrails  
- **`main`** — full 37-vehicle engineering tool  
