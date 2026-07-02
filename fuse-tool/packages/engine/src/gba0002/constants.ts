/**
 * GBA-0002 client deliverable — constants (revised PDF spec).
 */

/** Minimum starter motor voltage (V) — PDF line item 5. */
export const GBA0002_MIN_STARTER_VOLTAGE_V = 16;

/** Default cranking time (s) — PDF line item 11 / verification report default. */
export const GBA0002_CRANKING_TIME_S = 5;

/** Cranking-time guardrails (intermittent-duty starter context). */
export const GBA0002_CRANKING_TIME_WARN_S = 10;
export const GBA0002_CRANKING_TIME_HIGH_RISK_S = 15;
export const GBA0002_CRANKING_TIME_MAX_S = 30;

/** Normal-mode operating temperature bounds (°C). */
export const GBA0002_TEMP_MIN_C = -40;
export const GBA0002_TEMP_MAX_C = 125;

/** Supported nominal system voltage classes. */
export const GBA0002_SYSTEM_VOLTAGE_CLASSES = [12, 24] as const;

/** Output sanity — derived one-way length (m). */
export const GBA0002_MAX_DERIVED_LENGTH_M = 100;
export const GBA0002_LENGTH_WARN_M = 10;

/** Allowed safety factor options — Simple Mode (PDF user input 1). */
export const GBA0002_SAFETY_FACTOR_OPTIONS = [25, 50] as const;

/** Advanced Mode safety factor bounds (%). */
export const GBA0002_ADVANCED_SAFETY_MIN = 0;
export const GBA0002_ADVANCED_SAFETY_MAX = 60;
export const GBA0002_ADVANCED_SAFETY_REVIEW_LOW = 10;
export const GBA0002_ADVANCED_SAFETY_REVIEW_HIGH = 50;

/**
 * Client-confirmed complete machine sample list (9 vehicles).
 * PDF sample list names D10T; fleet completeness audit yields nine records.
 */
export const GBA0002_CLIENT_MACHINE_IDS = [
  "D10T",
  "B45E",
  "D11",
  "14M",
  "155 / D155AX-6",
  "375/ D375-5E0",
  "777 (07)",
  "793F",
  "992K",
] as const;

export type Gba0002ClientMachineId = (typeof GBA0002_CLIENT_MACHINE_IDS)[number];
