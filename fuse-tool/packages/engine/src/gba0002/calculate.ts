/**
 * GBA-0002 client deliverable — calculation orchestrator.
 *
 * Implements revised PDF specification (GBA-0002 Vehicle database):
 * - User inputs: safety factor, machine, battery V during cranking, operating temp
 * - Constants: min starter 16 V, cranking time 5 s
 * - Cable thermal withstand (k×S/I)² vs cranking time
 * - Max one-way cable length from voltage drop (V)
 * - Fuse: cable rating ≥ fuse ≥ alternator + MEGA32V withstand at inrush
 */

import type { CableCapacityRow, FuseToolDatabase, MachineRecord } from "../types.js";
import { parseNumber } from "../parseValue.js";
import {
  findMachine,
  findFuseRecord,
  lookupCableResistance,
  lookupWithstandTimeS,
  sortedFuseRatingOptions,
} from "../lookups.js";
import {
  GBA0002_CLIENT_MACHINE_IDS,
  GBA0002_CRANKING_TIME_S,
  GBA0002_MIN_STARTER_VOLTAGE_V,
} from "./constants.js";
import {
  cableThermalWithstandPass,
  computeCablePeakCapabilityA,
  lookupKFactorStrict,
  parseTemperatureLimit,
  temperatureSupported,
} from "./helpers.js";
import type {
  Gba0002CableResult,
  Gba0002DerivedParameters,
  Gba0002FuseResult,
  Gba0002LineItem,
  Gba0002Result,
  Gba0002UserInputs,
} from "./types.js";
import {
  mergeValidation,
  resolveSystemVoltageV,
  validateGba0002Inputs,
  validateGba0002Outputs,
} from "./validation.js";

export function filterClientMachines(machines: MachineRecord[]): MachineRecord[] {
  const set = new Set<string>(GBA0002_CLIENT_MACHINE_IDS);
  return GBA0002_CLIENT_MACHINE_IDS.map(
    (id) => machines.find((m) => m.id === id) ?? null,
  ).filter((m): m is MachineRecord => m !== null && set.has(m.id));
}

/** PDF line item 14: (k × S / I)² */
export function computeCableThermalWithstandTimeS(
  k: number,
  sizeMm2: number,
  crankingCurrentA: number,
): number {
  if (crankingCurrentA <= 0) return 0;
  const ratio = (k * sizeMm2) / crankingCurrentA;
  return ratio * ratio;
}

/** PDF line item 18: (ΔV_max × 1000) / (I × 2 × R/km) */
export function computeMaxAllowableOneWayLengthM(
  maxVoltageDropV: number,
  crankingCurrentA: number,
  resistanceOhmPerKm: number,
): number | null {
  if (crankingCurrentA <= 0 || resistanceOhmPerKm <= 0 || maxVoltageDropV <= 0) return null;
  return (maxVoltageDropV * 1000) / (crankingCurrentA * 2 * resistanceOhmPerKm);
}

function findUpgradeCable(
  db: FuseToolDatabase,
  crankingA: number,
  alternatorA: number,
  operatingTempC: number,
  crankingTimeS: number,
): CableCapacityRow | null {
  const candidates = db.cableCapacity
    .filter((row) => {
      const k = lookupKFactorStrict(row.cableType, db.copperKFactors);
      if (k === null) return false;
      const thermal = computeCableThermalWithstandTimeS(k, row.sizeMm2, crankingA);
      const maxT = parseNumber(row.maxConductorTempC);
      return (
        thermal >= crankingTimeS &&
        row.continuousCurrentA >= alternatorA &&
        (maxT === null || operatingTempC <= maxT)
      );
    })
    .sort((a, b) => a.sizeMm2 - b.sizeMm2);
  return candidates[0] ?? null;
}

function parseTempRange(maxTemp: number | null | undefined): string {
  if (maxTemp === null || maxTemp === undefined) return "—";
  return `Up to ${maxTemp}°C`;
}

