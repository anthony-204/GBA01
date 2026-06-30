/**
 * Manual entry validation — Version 2.
 */

import type { ManualEntryInput } from "./types.js";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

function reqNum(
  value: unknown,
  name: string,
  errors: string[],
  opts?: { min?: number; max?: number },
): number | null {
  if (value === "" || value === null || value === undefined) {
    errors.push(`${name} is required.`);
    return null;
  }
  const n = Number(value);
  if (!Number.isFinite(n)) {
    errors.push(`${name} must be a number.`);
    return null;
  }
  if (opts?.min !== undefined && n < opts.min) {
    errors.push(`${name} must be at least ${opts.min}.`);
  }
  if (opts?.max !== undefined && n > opts.max) {
    errors.push(`${name} must be at most ${opts.max}.`);
  }
  return n;
}

function optNum(value: unknown, name: string, errors: string[]): number | undefined {
  if (value === "" || value === null || value === undefined) return undefined;
  const n = Number(value);
  if (!Number.isFinite(n)) {
    errors.push(`${name} must be a number when provided.`);
    return undefined;
  }
  return n;
}

export function validateManualEntry(raw: Partial<ManualEntryInput>): ValidationResult {
  const errors: string[] = [];

  reqNum(raw.safetyFactorPercent, "Safety factor (%)", errors, { min: 0, max: 200 });
  reqNum(raw.crankingTimeRequiredS, "Required cranking time (s)", errors, { min: 0.1 });
  reqNum(raw.electricalSystemV, "System voltage (V)", errors, { min: 1 });
  reqNum(raw.voltageDropLimitPercent, "Voltage drop limit (%)", errors, { min: 0.1, max: 100 });
  reqNum(raw.peakCrankingCurrentA, "Starter cranking current (A)", errors, { min: 1 });
  reqNum(raw.alternatorContinuousA, "Alternator continuous current (A)", errors, { min: 0 });
  reqNum(raw.cableSizeMm2, "Cable size (mm²)", errors, { min: 0.1 });
  reqNum(raw.cableContinuousA, "Cable current rating (A)", errors, { min: 1 });
  reqNum(raw.cableLengthM, "Cable length (m)", errors, { min: 0 });
  reqNum(raw.operatingTempC, "Cable operating temperature (°C)", errors, { min: -40, max: 250 });
  reqNum(raw.peakCurrentCutoffA, "Starter peak current limit (A)", errors, { min: 1 });

  if (!raw.cableType || String(raw.cableType).trim() === "") {
    errors.push("Cable type is required.");
  }

  optNum(raw.crankingVoltageMeasuredV, "Measured cranking voltage (V)", errors);
  optNum(raw.minBatteryVoltageV, "Minimum battery voltage (V)", errors);
  optNum(raw.maxAllowedCrankingTimeS, "Maximum allowed cranking time (s)", errors);
  optNum(raw.kFactorCopper, "K-factor override", errors);

  return { valid: errors.length === 0, errors };
}
