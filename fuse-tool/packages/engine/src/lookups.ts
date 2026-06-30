/**
 * Database lookups — machine, cable table, K-factor, fuse library.
 */

import type {
  CableCapacityRow,
  CopperKFactorRow,
  FuseRecord,
  FuseToolDatabase,
  MachineRecord,
  Mega32vCurve,
} from "./types.js";
import { parseNumber } from "./parseValue.js";

export function findMachine(db: FuseToolDatabase, modelId: string): MachineRecord | null {
  const id = modelId.trim();
  return db.machines.find((m) => m.id === id || String(m.model) === id) ?? null;
}

export function lookupKFactor(
  cableType: string | undefined,
  kFactors: CopperKFactorRow[],
  defaultK: number,
): number {
  if (!cableType) return defaultK;
  const normalized = cableType.toLowerCase();
  for (const row of kFactors) {
    const label = row.cableTypeLabel.toLowerCase();
    if (normalized.includes(label) || label.includes(normalized)) {
      const k = parseNumber(row.kCopper);
      if (k !== null) return k;
    }
  }
  if (/xlpe|x-90|x-110|thermosetting/i.test(cableType)) {
    const xlpe = kFactors.find((r) => /xlpe|thermosetting 90/i.test(r.cableTypeLabel));
    if (xlpe?.kCopper != null) return Number(xlpe.kCopper);
  }
  if (/pvc|thermoplastic/i.test(cableType)) {
    const pvc = kFactors.find((r) => /thermoplastic 90/i.test(r.cableTypeLabel));
    if (pvc?.kCopper != null) return Number(pvc.kCopper);
  }
  return defaultK;
}

export function lookupCableResistance(
  sizeMm2: number,
  cableCapacity: CableCapacityRow[],
): number | null {
  const row = cableCapacity.find((c) => c.sizeMm2 === sizeMm2);
  if (!row) return null;
  return parseNumber(row.resistanceOhmPerKm);
}

export function closestFuseRating(
  targetA: number,
  fuseLibrary: FuseRecord[],
): number | null {
  const options = fuseLibrary
    .map((f) => parseNumber(f.ratingOptionA ?? f.currentRatingA))
    .filter((n): n is number => n !== null);
  if (options.length === 0) return null;
  let best = options[0];
  let bestDiff = Math.abs(best - targetA);
  for (const opt of options) {
    const d = Math.abs(opt - targetA);
    if (d < bestDiff) {
      best = opt;
      bestDiff = d;
    }
  }
  return best;
}

export function findFuseRecord(
  ratingA: number,
  breakingCurrentA: number,
  fuseLibrary: FuseRecord[],
): FuseRecord | null {
  const tolerance = 0.01;
  return (
    fuseLibrary.find(
      (f) =>
        Math.abs((parseNumber(f.ratingOptionA ?? f.currentRatingA) ?? 0) - ratingA) < tolerance &&
        Math.abs((parseNumber(f.breakingCurrentA) ?? 0) - breakingCurrentA) < 1,
    ) ??
    fuseLibrary.find(
      (f) => Math.abs((parseNumber(f.ratingOptionA ?? f.currentRatingA) ?? 0) - ratingA) < tolerance,
    ) ??
    null
  );
}

export function lookupWithstandTimeS(
  breakingCurrentA: number,
  fuseRatingA: number,
  curve: Mega32vCurve,
  fuseRecord: FuseRecord | null,
): number | null {
  const fromLibrary = parseNumber(fuseRecord?.timeFromGraphS);
  if (fromLibrary !== null) return fromLibrary;

  const ratingKey = String(Math.round(fuseRatingA));
  let bestRow = curve.rows[0];
  let bestDiff = Infinity;
  for (const row of curve.rows) {
    const d = Math.abs(row.crankingCurrentA - breakingCurrentA);
    if (d < bestDiff) {
      bestDiff = d;
      bestRow = row;
    }
  }
  if (!bestRow) return null;
  const t = bestRow.withstandTimeSByRating[ratingKey];
  return t ?? null;
}

export function sortedFuseRatingOptions(fuseLibrary: FuseRecord[]): number[] {
  const set = new Set<number>();
  for (const f of fuseLibrary) {
    const n = parseNumber(f.ratingOptionA ?? f.currentRatingA);
    if (n !== null) set.add(n);
  }
  return [...set].sort((a, b) => a - b);
}

export function nextFuseRating(currentA: number, options: number[]): number | null {
  for (const opt of options) {
    if (opt > currentA) return opt;
  }
  return null;
}
