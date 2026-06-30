/**
 * Unified calculation orchestrator — Version 2.
 */

import type {
  CalculationRequest,
  CheckResult,
  CheckStatus,
  FuseToolDatabase,
  MachineRecord,
  ManualEntryInput,
  RecommendationInputs,
  RecommendationResult,
} from "./types.js";
import { parseNumber, resolveCrankingTimeRequiredS } from "./parseValue.js";
import {
  findMachine,
  lookupCableResistance,
  lookupKFactor,
} from "./lookups.js";
import { computeVoltageDropPercent, runCableChecks } from "./cableChecks.js";
import { runFuseSelection, computeRequiredI2tA2s } from "./fuseSelection.js";
import { assessVehicleCompleteness } from "./completeness.js";
import { validateManualEntry } from "./validation.js";
import { buildPdfOutputs } from "./outputs.js";
import { IMPLEMENTATION_FIXES } from "./recommendLegacyNotes.js";

export { IMPLEMENTATION_FIXES };

interface CalcParams {
  safetyFactorPercent: number;
  voltageDropLimitPercent: number;
  peakCrankingA: number | null;
  crankingTimeRequiredS: number | null;
  crankingTimeMeasuredS: number | null;
  maxAllowedCrankingTimeS: number | null;
  crankingVoltageV: number | null;
  minBatteryV: number | null;
  systemVoltageV: number | null;
  alternatorA: number | null;
  cableContinuousA: number | null;
  cableSizeMm2: number | null;
  cableLengthM: number | null;
  cableType: string | null;
  operatingTempC: number | null;
  peakLimitA: number;
  kFactorOverride?: number;
}

function worstStatus(statuses: CheckStatus[]): CheckStatus {
  const order: CheckStatus[] = ["fail", "invalid", "warning", "unavailable", "pass"];
  for (const s of order) {
    if (statuses.includes(s)) return s;
  }
  return "pass";
}

function emptyFuse() {
  return {
    targetRatingA: null,
    selectedRatingA: null,
    selectedFuse: null,
    withstandTimeS: null,
    requiredCrankingTimeS: null,
    escalationSteps: 0,
    i2tRequiredA2s: null,
    i2tFuseA2s: null,
  };
}

function buildBlockedResult(
  base: Partial<RecommendationResult> &
    Pick<RecommendationResult, "modelId" | "inputMode" | "completeness"> & {
      peakCrankingLimitA?: number;
    },
): RecommendationResult {
  return {
    modelId: base.modelId,
    machine: base.machine ?? null,
    checks: base.checks ?? [],
    fuse: emptyFuse(),
    derived: {
      kFactorUsed: null,
      cablePeakCapabilityA: null,
      cablePeakTimeUsedS: null,
      voltageDropPercent: null,
      peakCrankingLimitA: base.peakCrankingLimitA ?? 0,
      i2tRequiredA2s: null,
      assumptionsUsed: [],
    },
    summary: base.summary ?? {
      overallStatus: "warning",
      recommendedAction: base.blockReason ?? "Calculation blocked — incomplete data.",
    },
    implementationNotes: [...IMPLEMENTATION_FIXES],
    inputMode: base.inputMode,
    completeness: base.completeness,
    outputs: null,
    blocked: true,
    blockReason: base.blockReason,
    validationErrors: base.validationErrors,
  };
}

function buildStarterCheck(peakCrankingA: number | null, peakLimitA: number): CheckResult {
  if (peakCrankingA === null) {
    return {
      id: "cranking-limit",
      label: "Is starter motor cranking current within the limit?",
      status: "unavailable",
      value: null,
      message: "Peak cranking current data unavailable.",
      specification: "I_crank ≤ I_limit (A)",
    };
  }
  const pass = peakCrankingA <= peakLimitA;
  return {
    id: "cranking-limit",
    label: "Is starter motor cranking current within the limit?",
    status: pass ? "pass" : "fail",
    value: pass ? "YES" : "NO — review starter motor",
    message: pass
      ? `${peakCrankingA} A ≤ limit ${peakLimitA} A.`
      : `${peakCrankingA} A exceeds limit ${peakLimitA} A.`,
    specification: "I_crank ≤ starter peak current limit",
  };
}

