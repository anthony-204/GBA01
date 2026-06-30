/**
 * Value parsing — replaces Excel/MATLAB convertValue.m and handles legacy sentinels.
 */

import type { ParsedValue } from "./types.js";

const UNAVAILABLE = new Set([
  "data unavailable",
  "data unavailable for calculation",
  "data unavailable for calculations",
  "tbc",
  "n/a",
  "#n/a",
  "select",
  "",
]);

export function isUnavailable(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "number" && Number.isNaN(value)) return true;
  if (typeof value === "string") {
    return UNAVAILABLE.has(value.trim().toLowerCase());
  }
  return false;
}

export function parseNumber(value: unknown): number | null {
  if (isUnavailable(value)) return null;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    const n = Number(value.trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function parseValue(value: unknown): ParsedValue {
  const n = parseNumber(value);
  if (n !== null) return n;
  if (isUnavailable(value)) return null;
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return value;
  return null;
}

/** Excel column Y: IF(measured < min, min, measured). Legacy G13 bug NOT used. */
export function resolveCrankingTimeRequiredS(
  measuredS: number | null,
  minRequiredS: number,
): number | null {
  if (measuredS === null) return null;
  return Math.max(measuredS, minRequiredS);
}
