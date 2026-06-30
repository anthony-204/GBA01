/**
 * Cable checks — continuous and adiabatic peak (inrush/cranking).
 */

import type { CheckResult, CheckStatus } from "./types.js";

export interface CableCheckInputs {
  alternatorContinuousA: number | null;
  cableContinuousA: number | null;
  peakCrankingCurrentA: number | null;
  cableSizeMm2: number | null;
  crankingTimeForPeakS: number | null;
  kFactor: number;
  maxAdiabaticTimeS: number;
}

export interface CableCheckOutputs {
  continuous: CheckResult;
  peak: CheckResult;
  peakCapabilityA: number | null;
  peakTimeUsedS: number | null;
}

function statusFromPassFail(pass: boolean | null, unavailable: boolean): CheckStatus {
  if (unavailable) return "unavailable";
  if (pass === null) return "invalid";
  return pass ? "pass" : "fail";
}

/** I_allow = K × mm² / √t — FIX: uses cranking time, not Excel G13=0.015s */
export function computeCablePeakCapabilityA(
  kFactor: number,
  cableSizeMm2: number,
  timeS: number,
): number {
  if (timeS <= 0) return Infinity;
  return Math.round((kFactor * cableSizeMm2) / Math.sqrt(timeS));
}

export function runCableChecks(input: CableCheckInputs): CableCheckOutputs {
  const {
    alternatorContinuousA,
    cableContinuousA,
    peakCrankingCurrentA,
    cableSizeMm2,
    crankingTimeForPeakS,
    kFactor,
    maxAdiabaticTimeS,
  } = input;

  const contUnavailable = alternatorContinuousA === null || cableContinuousA === null;
  const contPass = !contUnavailable && alternatorContinuousA <= cableContinuousA;

  const continuous: CheckResult = {
    id: "cable-continuous",
    label: "Can the cable handle the continuous current demand?",
    status: statusFromPassFail(contPass, contUnavailable),
    value: contUnavailable ? null : contPass ? "YES" : "NO — increase cable size",
    message: contUnavailable
      ? "Alternator or cable continuous rating data unavailable."
      : contPass
        ? `Alternator ${alternatorContinuousA} A ≤ cable ${cableContinuousA} A.`
        : `Alternator ${alternatorContinuousA} A exceeds cable rating ${cableContinuousA} A.`,
    specification: "I_alternator_continuous ≤ I_cable_continuous",
    legacyReference: "Excel G28",
  };

  let peakCapabilityA: number | null = null;
  let peakTimeUsedS: number | null = null;
  let peak: CheckResult;

  if (peakCrankingCurrentA === null || cableSizeMm2 === null || crankingTimeForPeakS === null) {
    peak = {
      id: "cable-peak",
      label: "Can the cable handle the in-rush / cranking current demand?",
      status: "unavailable",
      value: null,
      message: "Cranking current, cable size, or cranking time unavailable.",
      specification: "I_crank ≤ K × mm² / √t",
      legacyReference: "Excel G31 (corrected)",
    };
  } else if (crankingTimeForPeakS > maxAdiabaticTimeS) {
    peak = {
      id: "cable-peak",
      label: "Can the cable handle the in-rush / cranking current demand?",
      status: "warning",
      value: "Investigate — cranking exceeds adiabatic limit",
      message: `Cranking time ${crankingTimeForPeakS} s > ${maxAdiabaticTimeS} s — formula not valid.`,
      specification: `Adiabatic peak valid for t ≤ ${maxAdiabaticTimeS} s`,
      legacyReference: "Excel G30/G31",
    };
    peakTimeUsedS = crankingTimeForPeakS;
  } else {
    peakTimeUsedS = crankingTimeForPeakS;
    peakCapabilityA = computeCablePeakCapabilityA(kFactor, cableSizeMm2, peakTimeUsedS);
    const peakPass = peakCrankingCurrentA <= peakCapabilityA;
    peak = {
      id: "cable-peak",
      label: "Can the cable handle the in-rush / cranking current demand?",
      status: peakPass ? "pass" : "fail",
      value: peakPass ? "YES" : "NO — increase cable size",
      message: peakPass
        ? `Cranking ${peakCrankingCurrentA} A ≤ capability ${peakCapabilityA} A at ${peakTimeUsedS} s.`
        : `Cranking ${peakCrankingCurrentA} A exceeds capability ${peakCapabilityA} A.`,
      specification: `I_crank ≤ K × mm² / √t (K=${kFactor}, S=${cableSizeMm2}, t=${peakTimeUsedS})`,
      legacyReference: "Excel G30/G31 corrected",
    };
  }

  return { continuous, peak, peakCapabilityA, peakTimeUsedS };
}

export function computeVoltageDropPercent(
  currentA: number | null,
  lengthM: number | null,
  resistanceOhmPerKm: number | null,
  crankingVoltageV: number | null,
): number | null {
  if (
    currentA === null ||
    lengthM === null ||
    resistanceOhmPerKm === null ||
    crankingVoltageV === null ||
    crankingVoltageV === 0
  ) {
    return null;
  }
  return ((currentA * lengthM * 2 * (resistanceOhmPerKm / 1000)) * 100) / crankingVoltageV;
}
