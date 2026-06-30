/**
 * Human-readable labels for vehicle / manual input fields.
 */

export const FIELD_LABELS: Record<string, string> = {
  peakCrankingCurrentA: "Starter cranking current (A)",
  crankingTimeMeasuredS: "Measured cranking time (s)",
  crankingTimeRequiredS: "Required cranking time (s)",
  alternatorContinuousA: "Alternator continuous current (A)",
  cableType: "Cable type",
  cableSizeMm2: "Cable size (mm²)",
  cableContinuousA: "Cable continuous current rating (A)",
  cableLengthM: "Cable length (m)",
  operatingTempC: "Cable operating temperature (°C)",
  peakCurrentCutoffA: "Starter peak current limit (A)",
  electricalSystemV: "System voltage (V)",
  crankingVoltageMeasuredV: "Measured cranking voltage (V)",
  minBatteryVoltageV: "Minimum allowed battery voltage (V)",
  maxAllowedCrankingTimeS: "Maximum allowed cranking time (s)",
};

export function labelForField(key: string): string {
  return FIELD_LABELS[key] ?? key;
}
