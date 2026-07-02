/**
 * GBA-0002 client deliverable — types (revised PDF pages 3–4).
 */

import type { CheckStatus, FuseRecord } from "../types.js";

export type Gba0002InputMode = "simple" | "advanced";

export interface Gba0002UserInputs {
  modelId: string;
  /** Simple Mode: 25 or 50 (%). Advanced Mode: 0–60 with review thresholds. */
  safetyFactorPercent: number;
  /** PDF user input 3 — measured battery voltage during cranking (V, positive DC magnitude). */
  batteryVoltageDuringCrankingV: number;
  /** PDF user input 4 — site operating temperature (°C). */
  operatingTempC: number;
  /** Cranking duration (s); defaults to 5 s when omitted. */
  crankingTimeS?: number;
  /** Simple (field) or Advanced (engineer) input mode. */
  inputMode?: Gba0002InputMode;
}

export interface Gba0002Validation {
  errors: string[];
  warnings: string[];
}

export type CableRecommendationStatus =
  | "no-change"
  | "upgraded"
  | "unsuitable";

export interface Gba0002CableResult {
  recommendationStatus: CableRecommendationStatus;
  cableType: string | null;
  cableSizeMm2: number | null;
  cableCurrentRatingA: number | null;
  cableThermalWithstandTimeS: number | null;
  thermalWithstandPass: boolean;
  maxAllowableOneWayLengthM: number | null;
  operatingTempRangeC: string | null;
  operatingTempPass: boolean;
  message: string;
}

export interface Gba0002FuseResult {
  suggestedFuseSizeA: number | null;
  fuseMakeModel: string | null;
  fusePartNumber: string | null;
  fuseOperatingTempC: string | null;
  fuseOperatingTempPass: boolean;
  withstandTimeS: number | null;
  fusePass: boolean;
  message: string;
  selectedFuse: FuseRecord | null;
}

export interface Gba0002DerivedParameters {
  minStarterVoltageV: number;
  crankingTimeS: number;
  maxAllowableVoltageDropV: number;
  existingCableSizeMm2: number | null;
  cableResistanceOhmPerKm: number | null;
  starterCrankingCurrentA: number | null;
  alternatorContinuousA: number | null;
  cableTypePresent: string | null;
  kFactor: number | null;
  existingCableContinuousA: number | null;
}

export interface Gba0002LineItem {
  id: string;
  line: number;
  label: string;
  value: string | number | null;
  status: CheckStatus;
  detail?: string;
}

export interface Gba0002Result {
  modelId: string;
  machineFound: boolean;
  blocked: boolean;
  blockReason?: string;
  /** Nominal electrical system class from machine library (12 V or 24 V). */
  systemVoltageV: 12 | 24;
  validation: Gba0002Validation;
  inputs: Gba0002UserInputs;
  derived: Gba0002DerivedParameters;
  cable: Gba0002CableResult;
  fuse: Gba0002FuseResult;
  lineItems: Gba0002LineItem[];
  overallStatus: CheckStatus;
  summary: string;
}
