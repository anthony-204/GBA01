/**
 * GBA-0002 client v0 — minimal calculation (no trace line items).
 */

import type { CableCapacityRow, FuseToolDatabase, MachineRecord } from "../types.js";
import { parseNumber } from "../parseValue.js";
import {
  findMachine,
  findFuseRecord,
  lookupKFactor,
  lookupCableResistance,
  lookupWithstandTimeS,
  sortedFuseRatingOptions,
} from "../lookups.js";
import {
  GBA0002_CLIENT_MACHINE_IDS,
  GBA0002_CRANKING_TIME_S,
  GBA0002_MIN_STARTER_VOLTAGE_V,
} from "./constants.js";
import type {
  Gba0002CableResult,
  Gba0002DerivedParameters,
  Gba0002FuseResult,
  Gba0002Result,
  Gba0002UserInputs,
} from "./types.js";

export function filterClientMachines(machines: MachineRecord[]): MachineRecord[] {
  return GBA0002_CLIENT_MACHINE_IDS.map(
    (id) => machines.find((m) => m.id === id) ?? null,
  ).filter((m): m is MachineRecord => m !== null);
}

export function computeCableThermalWithstandTimeS(
  k: number,
  sizeMm2: number,
  crankingCurrentA: number,
): number {
  if (crankingCurrentA <= 0) return 0;
  const ratio = (k * sizeMm2) / crankingCurrentA;
  return ratio * ratio;
}

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
): CableCapacityRow | null {
  const candidates = db.cableCapacity
    .filter((row) => {
      const k = row.kFactor ?? db.constants.defaultKFactorCopper;
      const thermal = computeCableThermalWithstandTimeS(k, row.sizeMm2, crankingA);
      const maxT = parseNumber(row.maxConductorTempC);
      return (
        thermal >= GBA0002_CRANKING_TIME_S &&
        row.continuousCurrentA >= alternatorA &&
        (maxT === null || operatingTempC <= maxT)
      );
    })
    .sort((a, b) => a.sizeMm2 - b.sizeMm2);
  return candidates[0] ?? null;
}

function selectFuse(
  db: FuseToolDatabase,
  alternatorA: number,
  cableRatingA: number,
  inrushA: number,
  safetyFactorPercent: number,
): Gba0002FuseResult {
  const options = sortedFuseRatingOptions(db.fuseLibrary);
  const minTarget = alternatorA * (1 + safetyFactorPercent / 100);

  for (const rating of options) {
    if (rating < alternatorA || rating > cableRatingA || rating < minTarget - 0.01) continue;
    const fuse = findFuseRecord(rating, inrushA, db.fuseLibrary);
    const withstand = lookupWithstandTimeS(inrushA, rating, db.mega32vCurve, fuse);
    if (withstand !== null && withstand >= GBA0002_CRANKING_TIME_S && fuse) {
      return {
        suggestedFuseSizeA: rating,
        fuseMakeModel: [fuse.manufacturer, fuse.description].filter(Boolean).join(" · ") || null,
        fusePartNumber: fuse.manufacturerPartNumber ?? null,
        fuseOperatingTempC: fuse.temperatureRangeC ?? null,
        fuseOperatingTempPass: true,
        withstandTimeS: withstand,
        fusePass: true,
        message: `Fuse ${rating} A`,
        selectedFuse: fuse,
      };
    }
  }

  return failedFuse("No suitable fuse found.");
}

function blockedResult(
  inputs: Gba0002UserInputs,
  reason: string,
): Gba0002Result {
  return {
    modelId: inputs.modelId,
    machineFound: false,
    blocked: true,
    blockReason: reason,
    inputs,
    derived: emptyDerived(),
    cable: unsuitableCable(reason),
    fuse: failedFuse(reason),
    lineItems: [],
    overallStatus: "fail",
    summary: reason,
  };
}

