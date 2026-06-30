/**
 * Main recommendation orchestrator — mine-site / library mode (Phase 1).
 *
 * Replaces Excel User Input column G + MATLAB fuseRecommendationFromExcel.m
 * with corrected logic, typed outputs, and auditable check results.
 */

import type {
  CheckResult,
  CheckStatus,
  FuseToolDatabase,
  RecommendationInputs,
  RecommendationResult,
} from "./types.js";
import { parseNumber, resolveCrankingTimeRequiredS } from "./parseValue.js";
import {
  findMachine,
  lookupCableResistance,
  lookupKFactor,
} from "./lookups.js";
import {
  computeVoltageDropPercent,
  runCableChecks,
} from "./cableChecks.js";
import { runFuseSelection } from "./fuseSelection.js";

/** Documented fixes applied relative to legacy Excel/MATLAB */
export const IMPLEMENTATION_FIXES: string[] = [
  "Cable peak formula uses cranking time (X/Y), not Excel G13 (=15/1000 s).",
  "Cable peak compares I_crank (column T) to capability, not cutoff current (G12 vs G30 bug).",
  "Battery check compares cranking voltage to min battery voltage, not manufacturer name (G19 bug).",
  "Machine fields read full MachinesOnSite columns (Z, AE, AG), not MATLAB A:X truncate.",
  "Column T mapped to peakCrankingCurrentA (was misnamed Starter Motor Peak Current in MATLAB).",
  "K-factor from Copper_K_Factor lookup, not hard-coded 143.",
  "Fuse selection uses MEGA32V graph with iterative escalation (Excel G40–G52).",
];

function worstStatus(statuses: CheckStatus[]): CheckStatus {
  const order: CheckStatus[] = ["fail", "invalid", "warning", "unavailable", "pass"];
  for (const s of order) {
    if (statuses.includes(s)) return s;
  }
  return "pass";
}

function buildStarterChecks(
  peakCrankingA: number | null,
  peakLimitA: number,
): CheckResult[] {
  const checks: CheckResult[] = [];

  if (peakCrankingA === null) {
    checks.push({
      id: "cranking-limit",
      label: "Is starter motor cranking current within the limit?",
      status: "unavailable",
      value: null,
      message: "Peak cranking current data unavailable.",
      specification: `I_crank ≤ ${peakLimitA} A (project boundary / column Q)`,
      legacyReference: "Excel G21; MATLAB CrankingAmpsHighorLow",
    });
  } else {
    const pass = peakCrankingA <= peakLimitA;
    checks.push({
      id: "cranking-limit",
      label: "Is starter motor cranking current within the limit?",
      status: pass ? "pass" : "fail",
      value: pass ? "YES" : "NO — replace or investigate starter motor",
      message: pass
        ? `${peakCrankingA} A ≤ limit ${peakLimitA} A.`
        : `${peakCrankingA} A exceeds limit ${peakLimitA} A.`,
      specification: `I_crank ≤ ${peakLimitA} A`,
      legacyReference: "Excel G21; MATLAB ≤1000A check",
    });
  }

  return checks;
}

function buildBatteryCheck(
  crankingVoltageV: number | null,
  minBatteryVoltageV: number | null,
): CheckResult {
  if (crankingVoltageV === null || minBatteryVoltageV === null) {
    return {
      id: "battery-voltage",
      label: "Is cranking battery voltage acceptable?",
      status: "unavailable",
      value: null,
      message: "Cranking or minimum battery voltage data unavailable.",
      specification: "V_crank ≥ V_min_battery (24V system: 16.48 V with 3% drop)",
      legacyReference: "Excel G19 corrected (was G16<G8 comparing manufacturer string)",
    };
  }
  const pass = crankingVoltageV >= minBatteryVoltageV;
  return {
    id: "battery-voltage",
    label: "Is cranking battery voltage acceptable?",
    status: pass ? "pass" : "fail",
    value: pass ? "NO battery replacement required" : "YES — investigate battery",
    message: pass
      ? `Cranking voltage ${crankingVoltageV} V ≥ minimum ${minBatteryVoltageV} V.`
      : `Cranking voltage ${crankingVoltageV} V below minimum ${minBatteryVoltageV} V.`,
    specification: "V_crank ≥ V_min_battery",
    legacyReference: "Excel G19 corrected",
  };
}

function buildVoltageDropCheck(
  dropPercent: number | null,
  limitPercent: number,
): CheckResult | null {
  if (dropPercent === null) return null;
  const pass = dropPercent <= limitPercent;
  return {
    id: "voltage-drop",
    label: "Voltage drop during cranking (informational)",
    status: pass ? "pass" : "warning",
    value: `${dropPercent.toFixed(2)}%`,
    message: pass
      ? `Voltage drop ${dropPercent.toFixed(2)}% within ${limitPercent}% guideline.`
      : `Voltage drop ${dropPercent.toFixed(2)}% exceeds ${limitPercent}% — review cable length/size.`,
    specification: "ΔV% = (I × L × 2 × R/km / 1000 × 100) / V_crank",
    legacyReference: "Excel G35",
  };
}

/**
 * Run full fuse & cable recommendation for a fleet machine model.
 */
