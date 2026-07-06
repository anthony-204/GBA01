/**
 * GBA-0002 prototype helpers — temperature parsing and strict K-factor lookup.
 */

import type { CopperKFactorRow } from "../types.js";
import { lookupKFactor } from "../lookups.js";

export type PrototypeStatus = "PASS" | "FAIL" | "DATA MISSING" | "ENGINEERING REVIEW REQUIRED";

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

/** K-factor from Copper_k_factor only — no default guess. */
export function lookupKFactorStrict(
  cableType: string | undefined,
  kFactors: CopperKFactorRow[],
): number | null {
  if (!cableType) return null;
  const k = lookupKFactor(cableType, kFactors, Number.NaN);
  return Number.isFinite(k) ? k : null;
}

export function formatCableDisplay(
  status: "no-change" | "upgraded" | "unsuitable",
  cableType: string | null,
  sizeMm2: number | null,
): string {
  if (status === "unsuitable") {
    return "Existing cable is not suitable. An appropriate fit needs to be determined.";
  }
  if (!cableType || sizeMm2 === null) return "—";
  if (status === "no-change") {
    return `No change in cable type or size — ${cableType}, ${sizeMm2} mm²`;
  }
  return `${cableType}, ${sizeMm2} mm²`;
}

export function requiredFuseCurrentA(alternatorA: number, safetyFactorPercent: number): number {
  return alternatorA * (1 + safetyFactorPercent / 100);
}
