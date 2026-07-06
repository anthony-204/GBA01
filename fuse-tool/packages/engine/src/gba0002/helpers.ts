/**
 * GBA-0002 shared helpers — K-factor lookup, thermal equivalence, temperature parsing.
 *
 * K-factor (PDF line item 13): MachinesOnSite cable type (AD) → Copper_k_factor (A:B).
 * Thermal check (PDF line items 14–15): (k×S/I)² ≥ t  ⟺  I ≤ k×S/√t (PDF §7 peak capability).
 */

import type { CopperKFactorRow } from "../types.js";
import { lookupKFactor } from "../lookups.js";
import { computeCablePeakCapabilityA } from "../cableChecks.js";

export { computeCablePeakCapabilityA };

export interface TemperatureLimit {
  min: number | null;
  max: number | null;
  parseable: boolean;
}

export function parseTemperatureLimit(value: string | number | null | undefined): TemperatureLimit {
  if (value === null || value === undefined) {
    return { min: null, max: null, parseable: false };
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return { min: null, max: value, parseable: true };
  }
  const nums = [...String(value).matchAll(/-?\d+/g)].map((m) => Number(m[0]));
  if (nums.length === 0) return { min: null, max: null, parseable: false };
  if (nums.length === 1) return { min: null, max: nums[0], parseable: true };
  return { min: Math.min(...nums), max: Math.max(...nums), parseable: true };
}

export function temperatureSupported(userC: number, limit: TemperatureLimit): boolean | null {
  if (!limit.parseable) return null;
  if (limit.min !== null && userC < limit.min) return false;
  if (limit.max !== null && userC > limit.max) return false;
  return true;
}

/** K-factor from Copper_k_factor by cable type — no default fallback. */
export function lookupKFactorStrict(
  cableType: string | undefined,
  kFactors: CopperKFactorRow[],
): number | null {
  if (!cableType) return null;
  const k = lookupKFactor(cableType, kFactors, Number.NaN);
  return Number.isFinite(k) ? k : null;
}

/** PDF §7: short-time peak current capability — see cableChecks.ts. */
export function cableThermalWithstandPass(
  k: number,
  sizeMm2: number,
  crankingCurrentA: number,
  crankingTimeS: number,
): boolean {
  return crankingCurrentA <= computeCablePeakCapabilityA(k, sizeMm2, crankingTimeS);
}

export function requiredFuseCurrentA(alternatorA: number, safetyFactorPercent: number): number {
  return alternatorA * (1 + safetyFactorPercent / 100);
}
