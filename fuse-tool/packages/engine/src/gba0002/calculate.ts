// GBA client calculator (column Q sizing)

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
  GBA0002_CRANKING_TIME_S,
  GBA0002_MIN_STARTER_VOLTAGE_V,
  GBA0002_SAFETY_FACTOR_OPTIONS,
} from "./constants.js";
import {
  cableThermalWithstandPass,
  formatCableDisplay,
  lookupKFactorStrict,
  parseTemperatureLimit,
  requiredFuseCurrentA,
  temperatureSupported,
  type PrototypeStatus,
} from "./helpers.js";
import {
  MSG_BATTERY_VOLTAGE_LOW,
  MSG_CRANKING_TIME_HIGH,
  MSG_STARTER_CRANKING_HIGH,
} from "./messages.js";
import type {
  Gba0002CableResult,
  Gba0002DerivedParameters,
  Gba0002FuseResult,
  Gba0002Result,
  Gba0002UserInputs,
} from "./types.js";

export { GBA0002_SAFETY_FACTOR_OPTIONS };

function machineHasRequiredSupportingData(machine: MachineRecord): boolean {
  const alternatorA = parseNumber(machine.alternatorContinuousA);
  const cableSize = parseNumber(machine.cableSizeMm2);
  const cableType = (machine.cableType as string) ?? null;
  return (
    alternatorA !== null &&
    alternatorA > 0 &&
    cableSize !== null &&
    cableType !== null &&
    cableType.trim().length > 0
  );
}

