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
  /**
   * Optional manual override for MachinesOnSite column Q (peak current cut-off, A).
   * When set to a finite value > 0, replaces the database Q for sizing and T≤Q checks.
   */
  manualPeakCurrentCutoffA?: number | null;
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
  /** Column Q — design / inrush worst-case current used for cable and fuse sizing (A). */
  starterCrankingCurrentA: number | null;
  /** True when starterCrankingCurrentA came from manualPeakCurrentCutoffA. */
  starterCrankingCurrentOverridden: boolean;
  /** Database column Q before any manual override (A). */
  databasePeakCurrentCutoffA: number | null;
  /** Column T — measured peak continuous cranking current (A). */
  measuredStarterCrankingA: number | null;
  /** Column X — measured cranking time (s). */
  measuredCrankingTimeS: number | null;
  alternatorContinuousA: number | null;
  cableTypePresent: string | null;
  kFactor: number | null;
  existingCableContinuousA: number | null;
}

export interface Gba0002Result {
  modelId: string;
  manufacturer: string | null;
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