function buildBatteryVoltageCheck(
  crankingVoltageV: number | null,
  minBatteryV: number | null,
): CheckResult | null {
  if (crankingVoltageV === null || minBatteryV === null) return null;
  const pass = crankingVoltageV >= minBatteryV;
  return {
    id: "battery-voltage",
    label: "Is cranking battery voltage acceptable?",
    status: pass ? "pass" : "fail",
    value: pass ? "NO replacement required" : "YES — investigate battery",
    message: pass
      ? `Cranking voltage ${crankingVoltageV} V ≥ minimum ${minBatteryV} V.`
      : `Cranking voltage ${crankingVoltageV} V below minimum ${minBatteryV} V.`,
    specification: "V_crank ≥ V_min_battery",
  };
}

function buildBatteryCrankingTimeCheck(
  measuredS: number | null,
  maxAllowedS: number | null,
): CheckResult | null {
  if (measuredS === null || maxAllowedS === null) return null;
  const pass = measuredS <= maxAllowedS;
  return {
    id: "battery-cranking-time",
    label: "Is cranking time within allowed limit?",
    status: pass ? "pass" : "fail",
    value: pass ? "YES" : "YES — battery replacement flagged",
    message: pass
      ? `Measured ${measuredS} s ≤ allowed ${maxAllowedS} s.`
      : `Measured ${measuredS} s exceeds allowed ${maxAllowedS} s — review battery.`,
    specification: "t_measured ≤ t_allowed",
  };
}

function buildI2tCheck(
  peakCrankingA: number | null,
  crankingTimeS: number | null,
  i2tFuse: number | null,
): CheckResult {
  if (peakCrankingA === null || crankingTimeS === null) {
    return {
      id: "fuse-i2t",
      label: "I²t required for cranking event",
      status: "unavailable",
      value: null,
      message: "Cranking current or time unavailable.",
      specification: "I²t = I² × t",
    };
  }
  const required = computeRequiredI2tA2s(peakCrankingA, crankingTimeS);
  if (i2tFuse === null) {
    return {
      id: "fuse-i2t",
      label: "I²t required for cranking event",
      status: "warning",
      value: required,
      message: `I²t required = ${required.toLocaleString()} A²s (fuse I²t not available).`,
      specification: "I²t = I² × t",
    };
  }
  const pass = i2tFuse >= required;
  return {
    id: "fuse-i2t",
    label: "I²t required vs fuse rating",
    status: pass ? "pass" : "fail",
    value: required,
    message: `Required ${required.toLocaleString()} A²s; fuse I²t ${i2tFuse.toLocaleString()} A²s.`,
    specification: "I²t_fuse ≥ I_crank² × t",
  };
}

