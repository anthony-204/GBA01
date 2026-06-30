/**
 * Fuse selection — rating, graph withstand, iterative escalation, I²t cross-check.
 *
 * Primary method: MEGA32V time-current graph (Excel G42–G52).
 * Secondary: I²t thermal check (MATLAB / Fuse_Library column F) for audit.
 */

import type { CheckResult, FuseRecord, FuseRecommendation, Mega32vCurve } from "./types.js";
import { parseNumber } from "./parseValue.js";
import {
  closestFuseRating,
  findFuseRecord,
  lookupWithstandTimeS,
  nextFuseRating,
  sortedFuseRatingOptions,
} from "./lookups.js";

export interface FuseSelectionInputs {
  alternatorContinuousA: number | null;
  cableContinuousA: number | null;
  peakCrankingCurrentA: number | null;
  crankingTimeRequiredS: number | null;
  peakCrankingLimitA: number;
  safetyFactorPercent: number;
  cableContinuousOk: boolean;
  fuseLibrary: FuseRecord[];
  mega32vCurve: Mega32vCurve;
  maxEscalationSteps: number;
}

export interface FuseSelectionOutputs {
  recommendation: FuseRecommendation;
  checks: CheckResult[];
}

/**
 * Target fuse current from continuous load.
 * Excel G39: ((safetyFactor + 100) / 100) × I_alternator
 */
export function computeTargetFuseRatingA(
  alternatorContinuousA: number,
  safetyFactorPercent: number,
): number {
  return ((100 + safetyFactorPercent) / 100) * alternatorContinuousA;
}

/**
 * Required I²t for cranking event (MATLAB / supplementary check).
 * I²t = I_crank² × t
 */
export function computeRequiredI2tA2s(
  peakCrankingCurrentA: number,
  crankingTimeS: number,
): number {
  return peakCrankingCurrentA ** 2 * crankingTimeS;
}

