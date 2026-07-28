// GBA-0002 client constants (PDF spec)

export const GBA0002_MIN_STARTER_VOLTAGE_V = 16;
export const GBA0002_CRANKING_TIME_S = 5;
export const GBA0002_SAFETY_FACTOR_OPTIONS = [25, 50] as const;

// kept for reference; runtime machine list uses filterClientMachines()
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
