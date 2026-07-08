# GBA-0002 Client v1 — Prototype Build

**Branch:** `client/v1` (formerly `client/v0`)  
**App version:** 1.1.0 (released 14/07/2026)

## Purpose

Single-page GBA-0002 prototype: four user inputs, all machines that satisfy v1.1 calculation prerequisites (Q, alternator, cable type/size), and cable/fuse results.

**v1.1 changes:** Column **Q** for sizing; battery / starter / cranking-time checks; manufacturer in results; Cable_Capacity upgrade fix.

## Docs

- [`V0_CALCULATIONS.md`](./V0_CALCULATIONS.md) — formulas (update: Q is sizing current as of v1.1)
- [`V0_MACHINE_PARAMETERS.md`](./V0_MACHINE_PARAMETERS.md) — machine data table
- [`GBA0002_SPEC_CLARIFICATION_MEMO.md`](./GBA0002_SPEC_CLARIFICATION_MEMO.md)
- [`CHANGELOG.md`](./CHANGELOG.md) — release history

## Data patch (v1.1)

After Excel import:

```bash
npm run patch:machines-v1.1
```

Sets `cutoffVoltageV = 16` where blank and derives column **Q** from power/efficiency.

## Run

```bash
cd fuse-tool
npm install
npm run patch:machines-v1.1
npm test --workspace=@fuse-tool/engine -- gba0002
npm run build
npm run dev --workspace=@fuse-tool/web
```

## Deprecated branches

| Old branch | New name |
|------------|----------|
| `client/v0` | **`client/v1`** (active) |
| `client/v1` | `client/old1` |
| `client/v2` | `client/old2` |
