/**
 * GBA-0002 client deliverable — constants (revised PDF spec).
 */

/** Minimum starter motor voltage (V) — PDF line item 5. */
export const GBA0002_MIN_STARTER_VOLTAGE_V = 16;

/** Required cranking time (s) — PDF line item 11. */
export const GBA0002_CRANKING_TIME_S = 5;

/** Allowed safety factor options — PDF user input 1. */
export const GBA0002_SAFETY_FACTOR_OPTIONS = [25, 50] as const;

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
