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
 * Client sample fleet for GBA-0002 prototype (v0 / v1 / v2).
 *
 * **Why nine machines?** See fuse-tool/docs/DATA_REPORT.md §4.5 and
 * docs/V0_MACHINE_PARAMETERS.md §“Why these nine machines”.
 *
 * Summary: (1) client confirmed a nine-machine sample scope; (2) these nine
 * are the only rows that pass the V2 completeness gate (including column Q).
 * v0 calculations use column T, so two additional machines (120T, 69T) could
 * be added without code changes beyond this list — they were excluded when the
 * list was frozen, not because 16 V or missing T data.
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
