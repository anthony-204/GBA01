# GBA-0002 Client v2 — Input Validation Guardrails

**Branch:** `client/v2`  
**Source report:** *Verification and Justification of Input Validation Guardrails for the GB Auto Fuse and Cable Protection Tool*  
**Engine module:** `packages/engine/src/gba0002/validation.ts`  
**UI:** `apps/web/src/components/Gba0002Calculator.tsx`

## Purpose

Client v1 allowed absurd inputs to produce misleading “Pass” outcomes. Client v2 implements a **three-layer validation model**:

| Layer | Behaviour | UI signal |
|-------|-----------|-----------|
| **Block** | Physically impossible or out-of-scope inputs | Red errors; calculation withheld |
| **Review** | Plausible but abnormal values or outputs | Amber warnings; result shown with review status |
| **Pass** | Credible inputs and domain-plausible outputs | Green pass (engineering approval still required) |

**Design rule:** No calculation result may override a failed validation state.

## Requirement traceability

| ID | Rule | Type | Code | Test |
|----|------|------|------|------|
| VIN-001 | Battery cranking voltage must be > 0 V | Hard block | `validation.ts` → `validateGba0002Inputs` | `gba0002-validation.test.ts` VIN-001 |
| VIN-002 | Cranking voltage ≤ 1.5 × nominal system class (18 V / 36 V) | Hard block | `validation.ts` | VIN-002 |
| VIN-003 | Cranking time > 0 s | Hard block | `validation.ts` | VIN-003 |
| VIN-004 | Cranking time ≤ 30 s | Hard block | `validation.ts` | VIN-004 |
| VIN-005 | Operating temp −40 °C to +125 °C (normal mode) | Hard block | `validation.ts` | VIN-005 |
| VIN-006 | Simple Mode: safety factor ∈ {25%, 50%} only | Hard block | `validation.ts` | VIN-006 |
| VIN-007 | Cranking time > 10 s → review warning | Warning | `validation.ts` | VIN-007 |
| VIN-008 | Advanced Mode: safety factor outside 10–50% → review | Warning | `validation.ts` | VIN-008 |
| VIN-009 | Derived max one-way length > 100 m → block pass | Output sanity | `validateGba0002Outputs` | VIN-009 |
| VIN-010 | Operating temp > selected cable/fuse rating → block | Component-aware | `validateGba0002Outputs` | VIN-010 |
| VIN-011 | Low / high battery voltage bands (12 V / 24 V) | Warning | `validation.ts` | Manual UI check |
| VIN-012 | Machine library cable length > 30 m → block | Hard block | `validation.ts` | Fleet data audit |

### Rationale labelling

- **Standards-informed:** AS/NZS 3008.1.1 (cable selection criteria), ISO 16750-2/4 (automotive electrical/climatic context), IEC 60038 (12 V / 24 V nominal classes).
- **Datasheet-informed:** Littelfuse ATO family −40 °C to +125 °C operating range.
- **GB Auto application guardrails:** 1.5× voltage ceiling, 30 s cranking cap, 100 m derived length cap — documented as engineering guardrails, not universal standards limits.

## Changes from client v1

1. New `validation.ts` with layered input and output checks.
2. Cranking time exposed as user input (default 5 s).
3. **Simple / Advanced** input modes for safety factor.
4. Validation errors and warnings surfaced in UI; results hidden when blocked.
5. `overallStatus` never `pass` when warnings are present (review required).
6. `Gba0002Result.validation` and `systemVoltageV` fields for traceability.
7. **GBA-0002 PDF (2) alignment:** K-factor lookup by cable type (MachinesOnSite AD → Copper_k_factor); thermal check `(k×S/I)² ≥ t` equivalent to `I ≤ k×S/√t`; cable continuous-current and fuse temperature gates — see `docs/GBA0002_ENGINEERING_THEORY.md`.

## Running tests

```bash
cd fuse-tool
npm test --workspace=@fuse-tool/engine
```

Expected: all `gba0002*.test.ts` suites pass (v1 regression + v2 validation matrix).

## Evidence checklist (completed)

| Item | Location |
|------|----------|
| Requirement IDs | Table above |
| Source / rationale | This document § Rationale labelling |
| Code location | `packages/engine/src/gba0002/` |
| Test evidence | `packages/engine/tests/gba0002-validation.test.ts` |
| Impact note | Prior absurd-input “Pass” cases now Block or Review |
| UI behaviour | Blocked state hides cable/fuse recommendation panels |

## Open limitations

- Extended temperature mode (126–150 °C) is not enabled by default; requires future library flags per cable/fuse family.
- 42 V / 48 V architectures are out of scope.
- Manual starter-current entry is not in the GBA-0002 four-input UI; inrush comes from the machine library.
