/**
 * GBA-0002 client v2 — layered input/output validation guardrails.
 *
 * Implements the verification report:
 * "Verification and Justification of Input Validation Guardrails for the
 * GB Auto Fuse and Cable Protection Tool"
 *
 * Three layers:
 * 1. Hard block — physically impossible or category-wrong inputs
 * 2. Warning / review — plausible but abnormal for vehicle starter circuits
 * 3. Pass — only when inputs are credible and outputs are domain-plausible
 */

import type { FuseRecord, MachineRecord } from "../types.js";
import { parseNumber } from "../parseValue.js";
import {
  GBA0002_CRANKING_TIME_HIGH_RISK_S,
  GBA0002_CRANKING_TIME_MAX_S,
  GBA0002_CRANKING_TIME_WARN_S,
  GBA0002_LENGTH_WARN_M,
  GBA0002_MAX_DERIVED_LENGTH_M,
  GBA0002_SAFETY_FACTOR_OPTIONS,
  GBA0002_SYSTEM_VOLTAGE_CLASSES,
  GBA0002_TEMP_MAX_C,
  GBA0002_TEMP_MIN_C,
  GBA0002_ADVANCED_SAFETY_MAX,
  GBA0002_ADVANCED_SAFETY_MIN,
  GBA0002_ADVANCED_SAFETY_REVIEW_HIGH,
  GBA0002_ADVANCED_SAFETY_REVIEW_LOW,
} from "./constants.js";
import type { Gba0002InputMode, Gba0002UserInputs } from "./types.js";

export interface Gba0002ValidationResult {
  errors: string[];
  warnings: string[];
}

export function resolveSystemVoltageV(machine: MachineRecord): 12 | 24 {
  const v = parseNumber(machine.electricalSystemV);
  if (v === 12 || v === 24) return v;
  return 24;
}