function runFullCalculation(
  db: FuseToolDatabase,
  params: CalcParams,
  meta: {
    modelId: string;
    machine: MachineRecord | null;
    inputMode: "library" | "manual";
    completeness: RecommendationResult["completeness"];
  },
): RecommendationResult {
  const assumptions: string[] = [];
  const kFactor =
    params.kFactorOverride ??
    lookupKFactor(
      params.cableType ?? undefined,
      db.copperKFactors,
      db.constants.defaultKFactorCopper,
    );
  if (params.kFactorOverride) {
    assumptions.push(`K-factor ${kFactor} supplied manually.`);
  } else if (params.cableType) {
    assumptions.push(`K-factor ${kFactor} from lookup for "${params.cableType}".`);
  } else {
    assumptions.push(`K-factor default ${kFactor} from constants.json.`);
  }

  const crankingTimeForCalc =
    params.crankingTimeRequiredS ??
    resolveCrankingTimeRequiredS(
      params.crankingTimeMeasuredS,
      db.constants.minCrankingTimeRequiredS,
    );

  const checks: CheckResult[] = [buildStarterCheck(params.peakCrankingA, params.peakLimitA)];

  const battV = buildBatteryVoltageCheck(params.crankingVoltageV, params.minBatteryV);
  if (battV) checks.push(battV);

  const battT = buildBatteryCrankingTimeCheck(
    params.crankingTimeMeasuredS,
    params.maxAllowedCrankingTimeS,
  );
  if (battT) checks.push(battT);

  const cableOut = runCableChecks({
    alternatorContinuousA: params.alternatorA,
    cableContinuousA: params.cableContinuousA,
    peakCrankingCurrentA: params.peakCrankingA,
    cableSizeMm2: params.cableSizeMm2,
    crankingTimeForPeakS: crankingTimeForCalc,
    kFactor,
    maxAdiabaticTimeS: db.constants.maxAdiabaticCrankingTimeS,
  });
  checks.push(cableOut.continuous, cableOut.peak);

  const resistance =
    params.cableSizeMm2 !== null
      ? lookupCableResistance(params.cableSizeMm2, db.cableCapacity)
      : null;

  const voltageForDrop = params.systemVoltageV ?? params.crankingVoltageV;
  const voltageDrop = computeVoltageDropPercent(
    params.peakCrankingA,
    params.cableLengthM,
    resistance,
    voltageForDrop,
  );

  if (voltageDrop !== null && voltageForDrop !== null) {
    const pass = voltageDrop <= params.voltageDropLimitPercent;
    checks.push({
      id: "voltage-drop",
      label: "Voltage drop during cranking",
      status: pass ? "pass" : "warning",
      value: `${voltageDrop.toFixed(2)}%`,
      message: pass
        ? `Within ${params.voltageDropLimitPercent}% limit.`
        : `Exceeds ${params.voltageDropLimitPercent}% limit.`,
      specification: "ΔV% = (I × L × 2 × R/km / 1000 × 100) / V_system",
    });
    assumptions.push(`Voltage drop limit ${params.voltageDropLimitPercent}%.`);
  }

  const fuseOut = runFuseSelection({
    alternatorContinuousA: params.alternatorA,
    cableContinuousA: params.cableContinuousA,
    peakCrankingCurrentA: params.peakCrankingA,
    crankingTimeRequiredS: crankingTimeForCalc,
    peakCrankingLimitA: params.peakCrankingA ?? params.peakLimitA,
    safetyFactorPercent: params.safetyFactorPercent,
    cableContinuousOk: cableOut.continuous.status === "pass",
    fuseLibrary: db.fuseLibrary,
    mega32vCurve: db.mega32vCurve,
    maxEscalationSteps: 8,
  });
  checks.push(...fuseOut.checks);

  const i2tIdx = checks.findIndex((c) => c.id === "fuse-i2t");
  const i2tCheck = buildI2tCheck(
    params.peakCrankingA,
    crankingTimeForCalc,
    fuseOut.recommendation.i2tFuseA2s,
  );
  if (i2tIdx >= 0) checks[i2tIdx] = i2tCheck;
  else checks.push(i2tCheck);

  const outputs = buildPdfOutputs({
    cableType: params.cableType,
    cableSizeMm2: params.cableSizeMm2,
    cableContinuousA: params.cableContinuousA,
    cableLengthM: params.cableLengthM,
    operatingTempC: params.operatingTempC,
    fuse: fuseOut.recommendation,
    checks,
  });

  const failed = checks.filter((c) => c.status === "fail");
  const overallStatus = worstStatus(checks.map((c) => c.status));
  const recommendedAction =
    failed.length > 0
      ? `Address failed checks: ${failed.map((c) => c.label).join("; ")}`
      : fuseOut.recommendation.selectedFuse
        ? `Suggested fuse ${fuseOut.recommendation.selectedRatingA} A — engineering approval required before installation.`
        : "Review results with a qualified engineer.";

  return {
    modelId: meta.modelId,
    machine: meta.machine,
    checks,
    fuse: fuseOut.recommendation,
    derived: {
      kFactorUsed: kFactor,
      cablePeakCapabilityA: cableOut.peakCapabilityA,
      cablePeakTimeUsedS: cableOut.peakTimeUsedS,
      voltageDropPercent: voltageDrop,
      peakCrankingLimitA: params.peakLimitA,
      i2tRequiredA2s:
        params.peakCrankingA !== null && crankingTimeForCalc !== null
          ? computeRequiredI2tA2s(params.peakCrankingA, crankingTimeForCalc)
          : null,
      assumptionsUsed: assumptions,
    },
    summary: { overallStatus, recommendedAction },
    implementationNotes: [...IMPLEMENTATION_FIXES],
    inputMode: meta.inputMode,
    completeness: meta.completeness,
    outputs,
    blocked: false,
  };
}

