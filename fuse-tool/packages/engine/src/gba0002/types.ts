/**
 * GBA-0002 prototype types.
 */

import type { FuseRecord } from "../types.js";
import type { PrototypeStatus } from "./helpers.js";

export interface Gba0002UserInputs {
  modelId: string;
  safetyFactorPercent: 25 | 50;
  batteryVoltageDuringCrankingV: number;
  operatingTempC: number;
}

export type CableRecommendationStatus = "no-change" | "upgraded" | "unsuitable";

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
  requiredFuseCurrentA: number | null;
  existingCableSizeMm2: number | null;
  cableResistanceOhmPerKm: number | null;
  starterCrankingCurrentA: number | null;
  alternatorContinuousA: number | null;
  cableTypePresent: string | null;
  kFactor: number | null;
  existingCableContinuousA: number | null;
}

export interface Gba0002Result {
  modelId: string;
  machineFound: boolean;
  blocked: boolean;
  blockReason?: string;
  statusLabel: PrototypeStatus;
  inputs: Gba0002UserInputs;
  derived: Gba0002DerivedParameters;
  cable: Gba0002CableResult;
  fuse: Gba0002FuseResult;
  summary: string;
}