export function runFuseSelection(input: FuseSelectionInputs): FuseSelectionOutputs {
  const checks: CheckResult[] = [];
  const empty: FuseRecommendation = {
    targetRatingA: null,
    selectedRatingA: null,
    selectedFuse: null,
    withstandTimeS: null,
    requiredCrankingTimeS: input.crankingTimeRequiredS,
    escalationSteps: 0,
    i2tRequiredA2s: null,
    i2tFuseA2s: null,
  };

  if (!input.cableContinuousOk || input.alternatorContinuousA === null) {
    checks.push({
      id: "fuse-rating",
      label: "Closest match for fusing rating (A)",
      status: "unavailable",
      value: null,
      message: "Fuse sizing requires passing cable continuous check and alternator data.",
      specification: "Target rating = (1 + safety/100) × I_alternator when cable continuous OK",
      legacyReference: "Excel G39–G40",
    });
    checks.push({
      id: "fuse-gb-part",
      label: "GB Part #",
      status: "unavailable",
      value: null,
      message: "No fuse selected.",
      specification: "Lookup Fuse_Library by rating + breaking current",
      legacyReference: "Excel G61",
    });
    return { recommendation: empty, checks };
  }

  const targetA = computeTargetFuseRatingA(
    input.alternatorContinuousA,
    input.safetyFactorPercent,
  );
  const options = sortedFuseRatingOptions(input.fuseLibrary);
  let rating = closestFuseRating(targetA, input.fuseLibrary);
  let steps = 0;
  const breakingCurrentA = input.peakCrankingLimitA;
  const requiredTimeS = input.crankingTimeRequiredS;

  let selectedFuse: FuseRecord | null = null;
  let withstandS: number | null = null;

  if (rating !== null) {
    while (steps <= input.maxEscalationSteps) {
      selectedFuse = findFuseRecord(rating, breakingCurrentA, input.fuseLibrary);
      withstandS = lookupWithstandTimeS(
        breakingCurrentA,
        rating,
        input.mega32vCurve,
        selectedFuse,
      );
      if (
        requiredTimeS === null ||
        withstandS === null ||
        withstandS >= requiredTimeS
      ) {
        break;
      }
      const next = nextFuseRating(rating, options);
      if (next === null) break;
      rating = next;
      steps += 1;
    }
  }

  const i2tRequired =
    input.peakCrankingCurrentA !== null && requiredTimeS !== null
      ? computeRequiredI2tA2s(input.peakCrankingCurrentA, requiredTimeS)
      : null;
  const i2tFuse = parseNumber(selectedFuse?.i2tA2s);

  const fuseTimeOk =
    requiredTimeS !== null && withstandS !== null && withstandS >= requiredTimeS;

  checks.push({
    id: "fuse-rating",
    label: "Closest match for fusing rating (A)",
    status: rating !== null ? "pass" : "unavailable",
    value: rating,
    message:
      rating !== null
        ? `Target ${targetA.toFixed(1)} A → selected ${rating} A (${steps} escalation step(s)).`
        : "No fuse rating available in library.",
    specification: `MIN(|ratingOption - target|); target = ${targetA.toFixed(2)} A`,
    legacyReference: "Excel G40, G45, G50",
  });

  checks.push({
    id: "fuse-withstand",
    label: "Can the fuse handle peak current for required cranking time?",
    status:
      requiredTimeS === null || withstandS === null
        ? "unavailable"
        : fuseTimeOk
          ? "pass"
          : "fail",
    value:
      withstandS !== null && requiredTimeS !== null
        ? fuseTimeOk
          ? "YES"
          : "NO"
        : null,
    message:
      withstandS !== null && requiredTimeS !== null
        ? `Graph withstand ${withstandS} s vs required ${requiredTimeS} s at ${breakingCurrentA} A.`
        : "Withstand time or cranking time unavailable.",
    specification: "MEGA32V graph lookup (Fuse_Library column I)",
    legacyReference: "Excel G42–G43, G47–G48, G51–G52",
  });

  if (i2tRequired !== null && i2tFuse !== null) {
    checks.push({
      id: "fuse-i2t",
      label: "I²t thermal cross-check (supplementary)",
      status: i2tFuse > i2tRequired ? "pass" : "warning",
      value: i2tFuse > i2tRequired ? "YES" : "Marginal / NO",
      message: `Fuse I²t ${i2tFuse} vs required ${i2tRequired} A²s.`,
      specification: "I²t_fuse > I_crank² × t",
      legacyReference: "GBA-0002 § I2t",
    });
  }

  if (rating !== null && input.cableContinuousA !== null) {
    const protects = rating <= input.cableContinuousA;
    checks.push({
      id: "fuse-protects-cable",
      label: "Does the fuse rating protect the cable?",
      status: protects ? "pass" : "fail",
      value: protects ? "YES" : "NO",
      message: protects
        ? `Fuse ${rating} A ≤ cable rating ${input.cableContinuousA} A.`
        : `Fuse ${rating} A exceeds cable rating ${input.cableContinuousA} A — cable under-protected.`,
      specification: "I_fuse_selected ≤ I_cable_continuous (derating not applied in V2)",
      legacyReference: "GBA-0002 § Fuse protects cable",
    });
  } else {
    checks.push({
      id: "fuse-protects-cable",
      label: "Does the fuse rating protect the cable?",
      status: "unavailable",
      value: null,
      message: "Fuse rating or cable continuous rating unavailable.",
      specification: "I_fuse_selected ≤ I_cable_continuous",
    });
  }

  checks.push({
    id: "fuse-gb-part",
    label: "GB Part # (fuse holder)",
    status: selectedFuse?.gbPartHolder ? "pass" : "unavailable",
    value: selectedFuse?.gbPartHolder ?? null,
    message: selectedFuse?.manufacturerPartNumber
      ? `${selectedFuse.manufacturer} ${selectedFuse.manufacturerPartNumber}`
      : "Part not found for selected rating.",
    specification: "Fuse_Library match on rating + breaking current",
    legacyReference: "Excel G58–G61",
  });

  return {
    recommendation: {
      targetRatingA: targetA,
      selectedRatingA: rating,
      selectedFuse,
      withstandTimeS: withstandS,
      requiredCrankingTimeS: requiredTimeS,
      escalationSteps: steps,
      i2tRequiredA2s: i2tRequired,
      i2tFuseA2s: i2tFuse,
    },
    checks,
  };
}