function selectFuse(
  db: FuseToolDatabase,
  alternatorA: number,
  cableRatingA: number,
  inrushA: number,
  safetyFactorPercent: number,
  crankingTimeS: number,
  operatingTempC: number,
): Gba0002FuseResult {
  const options = sortedFuseRatingOptions(db.fuseLibrary);
  const minTarget = alternatorA * (1 + safetyFactorPercent / 100);
  const breakingCurrent = inrushA;

  let best: {
    rating: number;
    withstand: number;
    fuse: ReturnType<typeof findFuseRecord>;
  } | null = null;

  for (const rating of options) {
    if (rating < alternatorA) continue;
    if (rating > cableRatingA) continue;
    if (rating < minTarget - 0.01) continue;

    const fuse = findFuseRecord(rating, breakingCurrent, db.fuseLibrary);
    if (!fuse) continue;
    const fuseTemp = parseTemperatureLimit(fuse.temperatureRangeC);
    const fuseTempOk = temperatureSupported(operatingTempC, fuseTemp);
    if (fuseTempOk !== true) continue;

    const withstand = lookupWithstandTimeS(
      breakingCurrent,
      rating,
      db.mega32vCurve,
      fuse,
    );
    if (withstand === null || withstand < crankingTimeS) continue;

    if (!best || rating < best.rating) {
      best = { rating, withstand, fuse };
    }
  }

  // If none meet safety target, try any rating in [alternator, cable] with withstand OK
  if (!best) {
    for (const rating of options) {
      if (rating < alternatorA || rating > cableRatingA) continue;
      const fuse = findFuseRecord(rating, breakingCurrent, db.fuseLibrary);
      if (!fuse) continue;
      const fuseTemp = parseTemperatureLimit(fuse.temperatureRangeC);
      if (temperatureSupported(operatingTempC, fuseTemp) !== true) continue;
      const withstand = lookupWithstandTimeS(
        breakingCurrent,
        rating,
        db.mega32vCurve,
        fuse,
      );
      if (withstand !== null && withstand >= crankingTimeS) {
        if (!best || rating < best.rating) {
          best = { rating, withstand, fuse };
        }
      }
    }
  }

  if (!best || !best.fuse) {
    return {
      suggestedFuseSizeA: null,
      fuseMakeModel: null,
      fusePartNumber: null,
      fuseOperatingTempC: null,
      fuseOperatingTempPass: false,
      withstandTimeS: null,
      fusePass: false,
      message: "No fuse found — cable rating ≥ fuse ≥ alternator with required withstand time.",
      selectedFuse: null,
    };
  }

  const f = best.fuse;
  const makeModel = [f.manufacturer, f.description].filter(Boolean).join(" · ");
  const tempPass = temperatureSupported(operatingTempC, parseTemperatureLimit(f.temperatureRangeC)) === true;

  return {
    suggestedFuseSizeA: best.rating,
    fuseMakeModel: makeModel || null,
    fusePartNumber: f.manufacturerPartNumber ?? null,
    fuseOperatingTempC: f.temperatureRangeC ?? null,
    fuseOperatingTempPass: tempPass,
    withstandTimeS: best.withstand,
    fusePass: true,
    message: `Fuse ${best.rating} A — withstand ${best.withstand} s at ${breakingCurrent} A inrush.`,
    selectedFuse: f,
  };
}