export function calculateGba0002(
  db: FuseToolDatabase,
  inputs: Gba0002UserInputs,
): Gba0002Result {
  if (inputs.batteryVoltageDuringCrankingV <= 0 || !Number.isFinite(inputs.batteryVoltageDuringCrankingV)) {
    return blockedResult(inputs, "Battery voltage must be a positive number.");
  }

  const machine = findMachine(db, inputs.modelId);
  if (!machine || !GBA0002_CLIENT_MACHINE_IDS.includes(machine.id as (typeof GBA0002_CLIENT_MACHINE_IDS)[number])) {
    return blockedResult(inputs, "Select a machine from the client sample list.");
  }

  const crankingA = parseNumber(machine.peakCrankingCurrentA);
  const alternatorA = parseNumber(machine.alternatorContinuousA);
  const cableSize = parseNumber(machine.cableSizeMm2);
  const cableType = (machine.cableType as string) ?? null;
  const existingCableCont = parseNumber(machine.cableContinuousA);
  const machineOpTemp = parseNumber(machine.operatingTempC);

  if (crankingA === null || alternatorA === null || cableSize === null || !cableType) {
    return blockedResult(inputs, "Incomplete machine data.");
  }

  const kFactor = lookupKFactor(cableType, db.copperKFactors, db.constants.defaultKFactorCopper);
  const resistance =
    lookupCableResistance(cableSize, db.cableCapacity) ??
    parseNumber(db.cableCapacity.find((c) => c.sizeMm2 === cableSize)?.resistanceOhmPerKm);

  const maxVoltageDropV = inputs.batteryVoltageDuringCrankingV - GBA0002_MIN_STARTER_VOLTAGE_V;
  const thermalTime = computeCableThermalWithstandTimeS(kFactor, cableSize, crankingA);
  const thermalPass = thermalTime >= GBA0002_CRANKING_TIME_S;

  const derived: Gba0002DerivedParameters = {
    minStarterVoltageV: GBA0002_MIN_STARTER_VOLTAGE_V,
    crankingTimeS: GBA0002_CRANKING_TIME_S,
    maxAllowableVoltageDropV: maxVoltageDropV,
    existingCableSizeMm2: cableSize,
    cableResistanceOhmPerKm: resistance,
    starterCrankingCurrentA: crankingA,
    alternatorContinuousA: alternatorA,
    cableTypePresent: cableType,
    kFactor,
    existingCableContinuousA: existingCableCont,
  };

  let cableResult: Gba0002CableResult;

  if (thermalPass && maxVoltageDropV > 0) {
    const maxLen =
      resistance !== null
        ? computeMaxAllowableOneWayLengthM(maxVoltageDropV, crankingA, resistance)
        : null;
    cableResult = {
      recommendationStatus: "no-change",
      cableType,
      cableSizeMm2: cableSize,
      cableCurrentRatingA: existingCableCont,
      cableThermalWithstandTimeS: thermalTime,
      thermalWithstandPass: true,
      maxAllowableOneWayLengthM: maxLen !== null ? round2(maxLen) : null,
      operatingTempRangeC: machineOpTemp !== null ? `Up to ${machineOpTemp}°C` : null,
      operatingTempPass: machineOpTemp === null || inputs.operatingTempC <= machineOpTemp,
      message: "No cable change required.",
    };
  } else {
    const upgrade = findUpgradeCable(db, crankingA, alternatorA, inputs.operatingTempC);
    if (upgrade) {
      const upR = parseNumber(upgrade.resistanceOhmPerKm);
      const maxLen =
        upR !== null && maxVoltageDropV > 0
          ? computeMaxAllowableOneWayLengthM(maxVoltageDropV, crankingA, upR)
          : null;
      cableResult = {
        recommendationStatus: "upgraded",
        cableType: `${upgrade.cableType} · ${upgrade.insulationType}`,
        cableSizeMm2: upgrade.sizeMm2,
        cableCurrentRatingA: upgrade.continuousCurrentA,
        cableThermalWithstandTimeS: computeCableThermalWithstandTimeS(
          upgrade.kFactor ?? kFactor,
          upgrade.sizeMm2,
          crankingA,
        ),
        thermalWithstandPass: true,
        maxAllowableOneWayLengthM: maxLen !== null ? round2(maxLen) : null,
        operatingTempRangeC:
          upgrade.maxConductorTempC != null ? `Up to ${upgrade.maxConductorTempC}°C` : null,
        operatingTempPass:
          upgrade.maxConductorTempC == null ||
          inputs.operatingTempC <= upgrade.maxConductorTempC,
        message: `Upgrade to ${upgrade.sizeMm2} mm².`,
      };
    } else {
      cableResult = unsuitableCable("Existing cable is not suitable.");
    }
  }

  const cableRating = cableResult.cableCurrentRatingA ?? existingCableCont ?? 0;
  const fuseResult =
    cableResult.recommendationStatus === "unsuitable" || cableRating <= 0
      ? failedFuse("Cable recommendation required.")
      : selectFuse(db, alternatorA, cableRating, crankingA, inputs.safetyFactorPercent);

  const ok =
    maxVoltageDropV > 0 &&
    thermalPass &&
    cableResult.recommendationStatus !== "unsuitable" &&
    fuseResult.fusePass;

  return {
    modelId: inputs.modelId,
    machineFound: true,
    blocked: false,
    inputs,
    derived,
    cable: cableResult,
    fuse: fuseResult,
    lineItems: [],
    overallStatus: ok ? "pass" : "fail",
    summary: ok
      ? `Recommendation for ${machine.id} — engineering approval required.`
      : `Checks failed for ${machine.id}.`,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function emptyDerived(): Gba0002DerivedParameters {
  return {
    minStarterVoltageV: GBA0002_MIN_STARTER_VOLTAGE_V,
    crankingTimeS: GBA0002_CRANKING_TIME_S,
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
