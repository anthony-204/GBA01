/**
 * GBA-0002 prototype — tests per functionality spec.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  calculateGba0002,
  filterClientMachines,
  GBA0002_CLIENT_MACHINE_IDS,
  GBA0002_MIN_STARTER_VOLTAGE_V,
  loadDatabase,
} from "../src/index.js";

const dataDir = resolve(dirname(fileURLToPath(import.meta.url)), "../../../data");
const db = loadDatabase(JSON.parse(readFileSync(resolve(dataDir, "bundle.json"), "utf-8")));

const valid = {
  modelId: "B45E",
  safetyFactorPercent: 25 as const,
  batteryVoltageDuringCrankingV: 20,
  operatingTempC: 60,
};

describe("GBA-0002 prototype", () => {
  it("loads nine sample machines", () => {
    expect(filterClientMachines(db.machines).map((m) => m.id)).toEqual([
      ...GBA0002_CLIENT_MACHINE_IDS,
    ]);
  });

  it("Test 1: valid machine passes", () => {
    const result = calculateGba0002(db, valid);
    expect(result.statusLabel).toBe("PASS");
    expect(result.fuse.suggestedFuseSizeA).not.toBeNull();
    expect(result.cable.recommendationStatus).toMatch(/no-change|upgraded/);
  });

  it("Test 2: battery voltage too low fails", () => {
    const result = calculateGba0002(db, { ...valid, batteryVoltageDuringCrankingV: 15 });
    expect(result.statusLabel).toBe("FAIL");
    expect(result.derived.maxAllowableVoltageDropV).toBeLessThanOrEqual(0);
    expect(result.summary).toContain("minimum starter voltage");
  });

  it("blocks negative battery voltage", () => {
    const result = calculateGba0002(db, { ...valid, batteryVoltageDuringCrankingV: -1 });
    expect(result.statusLabel).toBe("FAIL");
  });

  it("calculates max voltage drop from battery minus 16 V", () => {
    const result = calculateGba0002(db, valid);
    expect(result.derived.maxAllowableVoltageDropV).toBe(
      valid.batteryVoltageDuringCrankingV - GBA0002_MIN_STARTER_VOLTAGE_V,
    );
  });
});
