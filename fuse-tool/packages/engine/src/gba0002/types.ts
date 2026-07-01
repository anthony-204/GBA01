/**
 * GBA-0002 client deliverable — types (revised PDF pages 3–4).
 */

import type { CheckStatus, FuseRecord } from "../types.js";

export interface Gba0002UserInputs {
  modelId: string;
  /** 25 or 50 (%) — PDF user input 1. */
  safetyFactorPercent: 25 | 50;
  /** PDF user input 3 — measured battery voltage during cranking (V). */
  batteryVoltageDuringCrankingV: number;
  /** PDF user input 4 — site operating temperature (°C). */
  operatingTempC: number;
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
  inputs: Gba0002UserInputs;
  derived: Gba0002DerivedParameters;
  cable: Gba0002CableResult;
  fuse: Gba0002FuseResult;
  lineItems: Gba0002LineItem[];
  overallStatus: CheckStatus;
  summary: string;
}