export function calculateGba0002(
  db: FuseToolDatabase,
  inputs: Gba0002UserInputs,
): Gba0002Result {
  const lineItems: Gba0002LineItem[] = [];
  const machine = findMachine(db, inputs.modelId);
  /** GBA-0002 PDF line item 11 — engineering calculations use 5 s unless fleet record overrides. */
  const calculationCrankingTimeS = GBA0002_CRANKING_TIME_S;

  if (!machine) {
    return {
      modelId: inputs.modelId,
      machineFound: false,
      blocked: true,
      blockReason: "Machine not in client sample list.",
      systemVoltageV: 24,
      validation: { errors: ["Machine not in client sample list."], warnings: [] },
      inputs,
      derived: emptyDerived(calculationCrankingTimeS),
      cable: unsuitableCable("Machine not found."),
      fuse: failedFuse("Machine not found."),
      lineItems: [],
      overallStatus: "fail",
      summary: "Select a machine from the client sample list.",
    };
  }

  const systemVoltageV = resolveSystemVoltageV(machine);

  if (!GBA0002_CLIENT_MACHINE_IDS.includes(machine.id as (typeof GBA0002_CLIENT_MACHINE_IDS)[number])) {
    return {
      modelId: inputs.modelId,
      machineFound: true,
      blocked: true,
      blockReason: "Machine is not in the nine-vehicle client deliverable set.",
      systemVoltageV,
      validation: {
        errors: ["Machine is outside the client-approved sample list."],
        warnings: [],
      },
      inputs,
      derived: emptyDerived(calculationCrankingTimeS),
      cable: unsuitableCable("Not in client fleet."),
      fuse: failedFuse("Not in client fleet."),
      lineItems: [],
      overallStatus: "fail",
      summary: "This machine is outside the client-approved sample list.",
    };
  }

  const inputValidation = validateGba0002Inputs(inputs, machine);
  if (inputValidation.errors.length > 0) {
    return {
      modelId: inputs.modelId,
      machineFound: true,
      blocked: true,
      blockReason: inputValidation.errors[0],
      systemVoltageV,
      validation: inputValidation,
      inputs,
      derived: emptyDerived(calculationCrankingTimeS),
      cable: unsuitableCable("Input validation failed."),
      fuse: failedFuse("Input validation failed."),
      lineItems: [],
      overallStatus: "fail",
      summary: inputValidation.errors.join(" "),
    };
  }

  const crankingA = parseNumber(machine.peakCrankingCurrentA);
  const alternatorA = parseNumber(machine.alternatorContinuousA);
  const cableSize = parseNumber(machine.cableSizeMm2);
  const cableType = (machine.cableType as string) ?? null;
  const existingCableCont = parseNumber(machine.cableContinuousA);
  const machineOpTemp = parseNumber(machine.operatingTempC);

  if (crankingA === null || alternatorA === null || cableSize === null || !cableType) {
    return {
      modelId: inputs.modelId,
      machineFound: true,
      blocked: true,
      blockReason: "Machine record missing required cranking, alternator, or cable data.",
      systemVoltageV,
      validation: {
        errors: ["Fleet record incomplete for this machine."],
        warnings: inputValidation.warnings,
      },
      inputs,
      derived: emptyDerived(calculationCrankingTimeS),
      cable: unsuitableCable("Incomplete machine data."),
      fuse: failedFuse("Incomplete machine data."),
      lineItems: [],
      overallStatus: "fail",
      summary: "Fleet record incomplete for this machine.",
    };
  }

  const kFactor = lookupKFactorStrict(cableType, db.copperKFactors);
  if (kFactor === null) {
    return {
      modelId: inputs.modelId,
      machineFound: true,
      blocked: true,
      blockReason: "K-factor not found for this cable type.",
      systemVoltageV,
      validation: {
        errors: ["K-factor not found for cable type from MachinesOnSite (AD) in Copper_k_factor."],
        warnings: inputValidation.warnings,
      },
      inputs,
      derived: emptyDerived(calculationCrankingTimeS),
      cable: unsuitableCable("K-factor not found for this cable type. Engineering review required."),
      fuse: failedFuse("K-factor lookup failed."),
      lineItems: [],
      overallStatus: "fail",
      summary: "K-factor not found for cable type from MachinesOnSite (AD) in Copper_k_factor.",
    };
  }

  const resistance =
    lookupCableResistance(cableSize, db.cableCapacity) ??
  parseNumber(
      db.cableCapacity.find((c) => c.sizeMm2 === cableSize)?.resistanceOhmPerKm,
    );

  const maxVoltageDropV =
    inputs.batteryVoltageDuringCrankingV - GBA0002_MIN_STARTER_VOLTAGE_V;

  const thermalTime = computeCableThermalWithstandTimeS(kFactor, cableSize, crankingA);
  const peakCapA = round2(computeCablePeakCapabilityA(kFactor, cableSize, calculationCrankingTimeS));
  const thermalPass = cableThermalWithstandPass(
    kFactor,
    cableSize,
    crankingA,
    calculationCrankingTimeS,
  );
  const currentPass = existingCableCont !== null && existingCableCont >= alternatorA;
  const machineTempLimit = parseTemperatureLimit(machineOpTemp);
  const cableTempOk = temperatureSupported(inputs.operatingTempC, machineTempLimit);

  const derived: Gba0002DerivedParameters = {
    minStarterVoltageV: GBA0002_MIN_STARTER_VOLTAGE_V,
    crankingTimeS: calculationCrankingTimeS,
    maxAllowableVoltageDropV: maxVoltageDropV,
    existingCableSizeMm2: cableSize,
    cableResistanceOhmPerKm: resistance,
    starterCrankingCurrentA: crankingA,
    alternatorContinuousA: alternatorA,
    cableTypePresent: cableType,
    kFactor,
    existingCableContinuousA: existingCableCont,
  };

  lineItems.push(
    li(5, "Minimum starter voltage (V)", GBA0002_MIN_STARTER_VOLTAGE_V, "pass"),
    li(
      6,
      "Maximum allowable voltage drop (V)",
      maxVoltageDropV,
      maxVoltageDropV > 0 ? "pass" : "fail",
      "Battery V during cranking − 16 V",
    ),
    li(7, "Existing cable size (mm²)", cableSize, "pass"),
    li(8, "Cable resistance (Ω/km)", resistance, resistance !== null ? "pass" : "warning"),
    li(9, "Starter cranking current (A)", crankingA, "pass"),
    li(10, "Alternator continuous current (A)", alternatorA, "pass"),
    li(11, "Cranking time (s)", calculationCrankingTimeS, "pass"),
    li(12, "Cable type present", cableType, "pass"),
    li(13, "Cable material factor (k)", kFactor, "pass", "Copper_k_factor lookup by cable type (AD)"),
    li(
      14,
      "Cable thermal withstand time (s)",
      round2(thermalTime),
      thermalPass ? "pass" : "fail",
      `(k×S/I)² = (${kFactor}×${cableSize}/${crankingA})²; peak cap ${peakCapA} A = k×S/√t`,
    ),
    li(
      15,
      "Existing cable thermal withstand pass?",
      thermalPass ? "YES" : "NO",
      thermalPass ? "pass" : "fail",
    ),
  );

  let cableResult: Gba0002CableResult;

  const existingOk =
    thermalPass &&
    currentPass &&
    cableTempOk === true &&
    maxVoltageDropV > 0;

  if (existingOk) {
    const maxLen =
      resistance !== null
        ? computeMaxAllowableOneWayLengthM(maxVoltageDropV, crankingA, resistance)
        : null;
    const opPass = cableTempOk === true;
    cableResult = {
      recommendationStatus: "no-change",
      cableType,
      cableSizeMm2: cableSize,
      cableCurrentRatingA: existingCableCont,
      cableThermalWithstandTimeS: thermalTime,
      thermalWithstandPass: true,
      maxAllowableOneWayLengthM: maxLen !== null ? round2(maxLen) : null,
      operatingTempRangeC: parseTempRange(machineOpTemp ?? 90),
      operatingTempPass: opPass,
      message: "No change in cable type or size — existing cable passes thermal withstand.",
    };
    lineItems.push(
      li(16, "Cable type & size", `${cableType} · ${cableSize} mm² — no change`, "pass"),
      li(
        17,
        "Cable current rating (A)",
        existingCableCont,
        existingCableCont !== null && existingCableCont >= alternatorA ? "pass" : "fail",
      ),
      li(18, "Max allowable one-way cable length (m)", cableResult.maxAllowableOneWayLengthM, "pass"),
      li(19, "Cable operating temperature range", cableResult.operatingTempRangeC, opPass ? "pass" : "warning"),
    );
  } else {
    const upgrade = findUpgradeCable(
      db,
      crankingA,
      alternatorA,
      inputs.operatingTempC,
      calculationCrankingTimeS,
    );
    if (upgrade) {
      const upgradeK = lookupKFactorStrict(upgrade.cableType, db.copperKFactors);
      const upgradeThermal = computeCableThermalWithstandTimeS(
        upgradeK ?? kFactor,
        upgrade.sizeMm2,
        crankingA,
      );
      const upResistance = parseNumber(upgrade.resistanceOhmPerKm);
      const maxLen =
        upResistance !== null
          ? computeMaxAllowableOneWayLengthM(maxVoltageDropV, crankingA, upResistance)
          : null;
      const opPass = temperatureSupported(
        inputs.operatingTempC,
        parseTemperatureLimit(upgrade.maxConductorTempC),
      ) === true;
      cableResult = {
        recommendationStatus: "upgraded",
        cableType: `${upgrade.cableType} · ${upgrade.insulationType}`,
        cableSizeMm2: upgrade.sizeMm2,
        cableCurrentRatingA: upgrade.continuousCurrentA,
        cableThermalWithstandTimeS: upgradeThermal,
        thermalWithstandPass: true,
        maxAllowableOneWayLengthM: maxLen !== null ? round2(maxLen) : null,
        operatingTempRangeC: parseTempRange(upgrade.maxConductorTempC),
        operatingTempPass: opPass,
        message: `Upgrade recommended — ${upgrade.sizeMm2} mm² from Cable_Capacity.`,
      };
      lineItems.push(
        li(16, "Cable type & size", `${cableResult.cableType} · ${upgrade.sizeMm2} mm²`, "warning"),
        li(
          17,
          "Cable current rating (A)",
          upgrade.continuousCurrentA,
          upgrade.continuousCurrentA >= alternatorA ? "pass" : "fail",
        ),
        li(18, "Max allowable one-way cable length (m)", cableResult.maxAllowableOneWayLengthM, "pass"),
        li(19, "Cable operating temperature range", cableResult.operatingTempRangeC, opPass ? "pass" : "warning"),
      );
    } else {
      cableResult = {
        recommendationStatus: "unsuitable",
        cableType: null,
        cableSizeMm2: null,
        cableCurrentRatingA: null,
        cableThermalWithstandTimeS: thermalTime,
        thermalWithstandPass: false,
        maxAllowableOneWayLengthM: null,
        operatingTempRangeC: null,
        operatingTempPass: false,
        message:
          "Existing cable is not suitable — an appropriate fit needs to be determined.",
      };
      lineItems.push(
        li(16, "Cable type & size", cableResult.message, "fail"),
        li(17, "Cable current rating (A)", null, "fail"),
        li(18, "Max allowable one-way cable length (m)", null, "unavailable"),
        li(19, "Cable operating temperature range", null, "unavailable"),
      );
    }
  }

  const cableRatingForFuse = cableResult.cableCurrentRatingA ?? existingCableCont ?? 0;
  const fuseResult =
    cableResult.recommendationStatus === "unsuitable" || cableRatingForFuse <= 0
      ? failedFuse("Cable recommendation required before fuse selection.")
      : selectFuse(
          db,
          alternatorA,
          cableRatingForFuse,
          crankingA,
          inputs.safetyFactorPercent,
          calculationCrankingTimeS,
          inputs.operatingTempC,
        );

  lineItems.push(
    li(
      20,
      "Suggested fuse size (A)",
      fuseResult.suggestedFuseSizeA,
      fuseResult.fusePass ? "pass" : "fail",
    ),
    li(21, "Fuse make & part number", fuseResult.fusePartNumber ?? fuseResult.fuseMakeModel, fuseResult.fusePass ? "pass" : "fail"),
    li(22, "Fuse operating temperature range", fuseResult.fuseOperatingTempC, fuseResult.fuseOperatingTempPass ? "pass" : "warning"),
  );

  const cableMaxTemp =
    cableResult.recommendationStatus === "upgraded"
      ? parseNumber(
          db.cableCapacity.find((c) => c.sizeMm2 === cableResult.cableSizeMm2)?.maxConductorTempC,
        )
      : machineOpTemp ?? 90;

  const outputValidation = validateGba0002Outputs(
    cableResult.maxAllowableOneWayLengthM,
    inputs.operatingTempC,
    cableMaxTemp,
    fuseResult.selectedFuse,
    inputValidation.warnings,
  );
  const validation = mergeValidation(inputValidation, outputValidation);

  if (outputValidation.errors.length > 0) {
    return {
      modelId: inputs.modelId,
      machineFound: true,
      blocked: true,
      blockReason: outputValidation.errors[0],
      systemVoltageV,
      validation,
      inputs,
      derived,
      cable: cableResult,
      fuse: fuseResult,
      lineItems,
      overallStatus: "fail",
      summary: outputValidation.errors.join(" "),
    };
  }

  const calcFailed =
    maxVoltageDropV <= 0 ||
    !thermalPass ||
    !currentPass ||
    cableTempOk !== true ||
    cableResult.recommendationStatus === "unsuitable" ||
    !fuseResult.fusePass ||
    !cableResult.operatingTempPass;

  const overallStatus = calcFailed
    ? "fail"
    : validation.warnings.length > 0
      ? "warning"
      : "pass";

  const summary = validation.warnings.length > 0
    ? `Engineering review required for ${machine.id} — ${validation.warnings[0]}`
    : overallStatus === "pass"
      ? `Cable and fuse recommendation for ${machine.id} — engineering approval required.`
      : cableResult.recommendationStatus === "unsuitable"
        ? cableResult.message
        : `Review failed checks for ${machine.id}.`;

  return {
    modelId: inputs.modelId,
    machineFound: true,
    blocked: false,
    systemVoltageV,
    validation,
    inputs,
    derived,
    cable: cableResult,
    fuse: fuseResult,
    lineItems,
    overallStatus,
    summary,
  };
}

