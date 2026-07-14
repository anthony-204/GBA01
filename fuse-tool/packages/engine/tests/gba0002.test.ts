/**
 * GBA-0002 client v1.1 — tests.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  calculateGba0002,
  cableThermalWithstandPass,
  computeCablePeakCapabilityA,
  computeCableThermalWithstandTimeS,
  filterClientMachines,
  GBA0002_CRANKING_TIME_S,
  GBA0002_MIN_STARTER_VOLTAGE_V,
  loadDatabase,
} from "../src/index.js";
import {
  MSG_BATTERY_VOLTAGE_LOW,
  MSG_CRANKING_TIME_HIGH,
  MSG_STARTER_CRANKING_HIGH,
} from "../src/gba0002/messages.js";

const dataDir = resolve(dirname(fileURLToPath(import.meta.url)), "../../../data");
const db = loadDatabase(JSON.parse(readFileSync(resolve(dataDir, "bundle.json"), "utf-8")));

const valid = {
  modelId: "B45E",
  safetyFactorPercent: 25 as const,
  batteryVoltageDuringCrankingV: 20,
  operatingTempC: 60,
};

describe("GBA-0002 client v1.1", () => {
  it("loads all machines calculable by v1.1 gates", () => {
    const ids = filterClientMachines(db.machines).map((m) => m.id);
    expect(ids).toContain("120T /EX 1200-7 / EX 2000-7");
    expect(ids).not.toContain("69T / ZX650H");
    expect(ids.length).toBeGreaterThanOrEqual(10);
  });

  it("uses column Q for design cranking current on B45E", () => {
    const result = calculateGba0002(db, valid);
    expect(result.derived.starterCrankingCurrentA).toBe(500);
    expect(result.derived.measuredStarterCrankingA).toBe(200);
  });

  it("includes manufacturer in results", () => {
    const result = calculateGba0002(db, valid);
    expect(result.manufacturer).toBe("Bell");
  });

  it("fails battery below 16 V with v1.1 message", () => {
    const result = calculateGba0002(db, { ...valid, batteryVoltageDuringCrankingV: 15 });
    expect(result.statusLabel).toBe("FAIL");
    expect(result.summary).toBe(MSG_BATTERY_VOLTAGE_LOW);
  });

  it("fails when measured T exceeds design Q (777)", () => {
    const result = calculateGba0002(db, { ...valid, modelId: "777 (07)" });
    expect(result.statusLabel).toBe("FAIL");
    expect(result.summary).toBe(MSG_STARTER_CRANKING_HIGH);
  });

  it("fails when measured cranking time exceeds 5 s", () => {
    const machines = db.machines.map((m) =>
      m.id === "B45E" ? { ...m, crankingTimeMeasuredS: 6 } : m,
    );
    const localDb = { ...db, machines };
    const result = calculateGba0002(localDb, valid);
    expect(result.statusLabel).toBe("FAIL");
    expect(result.summary).toBe(MSG_CRANKING_TIME_HIGH);
  });

  it("calculates max voltage drop from battery minus 16 V", () => {
    const result = calculateGba0002(db, valid);
    expect(result.derived.maxAllowableVoltageDropV).toBe(
      valid.batteryVoltageDuringCrankingV - GBA0002_MIN_STARTER_VOLTAGE_V,
    );
  });

  it("thermal check uses Q current", () => {
    const t = computeCableThermalWithstandTimeS(143, 70, 500);
    expect(t).toBeGreaterThanOrEqual(GBA0002_CRANKING_TIME_S);
    expect(cableThermalWithstandPass(143, 70, 500, GBA0002_CRANKING_TIME_S)).toBe(true);
    expect(500).toBeLessThanOrEqual(computeCablePeakCapabilityA(143, 70, GBA0002_CRANKING_TIME_S));
  });

  it("uses manual column Q override when provided", () => {
    const result = calculateGba0002(db, {
      ...valid,
      manualPeakCurrentCutoffA: 750,
    });
    expect(result.derived.starterCrankingCurrentA).toBe(750);
    expect(result.derived.databasePeakCurrentCutoffA).toBe(500);
    expect(result.derived.starterCrankingCurrentOverridden).toBe(true);
  });
});
