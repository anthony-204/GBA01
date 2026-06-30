import type { FuseToolDatabase, MachineRecord } from "./types.js";

export function listModelIds(db: FuseToolDatabase): string[] {
  return db.machines.map((m) => m.id).sort((a, b) => a.localeCompare(b));
}

export function loadDatabase(bundle: FuseToolDatabase): FuseToolDatabase {
  return bundle;
}

export function findMachineById(
  db: FuseToolDatabase,
  modelId: string,
): MachineRecord | undefined {
  return db.machines.find((m) => m.id === modelId || String(m.model) === modelId);
}
