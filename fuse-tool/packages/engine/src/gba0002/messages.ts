/**
 * GBA-0002 client v1.1 — user-facing status messages (spec Version 1.1).
 */

export const MSG_BATTERY_VOLTAGE_LOW =
  "Battery voltage during cranking is below the minimum required value. Charge the battery and re-run the test. If the battery remains below the minimum limit after charging, inspect the battery, cable connections and starter circuit. Replace the battery if it fails battery testing.";

export const MSG_STARTER_CRANKING_HIGH =
  "Measured starter cranking current exceeds the expected maximum value. Check the starter motor condition and replace it if it is determined to be at the end of its service life.";

export const MSG_CRANKING_TIME_HIGH =
  "Cranking time exceeds the recommended maximum value. Inspect the engine starting system, fuel system, cold-start aids, hydraulic unloading system and engine mechanical condition.";
