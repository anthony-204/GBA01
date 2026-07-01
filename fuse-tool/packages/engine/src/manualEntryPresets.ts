/**
 * Manual entry field presets — Version 2 branch feature.
 *
 * Sources:
 * - default: B45E-aligned engineering defaults (web app original)
 * - excel: Fuse_GUI_APP.xlsx User Input column O/Q ("When information unavailable")
 *
 * Authoritative workbook: Fuse_GUI_APP.xlsx (same manual-entry block as
 * GBA-RMIT-0002 Vehicle database.xlsx; RMIT file differs only in library model G5).
 */

import type { ManualEntryInput } from "./types.js";

/** Original web app preset (B45E-style tailings dam truck). */
export const DEFAULT_MANUAL_PRESET: ManualEntryInput = {
  machineLabel: "Manual entry (app default)",
  safetyFactorPercent: 25,
  crankingTimeRequiredS: 5,
  electricalSystemV: 24,
  voltageDropLimitPercent: 3,
  peakCrankingCurrentA: 200,
  alternatorContinuousA: 80,
  cableType: "Thermosetting 90°C XLPE EDR",
  cableSizeMm2: 70,
  cableContinuousA: 314,
  cableLengthM: 6,
  operatingTempC: 60,
  peakCurrentCutoffA: 500,
  crankingVoltageMeasuredV: 20,
  minBatteryVoltageV: 16.48,
};

/**
 * Excel User Input column O/Q manual-entry block (Fuse_GUI_APP.xlsx).
 * See docs/MANUAL_ENTRY_EXCEL_PRESETS.md for field mapping and verification.
 */
export const EXCEL_MANUAL_PRESET: ManualEntryInput = {
  machineLabel: "Excel manual entry (column O)",
  /** Maps Excel Q21=125 (×1.25 multiplier) to engine 25% safety-on-alternator convention. */
  safetyFactorPercent: 25,
  crankingTimeRequiredS: 5,
  electricalSystemV: 24,
  voltageDropLimitPercent: 3,
  peakCrankingCurrentA: 1000,
  alternatorContinuousA: 100,
  cableType: "Two Single Core",
  cableSizeMm2: 120,
  /** Cable_Capacity VLOOKUP for 120 mm² Two Single Core / X-90 XLPE @ 90°C → Q24. */
  cableContinuousA: 389,
  /** Excel Q31 computed length for 3% drop at cable continuous current (389 A). */
  cableLengthM: 3.3,
  operatingTempC: 90,
  peakCurrentCutoffA: 1000,
  /** Q3 System voltage label — minimum battery / system reference (16 V). */
  minBatteryVoltageV: 16,
  /** Q28 VLOOKUP fails on "Two Single Core"; XLPE 90°C K from Copper_K_Factor. */
  kFactorCopper: 143,
};

export type ManualEntryPresetId = "default" | "excel";

export interface ManualEntryPreset {
  id: ManualEntryPresetId;
  label: string;
  description: string;
  inputs: ManualEntryInput;
}

export const MANUAL_ENTRY_PRESETS: ManualEntryPreset[] = [
  {
    id: "default",
    label: "App default (B45E-style)",
    description: "Original web preset — 200 A cranking, 70 mm² cable, 80 A alternator.",
    inputs: DEFAULT_MANUAL_PRESET,
  },
  {
    id: "excel",
    label: "Excel column O",
    description: "Fuse_GUI_APP User Input manual block — 1000 A, 120 mm², 100 A alternator.",
    inputs: EXCEL_MANUAL_PRESET,
  },
];

export function getManualEntryPreset(id: ManualEntryPresetId): ManualEntryInput {
  const preset = MANUAL_ENTRY_PRESETS.find((p) => p.id === id);
  if (!preset) return { ...DEFAULT_MANUAL_PRESET };
  return { ...preset.inputs };
}

/** Expected Excel computed values for verification (Fuse_GUI_APP, data_only). */
export const EXCEL_MANUAL_EXPECTED = {
  cableContinuousA: 389,
  cableResistanceOhmPerKm: 0.188,
  cableLengthFor3PctDropM: 3.3,
  /** Excel Q33 uses (Q21/100)×Q24 — engine intentionally uses alternator × 1.25 instead. */
  excelFuseTargetFromCableA: 486.25,
  engineFuseTargetFromAlternatorA: 125,
  cablePeakCapabilityA: 7674,
  voltageDropPercentAt389A: 3,
  /** At 1000 A cranking with 3.3 m cable — exceeds 3% limit. */
  voltageDropPercentAt1000A: 5.17,
} as const;
