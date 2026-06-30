/**
 * @fuse-tool/engine — shared types
 *
 * These types mirror the normalized JSON exported from Fuse_GUI_APP.xlsx.
 * Field names use camelCase; Excel typos (e.g. "Manufcturer") are corrected
 * at import time — see scripts/import_from_xlsx.py and docs/DATA_MIGRATION.md.
 */

/** Parsed numeric or sentinel string from legacy Excel cells */
export type ParsedValue = number | string | null;

/** Traffic-light style outcome for a single check */
export type CheckStatus = "pass" | "fail" | "warning" | "unavailable" | "invalid";

export interface Constants {
  defaultSafetyFactorPercent: number;
  defaultPeakCrankingLimitA: number;
  minCrankingTimeRequiredS: number;
  maxAdiabaticCrankingTimeS: number;
  defaultKFactorCopper: number;
  defaultElectricalSystemV: number;
  minBatteryVoltage24V: number;
  voltageDropPercentLimit: number;
  standards: string[];
  notes: string[];
}

export interface MachineRecord {
  id: string;
  sourceRow?: number;
  site?: string;
  manufacturer?: string;
  model?: string;
  category?: string;
  electricalSystemV?: number;
  minBatteryVoltageV?: number;
  peakCurrentCutoffA?: number;
  peakCrankingCurrentA?: number;
  inrushCurrentA?: number;
  crankingTimeMeasuredS?: number;
  crankingTimeRequiredS?: number;
  crankingVoltageMeasuredV?: number;
  alternatorContinuousA?: number;
  cableType?: string;
  cableSizeMm2?: number;
  cableContinuousA?: number;
  cableLengthM?: number;
  operatingTempC?: number;
  fuseInstalledA?: number;
  [key: string]: unknown;
}

export interface FuseRecord {
  gbPartHolder?: string | null;
  manufacturer?: string | null;
  description?: string;
  manufacturerPartNumber?: string | null;
  currentRatingA: number;
  i2tA2s?: number | null;
  breakingCurrentA?: number | null;
  timeFromI2tS?: number | null;
  timeFromGraphS?: number | null;
  interruptingRating?: string | null;
  temperatureRangeC?: string;
  link?: string | null;
  ratingOptionA?: number | null;
}

export interface Mega32vCurve {
  fuseRatingsA: number[];
  rows: Array<{
    crankingCurrentA: number;
    withstandTimeSByRating: Record<string, number | null>;
  }>;
}

export interface CableCapacityRow {
  cableType: string;
  insulationType: string;
  kFactor: number | null;
  installationMethod: string;
  maxConductorTempC?: number;
  sizeMm2: number;
  continuousCurrentA: number;
  resistanceOhmPerKm?: number | null;
}

export interface CopperKFactorRow {
  cableTypeLabel: string;
  kCopper?: number | null;
  kCopperHighTemp?: number | null;
  initialTempC?: number;
  finalTempC?: number | string;
}

export interface FuseToolDatabase {
  constants: Constants;
  machines: MachineRecord[];
  fuseLibrary: FuseRecord[];
  mega32vCurve: Mega32vCurve;
  cableCapacity: CableCapacityRow[];
  copperKFactors: CopperKFactorRow[];
}

/** User-adjustable inputs (mine-site mode defaults from machine record) */
export interface RecommendationInputs {
  modelId: string;
  /** Safety factor as percentage (Excel G3 = 25 → 1.25× continuous) */
  safetyFactorPercent?: number;
}

/** Single auditable check result */
export interface CheckResult {
  id: string;
  label: string;
  status: CheckStatus;
  value: ParsedValue;
  message: string;
  /** Human-readable formula or rule reference */
  specification: string;
  /** Excel cell / legacy reference for traceability */
  legacyReference?: string;
}

export interface FuseRecommendation {
  targetRatingA: number | null;
  selectedRatingA: number | null;
  selectedFuse: FuseRecord | null;
  withstandTimeS: number | null;
  requiredCrankingTimeS: number | null;
  escalationSteps: number;
  i2tRequiredA2s: number | null;
  i2tFuseA2s: number | null;
}

export interface RecommendationResult {
  modelId: string;
  machine: MachineRecord | null;
  checks: CheckResult[];
  fuse: FuseRecommendation;
  derived: {
    kFactorUsed: number | null;
    cablePeakCapabilityA: number | null;
    cablePeakTimeUsedS: number | null;
    voltageDropPercent: number | null;
    peakCrankingLimitA: number;
  };
  summary: {
    overallStatus: CheckStatus;
    recommendedAction: string;
  };
  /** Corrections applied vs legacy Excel/MATLAB */
  implementationNotes: string[];
}