function li(
  line: number,
  label: string,
  value: string | number | null,
  status: Gba0002Result["overallStatus"],
  detail?: string,
): Gba0002LineItem {
  return { id: `line-${line}`, line, label, value, status, detail };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function emptyDerived(crankingTimeS = GBA0002_CRANKING_TIME_S): Gba0002DerivedParameters {
  return {
    minStarterVoltageV: GBA0002_MIN_STARTER_VOLTAGE_V,
    crankingTimeS,
    maxAllowableVoltageDropV: 0,
    existingCableSizeMm2: null,
    cableResistanceOhmPerKm: null,
    starterCrankingCurrentA: null,
    alternatorContinuousA: null,
    cableTypePresent: null,
    kFactor: null,
    existingCableContinuousA: null,
  };
}

function unsuitableCable(message: string): Gba0002CableResult {
  return {
    recommendationStatus: "unsuitable",
    cableType: null,
    cableSizeMm2: null,
    cableCurrentRatingA: null,
    cableThermalWithstandTimeS: null,
    thermalWithstandPass: false,
    maxAllowableOneWayLengthM: null,
    operatingTempRangeC: null,
    operatingTempPass: false,
    message,
  };
}

function failedFuse(message: string): Gba0002FuseResult {
  return {
    suggestedFuseSizeA: null,
    fuseMakeModel: null,
    fusePartNumber: null,
    fuseOperatingTempC: null,
    fuseOperatingTempPass: false,
    withstandTimeS: null,
    fusePass: false,
    message,
    selectedFuse: null,
  };
}