function manualToParams(m: ManualEntryInput, _db: FuseToolDatabase): CalcParams {
  return {
    safetyFactorPercent: m.safetyFactorPercent,
    voltageDropLimitPercent: m.voltageDropLimitPercent,
    peakCrankingA: m.peakCrankingCurrentA,
    crankingTimeRequiredS: m.crankingTimeRequiredS,
    crankingTimeMeasuredS: m.crankingTimeRequiredS,
    maxAllowedCrankingTimeS: m.maxAllowedCrankingTimeS ?? null,
    crankingVoltageV: m.crankingVoltageMeasuredV ?? null,
    minBatteryV: m.minBatteryVoltageV ?? null,
    systemVoltageV: m.electricalSystemV,
    alternatorA: m.alternatorContinuousA,
    cableContinuousA: m.cableContinuousA,
    cableSizeMm2: m.cableSizeMm2,
    cableLengthM: m.cableLengthM,
    cableType: m.cableType,
    operatingTempC: m.operatingTempC,
    peakLimitA: m.peakCurrentCutoffA,
    kFactorOverride: m.kFactorCopper,
  };
}

function machineToParams(
  machine: MachineRecord,
  db: FuseToolDatabase,
  safetyFactorPercent: number,
  voltageDropLimitPercent: number,
): CalcParams {
  const peakLimit =
    parseNumber(machine.peakCurrentCutoffA) ?? db.constants.defaultPeakCrankingLimitA;
  return {
    safetyFactorPercent,
    voltageDropLimitPercent,
    peakCrankingA: parseNumber(machine.peakCrankingCurrentA),
    crankingTimeMeasuredS: parseNumber(machine.crankingTimeMeasuredS),
    crankingTimeRequiredS: parseNumber(machine.crankingTimeRequiredS),
    maxAllowedCrankingTimeS: parseNumber(machine.crankingTimeRequiredS),
    crankingVoltageV: parseNumber(machine.crankingVoltageMeasuredV),
    minBatteryV:
      parseNumber(machine.minBatteryVoltageV) ?? db.constants.minBatteryVoltage24V,
    systemVoltageV:
      parseNumber(machine.electricalSystemV) ?? db.constants.defaultElectricalSystemV,
    alternatorA: parseNumber(machine.alternatorContinuousA),
    cableContinuousA: parseNumber(machine.cableContinuousA),
    cableSizeMm2: parseNumber(machine.cableSizeMm2),
    cableLengthM: parseNumber(machine.cableLengthM),
    cableType: (machine.cableType as string) ?? null,
    operatingTempC: parseNumber(machine.operatingTempC),
    peakLimitA: peakLimit,
  };
}

