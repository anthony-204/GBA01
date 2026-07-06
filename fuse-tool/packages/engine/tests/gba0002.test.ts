/**
 * GBA-0002 client deliverable — calculation verification tests.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  calculateGba0002,
  cableThermalWithstandPass,
  computeCablePeakCapabilityA,
  computeCableThermalWithstandTimeS,
  computeMaxAllowableOneWayLengthM,
  filterClientMachines,
  GBA0002_CLIENT_MACHINE_IDS,
  GBA0002_MIN_STARTER_VOLTAGE_V,
  GBA0002_CRANKING_TIME_S,
  loadDatabase,
  type FuseToolDatabase,
} from "../src/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = resolve(__dirname, "../../../data");

function loadDb(): FuseToolDatabase {
  return loadDatabase(JSON.parse(readFileSync(resolve(dataDir, "bundle.json"), "utf-8")));
}

describe("GBA-0002 client fleet", () => {
  it("includes exactly 9 client machines", () => {
    const db = loadDb();
    const client = filterClientMachines(db.machines);
    expect(client.length).toBe(9);
    expect(client.map((m) => m.id)).toEqual([...GBA0002_CLIENT_MACHINE_IDS]);
  });
});

describe("GBA-0002 formulas", () => {
  it("computes thermal withstand (k×S/I)²", () => {
    // B45E: k≈143, 70mm², 200A → (50.05)² ≈ 2505 s
    const t = computeCableThermalWithstandTimeS(143, 70, 200);
    expect(t).toBeGreaterThan(GBA0002_CRANKING_TIME_S);
  });

  it("computes max one-way cable length from voltage drop (V)", () => {
    // ΔV=4V, I=200A, R=0.327 Ω/km → (4*1000)/(200*2*0.327) ≈ 30.58 m
    const len = computeMaxAllowableOneWayLengthM(4, 200, 0.327);
    expect(len).not.toBeNull();
    expect(len!).toBeCloseTo(30.58, 1);
  });

  it("thermal peak capability matches (k×S/I)² check", () => {
    const t = computeCableThermalWithstandTimeS(143, 70, 200);
    const peak = computeCablePeakCapabilityA(143, 70, GBA0002_CRANKING_TIME_S);
    expect(t).toBeGreaterThanOrEqual(GBA0002_CRANKING_TIME_S);
    expect(200).toBeLessThanOrEqual(peak);
    expect(cableThermalWithstandPass(143, 70, 200, GBA0002_CRANKING_TIME_S)).toBe(true);
  });

  it("max voltage drop = battery V − 16 V", () => {
    expect(20 - GBA0002_MIN_STARTER_VOLTAGE_V).toBe(4);
  });
});

describe("GBA-0002 B45E — client calculation flow", () => {
  let db: FuseToolDatabase;

  beforeAll(() => {
    db = loadDb();
  });

  it("passes thermal withstand and recommends no cable change", () => {
    const result = calculateGba0002(db, {
      modelId: "B45E",
      safetyFactorPercent: 25,
      batteryVoltageDuringCrankingV: 20,
      operatingTempC: 60,
    });
    expect(result.blocked).toBe(false);
    expect(result.cable.recommendationStatus).toBe("no-change");
    expect(result.cable.thermalWithstandPass).toBe(true);
    expect(result.cable.cableSizeMm2).toBe(70);
    expect(result.derived.maxAllowableVoltageDropV).toBe(4);
  });

  it("selects fuse within cable ≥ fuse ≥ alternator", () => {
    const result = calculateGba0002(db, {
      modelId: "B45E",
      safetyFactorPercent: 25,
      batteryVoltageDuringCrankingV: 20,
      operatingTempC: 60,
    });
    expect(result.fuse.fusePass).toBe(true);
    expect(result.fuse.suggestedFuseSizeA).not.toBeNull();
    expect(result.fuse.suggestedFuseSizeA!).toBeGreaterThanOrEqual(80);
    expect(result.fuse.suggestedFuseSizeA!).toBeLessThanOrEqual(314);
  });

  it("produces PDF line items 5–22", () => {
    const result = calculateGba0002(db, {
      modelId: "B45E",
      safetyFactorPercent: 25,
      batteryVoltageDuringCrankingV: 20,
      operatingTempC: 60,
    });
    expect(result.lineItems.length).toBeGreaterThanOrEqual(15);
    expect(result.lineItems.some((l) => l.line === 15)).toBe(true);
    expect(result.lineItems.some((l) => l.line === 20)).toBe(true);
  });
});

describe("GBA-0002 D10T — sample list machine #1", () => {
  it("runs full pipeline", () => {
    const db = loadDb();
    const result = calculateGba0002(db, {
      modelId: "D10T",
      safetyFactorPercent: 50,
      batteryVoltageDuringCrankingV: 20,
      operatingTempC: 60,
    });
    expect(result.blocked).toBe(false);
    expect(result.machineFound).toBe(true);
    expect(result.derived.starterCrankingCurrentA).toBe(500);
  });
});

describe("GBA-0002 validation", () => {
  it("blocks unknown machine", () => {
    const db = loadDb();
    const result = calculateGba0002(db, {
      modelId: "NOT_IN_CLIENT_LIST",
      safetyFactorPercent: 25,
      batteryVoltageDuringCrankingV: 20,
      operatingTempC: 60,
    });
    expect(result.blocked).toBe(true);
  });

  it("fails when battery voltage at or below 16 V", () => {
    const db = loadDb();
    const result = calculateGba0002(db, {
      modelId: "B45E",
      safetyFactorPercent: 25,
      batteryVoltageDuringCrankingV: 16,
      operatingTempC: 60,
    });
    expect(result.derived.maxAllowableVoltageDropV).toBe(0);
    expect(result.lineItems.find((l) => l.line === 6)?.status).toBe("fail");
  });
});