function isFiniteNumber(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

/** Parse upper temperature limit from fuse range string, e.g. "-40°C to +125°C". */
export function parseComponentMaxTempC(range: string | null | undefined): number | null {
  if (!range) return null;
  const matches = [...range.matchAll(/(?:to\s*)?\+?\s*(\d+)\s*°?\s*C/gi)];
  if (matches.length === 0) return null;
  const last = matches[matches.length - 1];
  return Number(last[1]);
}

export function validateGba0002Inputs(
  inputs: Gba0002UserInputs,
  machine: MachineRecord,
): Gba0002ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const mode: Gba0002InputMode = inputs.inputMode ?? "simple";
  const systemV = resolveSystemVoltageV(machine);
  const crankingTimeS = inputs.crankingTimeS ?? 5;

  if (!GBA0002_SYSTEM_VOLTAGE_CLASSES.includes(systemV)) {
    errors.push("Only 12 V and 24 V systems are supported in this version.");
  }

  if (!isFiniteNumber(inputs.batteryVoltageDuringCrankingV)) {
    errors.push("Battery voltage during cranking must be a finite number.");
  } else if (inputs.batteryVoltageDuringCrankingV <= 0) {
    errors.push(
      "Battery voltage during cranking must be positive. Check measurement polarity or units.",
    );
  } else {
    const vmax = 1.5 * systemV;
    if (inputs.batteryVoltageDuringCrankingV > vmax) {
      errors.push(
        `Battery cranking voltage exceeds plausibility ceiling (${vmax} V for a ${systemV} V system). Check the decimal point or units.`,
      );
    } else if (systemV === 12) {
      if (inputs.batteryVoltageDuringCrankingV < 8) {
        warnings.push("Battery voltage is very low for a 12 V system — verify measurement.");
      } else if (inputs.batteryVoltageDuringCrankingV < 10) {
        warnings.push("Battery voltage is low during cranking — starter performance may be impaired.");
      } else if (inputs.batteryVoltageDuringCrankingV > 16) {
        warnings.push(
          "Battery voltage is unusually high for cranking on a 12 V system — verify the reading.",
        );
      }
    } else {
      if (inputs.batteryVoltageDuringCrankingV < 16) {
        warnings.push("Battery voltage is very low for a 24 V system — verify measurement.");
      } else if (inputs.batteryVoltageDuringCrankingV < 20) {
        warnings.push("Battery voltage is low during cranking — starter performance may be impaired.");
      } else if (inputs.batteryVoltageDuringCrankingV > 32) {
        warnings.push(
          "Battery voltage is unusually high for cranking on a 24 V system — verify the reading.",
        );
      }
    }
  }

  if (!isFiniteNumber(crankingTimeS) || crankingTimeS <= 0) {
    errors.push("Cranking time must be a positive duration in seconds.");
  } else if (crankingTimeS > GBA0002_CRANKING_TIME_MAX_S) {
    errors.push(
      "Cranking time exceeds intermittent-duty starter limit for this tool (30 s).",
    );
  } else if (crankingTimeS > GBA0002_CRANKING_TIME_HIGH_RISK_S) {
    warnings.push("Long cranking event — engineering review required.");
  } else if (crankingTimeS > GBA0002_CRANKING_TIME_WARN_S) {
    warnings.push("Cranking time is above normal range (>10 s).");
  }

  if (!isFiniteNumber(inputs.operatingTempC)) {
    errors.push("Operating temperature must be a finite number.");
  } else if (
    inputs.operatingTempC < GBA0002_TEMP_MIN_C ||
    inputs.operatingTempC > GBA0002_TEMP_MAX_C
  ) {
    errors.push(
      `Operating temperature must be between ${GBA0002_TEMP_MIN_C}°C and ${GBA0002_TEMP_MAX_C}°C for normal mode.`,
    );
  } else if (inputs.operatingTempC > 90) {
    warnings.push(
      "High operating temperature — confirm selected cable and fuse families are rated for this site.",
    );
  }

  if (!isFiniteNumber(inputs.safetyFactorPercent)) {
    errors.push("Safety factor must be a finite percentage.");
  } else if (mode === "simple") {
    if (
      !GBA0002_SAFETY_FACTOR_OPTIONS.includes(
        inputs.safetyFactorPercent as (typeof GBA0002_SAFETY_FACTOR_OPTIONS)[number],
      )
    ) {
      errors.push("Simple Mode allows only 25% or 50% safety factor.");
    }
  } else {
    if (
      inputs.safetyFactorPercent < GBA0002_ADVANCED_SAFETY_MIN ||
      inputs.safetyFactorPercent > GBA0002_ADVANCED_SAFETY_MAX
    ) {
      errors.push(
        `Safety factor must be between ${GBA0002_ADVANCED_SAFETY_MIN}% and ${GBA0002_ADVANCED_SAFETY_MAX}% in Advanced Mode.`,
      );
    } else if (
      inputs.safetyFactorPercent < GBA0002_ADVANCED_SAFETY_REVIEW_LOW ||
      inputs.safetyFactorPercent > GBA0002_ADVANCED_SAFETY_REVIEW_HIGH
    ) {
      warnings.push("Non-standard safety factor — engineering approval required.");
    }
  }

  const cableLengthM = parseNumber(machine.cableLengthM);
  if (cableLengthM !== null && cableLengthM > 30) {
    errors.push("Cable length is outside tool scope for vehicle starter circuits (>30 m one-way).");
  } else if (cableLengthM !== null && cableLengthM > GBA0002_LENGTH_WARN_M) {
    warnings.push("Long starter-cable route in machine record — verify actual routing.");
  }

  return { errors, warnings };
}

export function validateGba0002Outputs(
  maxAllowableOneWayLengthM: number | null,
  operatingTempC: number,
  cableMaxTempC: number | null,
  fuse: FuseRecord | null,
  priorWarnings: string[],
): Gba0002ValidationResult {
  const errors: string[] = [];
  const warnings = [...priorWarnings];

  if (maxAllowableOneWayLengthM !== null && maxAllowableOneWayLengthM > GBA0002_MAX_DERIVED_LENGTH_M) {
    errors.push(
      "Derived max allowable one-way length is implausible for a vehicle starter circuit. Check formulas or inputs.",
    );
  }

  if (cableMaxTempC !== null && operatingTempC > cableMaxTempC) {
    errors.push("Selected cable temperature rating is exceeded by the operating temperature input.");
  }

  const fuseMax = parseComponentMaxTempC(fuse?.temperatureRangeC);
  if (fuseMax !== null && operatingTempC > fuseMax) {
    errors.push("Selected fuse temperature rating is exceeded by the operating temperature input.");
  }

  return { errors, warnings };
}

export function mergeValidation(
  ...parts: Gba0002ValidationResult[]
): Gba0002ValidationResult {
  const errors = parts.flatMap((p) => p.errors);
  const warnings = parts.flatMap((p) => p.warnings);
  return { errors, warnings };
}