export function calculate(db: FuseToolDatabase, request: CalculationRequest): RecommendationResult {
  if (request.mode === "manual") {
    const validation = validateManualEntry(request.inputs);
    if (!validation.valid) {
      return buildBlockedResult({
        modelId: request.inputs.machineLabel ?? "manual-entry",
        inputMode: "manual",
        completeness: {
          isComplete: false,
          label: "incomplete",
          missingFieldLabels: [],
          canRunFullRecommendation: false,
        },
        checks: [
          {
            id: "validation",
            label: "Manual input validation",
            status: "fail",
            value: null,
            message: validation.errors.join(" "),
            specification: "Required fields must be valid.",
          },
        ],
        blockReason: "Fix validation errors before running calculations.",
        validationErrors: validation.errors,
        summary: { overallStatus: "fail", recommendedAction: "Correct invalid inputs." },
      });
    }

    return runFullCalculation(db, manualToParams(request.inputs, db), {
      modelId: request.inputs.machineLabel ?? "manual-entry",
      machine: null,
      inputMode: "manual",
      completeness: {
        isComplete: true,
        label: "complete",
        missingFieldLabels: [],
        canRunFullRecommendation: true,
      },
    });
  }

  const machine = findMachine(db, request.modelId);
  if (!machine) {
    return buildBlockedResult({
      modelId: request.modelId,
      inputMode: "library",
      completeness: {
        isComplete: false,
        label: "engineering-data-required",
        missingFieldLabels: ["Machine not in library"],
        canRunFullRecommendation: false,
      },
      checks: [
        {
          id: "machine-lookup",
          label: "Machine found in library",
          status: "fail",
          value: null,
          message: `Model "${request.modelId}" not found.`,
          specification: "Library lookup",
        },
      ],
      blockReason: "Unknown machine model.",
      summary: { overallStatus: "fail", recommendedAction: "Select a valid model." },
    });
  }

  const assessment = assessVehicleCompleteness(machine);
  const completeness: RecommendationResult["completeness"] = {
    isComplete: assessment.isComplete,
    label: assessment.label,
    missingFieldLabels: assessment.missingFieldLabels,
    canRunFullRecommendation: assessment.canRunFullRecommendation,
  };

  if (!assessment.canRunFullRecommendation) {
    const labelText =
      assessment.label === "engineering-data-required"
        ? "Engineering data required"
        : "Incomplete data";

    return buildBlockedResult({
      modelId: request.modelId,
      machine,
      inputMode: "library",
      completeness,
      checks: [
        {
          id: "data-completeness",
          label: "Vehicle data completeness",
          status: "warning",
          value: labelText,
          message: `Missing: ${assessment.missingFieldLabels.join(", ")}.`,
          specification: "Full recommendation requires all calculation parameters.",
        },
        {
          id: "machine-lookup",
          label: "Machine found in library",
          status: "pass",
          value: machine.id,
          message: `${machine.manufacturer ?? ""} ${machine.id}`,
          specification: "Library lookup",
        },
      ],
      blockReason: `${labelText} — missing: ${assessment.missingFieldLabels.join(", ")}.`,
      summary: {
        overallStatus: "warning",
        recommendedAction: `Use Manual Entry or add missing data. Missing: ${assessment.missingFieldLabels.join(", ")}.`,
      },
      peakCrankingLimitA:
        parseNumber(machine.peakCurrentCutoffA) ?? db.constants.defaultPeakCrankingLimitA,
    });
  }

  const safety = request.safetyFactorPercent ?? db.constants.defaultSafetyFactorPercent;
  const vdrop = request.voltageDropLimitPercent ?? db.constants.voltageDropPercentLimit;

  return runFullCalculation(
    db,
    machineToParams(machine, db, safety, vdrop),
    { modelId: request.modelId, machine, inputMode: "library", completeness },
  );
}

export function recommend(db: FuseToolDatabase, inputs: RecommendationInputs): RecommendationResult {
  return calculate(db, {
    mode: "library",
    modelId: inputs.modelId,
    safetyFactorPercent: inputs.safetyFactorPercent,
    voltageDropLimitPercent: inputs.voltageDropLimitPercent,
  });
}
