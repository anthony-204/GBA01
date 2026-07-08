/**
 * GBA-0002 client v1 — constants (PDF spec + v1.1 clarifications).
 *
 * Sizing current: MachinesOnSite column Q (peakCurrentCutoffA).
 * Measured cranking check: column T vs Q; cranking time: column X vs 5 s.
 */

/** Minimum starter motor voltage (V) — PDF line item 5. */
export const GBA0002_MIN_STARTER_VOLTAGE_V = 16;

/** Required cranking time (s) — PDF line item 11. */
export const GBA0002_CRANKING_TIME_S = 5;

/** Allowed safety factor options — PDF user input 1. */
export const GBA0002_SAFETY_FACTOR_OPTIONS = [25, 50] as const;

/**
 * Legacy nine-machine sample list (v0 era).
 *
 * Kept for compatibility/document history only.
 * v1.1 no longer uses this allow-list at runtime; machine visibility is now
 * driven by calculation eligibility in `filterClientMachines()`.
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