export function filterClientMachines(machines: MachineRecord[]): MachineRecord[] {
  return machines
    .filter((m) => machineHasRequiredSupportingData(m))
    .sort((a, b) => String(a.id).localeCompare(String(b.id)));
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

/** Cable_Capacity rows use inline kFactor; Copper_K_Factor labels differ (e.g. "Two Single Core"). */
function cableCapacityK(row: CableCapacityRow, db: FuseToolDatabase): number | null {
  const inline = parseNumber(row.kFactor);
  if (inline !== null && inline > 0) return inline;
  return lookupKFactorStrict(row.cableType, db.copperKFactors);
}

function findReplacementCable(
  db: FuseToolDatabase,
  crankingA: number,
  alternatorA: number,
  operatingTempC: number,
): CableCapacityRow | null {
  const candidates = db.cableCapacity
    .filter((row) => {
      const k = cableCapacityK(row, db);
      if (k === null) return false;
      const thermal = computeCableThermalWithstandTimeS(k, row.sizeMm2, crankingA);
      if (thermal < GBA0002_CRANKING_TIME_S) return false;
      if (row.continuousCurrentA < alternatorA) return false;
      const temp = parseTemperatureLimit(row.maxConductorTempC);
      const tempOk = temperatureSupported(operatingTempC, temp);
      return tempOk === true;
    })
    .sort((a, b) => a.sizeMm2 - b.sizeMm2);
  return candidates[0] ?? null;
}

function selectFuse(
  db: FuseToolDatabase,
  cableRatingA: number,
  requiredFuseA: number,
  inrushA: number,
  operatingTempC: number,
): Gba0002FuseResult {
  for (const rating of sortedFuseRatingOptions(db.fuseLibrary)) {
    if (rating > cableRatingA) continue;
    if (rating < requiredFuseA - 0.01) continue;

    const fuse = findFuseRecord(rating, inrushA, db.fuseLibrary);
    if (!fuse) continue;

    const withstand = lookupWithstandTimeS(inrushA, rating, db.mega32vCurve, fuse);
    if (withstand === null || withstand < GBA0002_CRANKING_TIME_S) continue;

    const fuseTemp = parseTemperatureLimit(fuse.temperatureRangeC);
    const fuseTempOk = temperatureSupported(operatingTempC, fuseTemp);
    if (fuseTempOk !== true) continue;

    return {
      suggestedFuseSizeA: rating,
      fuseMakeModel: fuse.manufacturer ?? null,
      fusePartNumber: fuse.manufacturerPartNumber ?? null,
      fuseOperatingTempC: fuse.temperatureRangeC ?? null,
      fuseOperatingTempPass: true,
      withstandTimeS: withstand,
      fusePass: true,
      message: `Fuse ${rating} A`,
      selectedFuse: fuse,
    };
  }

  return failedFuse("No relevant fuse size found.");
}

function failResult(
  inputs: Gba0002UserInputs,
  statusLabel: PrototypeStatus,
  summary: string,
  derived: Gba0002DerivedParameters = emptyDerived(),
  manufacturer: string | null = null,
): Gba0002Result {
  return {
    modelId: inputs.modelId,
    manufacturer,
    machineFound: statusLabel !== "DATA MISSING" || summary.includes("machine"),
    blocked: statusLabel === "DATA MISSING",
    blockReason: statusLabel === "DATA MISSING" ? summary : undefined,
    statusLabel,
    inputs,
    derived,
    cable: unsuitableCable(summary),
    fuse: failedFuse(summary),
    summary,
  };
}

export function calculateGba0002(
  db: FuseToolDatabase,
  inputs: Gba0002UserInputs,
): Gba0002Result {
  if (
    !GBA0002_SAFETY_FACTOR_OPTIONS.includes(inputs.safetyFactorPercent) ||
    !Number.isFinite(inputs.batteryVoltageDuringCrankingV) ||
    !Number.isFinite(inputs.operatingTempC)
  ) {
    return failResult(inputs, "FAIL", "Invalid input: check safety factor, battery voltage, and temperature.");
  }

  if (inputs.batteryVoltageDuringCrankingV <= 0) {
    return failResult(inputs, "FAIL", "Battery voltage during cranking must be positive.");
  }

  if (inputs.batteryVoltageDuringCrankingV > 36) {
    return failResult(
      inputs,
      "ENGINEERING REVIEW REQUIRED",
      "Battery voltage looks unrealistic for a 24 V starter circuit.",
    );
  }

  const machine = findMachine(db, inputs.modelId);
  const manufacturer = (machine?.manufacturer as string) ?? null;

  if (!machine) {
    return failResult(inputs, "DATA MISSING", "Machine not found in local database.");
  }

  // v1.1: battery voltage vs minimum starter voltage (16 V constant).
  if (inputs.batteryVoltageDuringCrankingV < GBA0002_MIN_STARTER_VOLTAGE_V) {
    return failResult(inputs, "FAIL", MSG_BATTERY_VOLTAGE_LOW, emptyDerived(), manufacturer);
  }

  const databaseQ = parseNumber(machine.peakCurrentCutoffA);
  const manualQ =
    inputs.manualPeakCurrentCutoffA !== undefined &&
    inputs.manualPeakCurrentCutoffA !== null &&
    Number.isFinite(inputs.manualPeakCurrentCutoffA) &&
    inputs.manualPeakCurrentCutoffA > 0
      ? inputs.manualPeakCurrentCutoffA
      : null;
  const qOverridden = manualQ !== null;
  const designCrankingA = manualQ ?? databaseQ;
  const measuredCrankingA = parseNumber(machine.peakCrankingCurrentA);
  const measuredCrankingTimeS = parseNumber(machine.crankingTimeMeasuredS);
  const alternatorA = parseNumber(machine.alternatorContinuousA);
  const cableSize = parseNumber(machine.cableSizeMm2);
  const cableType = (machine.cableType as string) ?? null;
  const existingCableCont = parseNumber(machine.cableContinuousA);
  const machineTempLimit = parseTemperatureLimit(machine.operatingTempC);

  if (
    designCrankingA === null ||
    designCrankingA <= 0 ||
    alternatorA === null ||
    alternatorA <= 0 ||
    cableSize === null ||
    !cableType
  ) {
    return failResult(
      inputs,
      "DATA MISSING",
      "The starter peak current limit is missing from the machine data.",
      partialDerived({
        databasePeakCurrentCutoffA: databaseQ,
        starterCrankingCurrentOverridden: qOverridden,
        measuredStarterCrankingA: measuredCrankingA,
        measuredCrankingTimeS: measuredCrankingTimeS,
      }),
      manufacturer,
    );
  }

  // v1.1 - measured cranking (T) must not exceed design limit (Q).
  if (measuredCrankingA !== null && measuredCrankingA > designCrankingA) {
    return failResult(
      inputs,
      "FAIL",
      MSG_STARTER_CRANKING_HIGH,
      partialDerived({
        starterCrankingCurrentA: designCrankingA,
        databasePeakCurrentCutoffA: databaseQ,
        starterCrankingCurrentOverridden: qOverridden,
        measuredStarterCrankingA: measuredCrankingA,
        measuredCrankingTimeS: measuredCrankingTimeS,
        alternatorContinuousA: alternatorA,
      }),
      manufacturer,
    );
  }

  // v1.1: measured cranking time (X) must not exceed maximum (5 s).
  if (measuredCrankingTimeS !== null && measuredCrankingTimeS > GBA0002_CRANKING_TIME_S) {
    return failResult(
      inputs,
      "FAIL",
      MSG_CRANKING_TIME_HIGH,
      partialDerived({
        starterCrankingCurrentA: designCrankingA,
        databasePeakCurrentCutoffA: databaseQ,
        starterCrankingCurrentOverridden: qOverridden,
        measuredStarterCrankingA: measuredCrankingA,
        measuredCrankingTimeS: measuredCrankingTimeS,
        alternatorContinuousA: alternatorA,
      }),
      manufacturer,
    );
  }

  const crankingA = designCrankingA;

  const kFactor = lookupKFactorStrict(cableType, db.copperKFactors);
  if (kFactor === null) {
    return failResult(
      inputs,
      "ENGINEERING REVIEW REQUIRED",
      "K-factor not found for this cable type. Engineering review required.",
      partialDerived({
        cableTypePresent: cableType,
        starterCrankingCurrentA: crankingA,
        databasePeakCurrentCutoffA: databaseQ,
        starterCrankingCurrentOverridden: qOverridden,
        measuredStarterCrankingA: measuredCrankingA,
        measuredCrankingTimeS: measuredCrankingTimeS,
        alternatorContinuousA: alternatorA,
      }),
      manufacturer,
    );
  }

  const resistance =
    lookupCableResistance(cableSize, db.cableCapacity) ??
    parseNumber(db.cableCapacity.find((c) => c.sizeMm2 === cableSize)?.resistanceOhmPerKm);
  if (resistance === null) {
    return failResult(inputs, "DATA MISSING", "Cable resistance not found in Cable_Capacity.", emptyDerived(), manufacturer);
  }

  const maxVoltageDropV = inputs.batteryVoltageDuringCrankingV - GBA0002_MIN_STARTER_VOLTAGE_V;
  if (maxVoltageDropV <= 0) {
    return failResult(inputs, "FAIL", MSG_BATTERY_VOLTAGE_LOW, emptyDerived(), manufacturer);
  }

  const thermalTime = computeCableThermalWithstandTimeS(kFactor, cableSize, crankingA);
  const thermalPass = cableThermalWithstandPass(
    kFactor,
    cableSize,
    crankingA,
    GBA0002_CRANKING_TIME_S,
  );
  const currentPass = existingCableCont !== null && existingCableCont >= alternatorA;
  const cableTempOk = temperatureSupported(inputs.operatingTempC, machineTempLimit);
  if (cableTempOk === null) {
    return failResult(
      inputs,
      "ENGINEERING REVIEW REQUIRED",
      "Cable temperature rating could not be interpreted. Engineering review required.",
      partialDerived({
        starterCrankingCurrentA: crankingA,
        databasePeakCurrentCutoffA: databaseQ,
        starterCrankingCurrentOverridden: qOverridden,
        measuredStarterCrankingA: measuredCrankingA,
      }),
      manufacturer,
    );
  }

  const reqFuseA = requiredFuseCurrentA(alternatorA, inputs.safetyFactorPercent);
  const derived: Gba0002DerivedParameters = {
    minStarterVoltageV: GBA0002_MIN_STARTER_VOLTAGE_V,
    crankingTimeS: GBA0002_CRANKING_TIME_S,
    maxAllowableVoltageDropV: maxVoltageDropV,
    requiredFuseCurrentA: reqFuseA,
    existingCableSizeMm2: cableSize,
    cableResistanceOhmPerKm: resistance,
    starterCrankingCurrentA: crankingA,
    databasePeakCurrentCutoffA: databaseQ,
    starterCrankingCurrentOverridden: qOverridden,
    measuredStarterCrankingA: measuredCrankingA,
    measuredCrankingTimeS: measuredCrankingTimeS,
    alternatorContinuousA: alternatorA,
    cableTypePresent: cableType,
    kFactor,
    existingCableContinuousA: existingCableCont,
  };

  let cableResult: Gba0002CableResult;
  const existingOk = thermalPass && currentPass && cableTempOk;

  if (existingOk) {
    const maxLen = computeMaxAllowableOneWayLengthM(maxVoltageDropV, crankingA, resistance);
    cableResult = {
      recommendationStatus: "no-change",
      cableType,
      cableSizeMm2: cableSize,
      cableCurrentRatingA: existingCableCont,
      cableThermalWithstandTimeS: round2(thermalTime),
      thermalWithstandPass: true,
      maxAllowableOneWayLengthM: maxLen !== null ? round2(maxLen) : null,
      operatingTempRangeC: String(machine.operatingTempC ?? "-"),
      operatingTempPass: true,
      message: formatCableDisplay("no-change", cableType, cableSize),
    };
  } else {
    const upgrade = findReplacementCable(db, crankingA, alternatorA, inputs.operatingTempC);
    if (upgrade) {
      const upK = cableCapacityK(upgrade, db);
      const upR = parseNumber(upgrade.resistanceOhmPerKm) ?? resistance;
      const upThermal = upK ? computeCableThermalWithstandTimeS(upK, upgrade.sizeMm2, crankingA) : 0;
      const maxLen = computeMaxAllowableOneWayLengthM(maxVoltageDropV, crankingA, upR);
      cableResult = {
        recommendationStatus: "upgraded",
        cableType: upgrade.cableType,
        cableSizeMm2: upgrade.sizeMm2,
        cableCurrentRatingA: upgrade.continuousCurrentA,
        cableThermalWithstandTimeS: round2(upThermal),
        thermalWithstandPass: upThermal >= GBA0002_CRANKING_TIME_S,
        maxAllowableOneWayLengthM: maxLen !== null ? round2(maxLen) : null,
        operatingTempRangeC: String(upgrade.maxConductorTempC ?? "-"),
        operatingTempPass: true,
        message: formatCableDisplay("upgraded", upgrade.cableType, upgrade.sizeMm2),
      };
    } else {
      cableResult = {
        ...unsuitableCable(
          "Existing cable is not suitable. An appropriate fit needs to be determined.",
        ),
        cableThermalWithstandTimeS: round2(thermalTime),
        thermalWithstandPass: thermalPass,
      };
    }
  }

  if (cableResult.recommendationStatus === "unsuitable") {
    return {
      modelId: inputs.modelId,
      manufacturer,
      machineFound: true,
      blocked: false,
      statusLabel: "FAIL",
      inputs,
      derived,
      cable: cableResult,
      fuse: failedFuse("Cable recommendation required before fuse selection."),
      summary: cableResult.message,
    };
  }

  const cableRating = cableResult.cableCurrentRatingA ?? 0;
  const fuseResult = selectFuse(db, cableRating, reqFuseA, crankingA, inputs.operatingTempC);

  const pass =
    cableResult.operatingTempPass &&
    fuseResult.fusePass &&
    (cableResult.maxAllowableOneWayLengthM === null ||
      cableResult.maxAllowableOneWayLengthM < 1000);

  const statusLabel: PrototypeStatus = pass ? "PASS" : "FAIL";
  return {
    modelId: inputs.modelId,
    manufacturer,
    machineFound: true,
    blocked: false,
    statusLabel,
    inputs,
    derived,
    cable: cableResult,
    fuse: fuseResult,
    summary: pass
      ? "All required cable and fuse conditions are satisfied."
      : fuseResult.fusePass
        ? "A required condition failed."
        : fuseResult.message,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function partialDerived(
  partial: Partial<Gba0002DerivedParameters>,
): Gba0002DerivedParameters {
  return { ...emptyDerived(), ...partial };
}

function emptyDerived(): Gba0002DerivedParameters {
  return {
    minStarterVoltageV: GBA0002_MIN_STARTER_VOLTAGE_V,
    crankingTimeS: GBA0002_CRANKING_TIME_S,
    maxAllowableVoltageDropV: 0,
    requiredFuseCurrentA: null,
    existingCableSizeMm2: null,
    cableResistanceOhmPerKm: null,
    starterCrankingCurrentA: null,
    databasePeakCurrentCutoffA: null,
    starterCrankingCurrentOverridden: false,
    measuredStarterCrankingA: null,
    measuredCrankingTimeS: null,
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