export function recommend(
  db: FuseToolDatabase,
  inputs: RecommendationInputs,
): RecommendationResult {
  const { constants } = db;
  const safetyFactorPercent =
    inputs.safetyFactorPercent ?? constants.defaultSafetyFactorPercent;

  const machine = findMachine(db, inputs.modelId);
  const implementationNotes = [...IMPLEMENTATION_FIXES];

  if (!machine) {
    return {
      modelId: inputs.modelId,
      machine: null,
      checks: [
        {
          id: "machine-lookup",
          label: "Machine found in library",
          status: "fail",
          value: null,
          message: `Model "${inputs.modelId}" not found in machines.json.`,
          specification: "MATCH model in MachinesOnSite column D",
        },
      ],
      fuse: {
        targetRatingA: null,
        selectedRatingA: null,
        selectedFuse: null,
        withstandTimeS: null,
        requiredCrankingTimeS: null,
        escalationSteps: 0,
        i2tRequiredA2s: null,
        i2tFuseA2s: null,
      },
      derived: {
        kFactorUsed: null,
        cablePeakCapabilityA: null,
        cablePeakTimeUsedS: null,
        voltageDropPercent: null,
        peakCrankingLimitA: constants.defaultPeakCrankingLimitA,
      },
      summary: {
        overallStatus: "fail",
        recommendedAction: "Select a valid model from the fleet library.",
      },
      implementationNotes,
    };
  }

  const peakLimitA =
    parseNumber(machine.peakCurrentCutoffA) ?? constants.defaultPeakCrankingLimitA;
  const peakCrankingA = parseNumber(machine.peakCrankingCurrentA);
  const crankingMeasuredS = parseNumber(machine.crankingTimeMeasuredS);
  const crankingRequiredS = resolveCrankingTimeRequiredS(
    crankingMeasuredS,
    constants.minCrankingTimeRequiredS,
  );
  const crankingVoltageV = parseNumber(machine.crankingVoltageMeasuredV);
  const minBatteryV =
    parseNumber(machine.minBatteryVoltageV) ?? constants.minBatteryVoltage24V;
  const alternatorA = parseNumber(machine.alternatorContinuousA);
  const cableContinuousA = parseNumber(machine.cableContinuousA);
  const cableSizeMm2 = parseNumber(machine.cableSizeMm2);
  const cableLengthM = parseNumber(machine.cableLengthM);
  const kFactor = lookupKFactor(
    machine.cableType as string | undefined,
    db.copperKFactors,
    constants.defaultKFactorCopper,
  );

  const checks: CheckResult[] = [
    {
      id: "machine-lookup",
      label: "Machine found in library",
      status: "pass",
      value: machine.id,
      message: `${machine.manufacturer ?? ""} ${machine.id} @ ${machine.site ?? "unknown site"}`,
      specification: "MachinesOnSite library lookup",
    },
    ...buildStarterChecks(peakCrankingA, peakLimitA),
    buildBatteryCheck(crankingVoltageV, minBatteryV),
  ];

  const cableOut = runCableChecks({
    alternatorContinuousA: alternatorA,
    cableContinuousA,
    peakCrankingCurrentA: peakCrankingA,
    cableSizeMm2,
    crankingTimeForPeakS: crankingRequiredS,
    kFactor,
    maxAdiabaticTimeS: constants.maxAdiabaticCrankingTimeS,
  });
  checks.push(cableOut.continuous, cableOut.peak);

  const resistance = cableSizeMm2
    ? lookupCableResistance(cableSizeMm2, db.cableCapacity)
    : null;
  const voltageDrop = computeVoltageDropPercent(
    peakCrankingA,
    cableLengthM,
    resistance,
    crankingVoltageV,
  );
  const vdropCheck = buildVoltageDropCheck(
    voltageDrop,
    constants.voltageDropPercentLimit,
  );
  if (vdropCheck) checks.push(vdropCheck);

  const fuseOut = runFuseSelection({
    alternatorContinuousA: alternatorA,
    cableContinuousA,
    peakCrankingCurrentA: peakCrankingA,
    crankingTimeRequiredS: crankingRequiredS,
    peakCrankingLimitA: peakLimitA,
    safetyFactorPercent,
    cableContinuousOk: cableOut.continuous.status === "pass",
    fuseLibrary: db.fuseLibrary,
    mega32vCurve: db.mega32vCurve,
    maxEscalationSteps: 8,
  });
  checks.push(...fuseOut.checks);

  const overallStatus = worstStatus(checks.map((c) => c.status));
  const failed = checks.filter((c) => c.status === "fail");
  const recommendedAction =
    failed.length > 0
      ? `Address: ${failed.map((c) => c.label).join("; ")}`
      : fuseOut.recommendation.selectedFuse
        ? `Install ${fuseOut.recommendation.selectedRatingA} A fuse (${fuseOut.recommendation.selectedFuse.gbPartHolder ?? "see library"}).`
        : "Review results — some data unavailable.";

  return {
    modelId: inputs.modelId,
    machine,
    checks,
    fuse: fuseOut.recommendation,
    derived: {
      kFactorUsed: kFactor,
      cablePeakCapabilityA: cableOut.peakCapabilityA,
      cablePeakTimeUsedS: cableOut.peakTimeUsedS,
      voltageDropPercent: voltageDrop,
      peakCrankingLimitA: peakLimitA,
    },
    summary: { overallStatus, recommendedAction },
    implementationNotes,
  };
}

/** List all model IDs sorted for UI dropdown */
export function listModelIds(db: FuseToolDatabase): string[] {
  return db.machines.map((m) => m.id).sort((a, b) => a.localeCompare(b));
}

/** Load bundled JSON database shape */
export function loadDatabase(bundle: FuseToolDatabase): FuseToolDatabase {
  return bundle;
}
