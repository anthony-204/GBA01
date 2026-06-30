/**
 * Vehicle data completeness — Version 2.
 *
 * Only vehicles with all required fields produce full cable/fuse recommendations.
 * Incomplete vehicles remain visible in the library with clear labels.
 */

import type { MachineRecord } from "./types.js";
import { parseNumber } from "./parseValue.js";
import { labelForField } from "./fieldLabels.js";

/** Fields required before running full cable + fuse recommendation (GBA-0002 / PDF). */
export const REQUIRED_FIELDS = [
  "peakCrankingCurrentA",
  "alternatorContinuousA",
  "cableType",
  "cableSizeMm2",
  "cableContinuousA",
  "cableLengthM",
  "operatingTempC",
  "peakCurrentCutoffA",
  "electricalSystemV",
] as const;

export type RequiredField = (typeof REQUIRED_FIELDS)[number];

export type CompletenessLabel =
  | "complete"
  | "incomplete"
  | "engineering-data-required";

export interface CompletenessAssessment {
  isComplete: boolean;
  label: CompletenessLabel;
  missingFields: RequiredField[];
  missingFieldLabels: string[];
  /** At least one cranking time value available or derivable */
  hasCrankingTime: boolean;
  canRunFullRecommendation: boolean;
}

function hasCrankingTime(machine: MachineRecord): boolean {
  return (
    parseNumber(machine.crankingTimeRequiredS) !== null ||
    parseNumber(machine.crankingTimeMeasuredS) !== null
  );
}

function isFieldPresent(machine: MachineRecord, field: RequiredField): boolean {
  if (field === "peakCurrentCutoffA") {
    const n = parseNumber(machine.peakCurrentCutoffA);
    return n !== null && n > 0;
  }
  if (field === "cableType") {
    const v = machine.cableType;
    return typeof v === "string" && v.trim().length > 0;
  }
  const n = parseNumber(machine[field]);
  return n !== null && (field !== "cableLengthM" || n >= 0);
}

/**
 * Assess whether a library vehicle has enough data for full recommendations.
 */
export function assessVehicleCompleteness(machine: MachineRecord): CompletenessAssessment {
  const missingFields = REQUIRED_FIELDS.filter((f) => !isFieldPresent(machine, f));
  const crankingTime = hasCrankingTime(machine);

  if (!crankingTime) {
    if (!missingFields.includes("crankingTimeRequiredS" as RequiredField)) {
      // not in REQUIRED_FIELDS array — track separately
    }
  }

  const missingCranking = !crankingTime;
  const allMissing = [...missingFields];
  const missingFieldLabels = [
    ...allMissing.map((f) => labelForField(f)),
    ...(missingCranking ? [labelForField("crankingTimeRequiredS")] : []),
  ];

  const isComplete = missingFields.length === 0 && crankingTime;

  let label: CompletenessLabel = "complete";
  if (!isComplete) {
    const critical = missingFields.length >= 4 || missingCranking;
    label = critical ? "engineering-data-required" : "incomplete";
  }

  return {
    isComplete,
    label,
    missingFields: allMissing,
    missingFieldLabels,
    hasCrankingTime: crankingTime,
    canRunFullRecommendation: isComplete,
  };
}

export interface VehicleListItem {
  id: string;
  manufacturer?: string;
  category?: string;
  site?: string;
  completeness: CompletenessAssessment;
}

export function listVehiclesWithCompleteness(
  machines: MachineRecord[],
): VehicleListItem[] {
  return machines
    .map((m) => ({
      id: m.id,
      manufacturer: m.manufacturer as string | undefined,
      category: m.category as string | undefined,
      site: m.site as string | undefined,
      completeness: assessVehicleCompleteness(m),
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
}
