/**
 * Version 2 tests — completeness, manual entry, PDF outputs, blocked vehicles.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  calculate,
  assessVehicleCompleteness,
  validateManualEntry,
  computeRequiredI2tA2s,
  computeTargetFuseRatingA,
  computeVoltageDropPercent,
  computeCablePeakCapabilityA,
  listVehiclesWithCompleteness,
  loadDatabase,
  type FuseToolDatabase,
  type ManualEntryInput,
} from "../src/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = resolve(__dirname, "../../../data");

function loadDb(): FuseToolDatabase {
  return loadDatabase({
    constants: JSON.parse(readFileSync(resolve(dataDir, "constants.json"), "utf-8")),
    machines: JSON.parse(readFileSync(resolve(dataDir, "machines.json"), "utf-8")),
    fuseLibrary: JSON.parse(readFileSync(resolve(dataDir, "fuse-library.json"), "utf-8")),
    mega32vCurve: JSON.parse(readFileSync(resolve(dataDir, "mega32v-curve.json"), "utf-8")),
    cableCapacity: JSON.parse(readFileSync(resolve(dataDir, "cable-capacity.json"), "utf-8")),
    copperKFactors: JSON.parse(readFileSync(resolve(dataDir, "copper-k-factors.json"), "utf-8")),
  });
}

const validManual: ManualEntryInput = {
  machineLabel: "Test manual",
  safetyFactorPercent: 25,
  crankingTimeRequiredS: 5,
  electricalSystemV: 24,
  voltageDropLimitPercent: 3,
  peakCrankingCurrentA: 200,
  alternatorContinuousA: 80,
  cableType: "Thermosetting 90°C XLPE EDR",
  cableSizeMm2: 70,
  cableContinuousA: 314,
  cableLengthM: 6,
  operatingTempC: 60,
  peakCurrentCutoffA: 500,
};

describe("completeness classification", () => {
  let db: FuseToolDatabase;

  beforeAll(() => {
    db = loadDb();
  });

  it("marks B45E as complete", () => {
    const m = db.machines.find((x) => x.id === "B45E")!;
    const c = assessVehicleCompleteness(m);
    expect(c.isComplete).toBe(true);
    expect(c.canRunFullRecommendation).toBe(true);
  });

  it("marks sparse vehicle as incomplete", () => {
    const m = db.machines.find((x) => x.id === "18T_Padfoot")!;
    const c = assessVehicleCompleteness(m);
    expect(c.isComplete).toBe(false);
    expect(c.missingFieldLabels.length).toBeGreaterThan(0);
  });

  it("lists all vehicles with completeness metadata", () => {
    const list = listVehiclesWithCompleteness(db.machines);
    expect(list.length).toBe(db.machines.length);
    const complete = list.filter((v) => v.completeness.isComplete);
    const incomplete = list.filter((v) => !v.completeness.isComplete);
    expect(complete.length).toBeGreaterThan(0);
    expect(incomplete.length).toBeGreaterThan(0);
  });
});

describe("manual entry validation", () => {
  it("accepts valid manual input", () => {
    const r = validateManualEntry(validManual);
    expect(r.valid).toBe(true);
    expect(r.errors).toHaveLength(0);
  });

  it("rejects missing cable type", () => {
    const r = validateManualEntry({ ...validManual, cableType: "" });
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes("Cable type"))).toBe(true);
  });

  it("rejects negative cranking time", () => {
    const r = validateManualEntry({ ...validManual, crankingTimeRequiredS: -1 });
    expect(r.valid).toBe(false);
  });
});

describe("calculation formulas", () => {
  it("computes I²t required", () => {
    expect(computeRequiredI2tA2s(1000, 5)).toBe(5_000_000);
  });

  it("computes fuse target with safety factor", () => {
    expect(computeTargetFuseRatingA(389, 25)).toBeCloseTo(486.25, 2);
  });

  it("computes voltage drop percent", () => {
    const pct = computeVoltageDropPercent(200, 6, 0.327, 24);
    expect(pct).not.toBeNull();
    expect(pct!).toBeGreaterThan(0);
  });

  it("computes cable peak capability", () => {
    expect(computeCablePeakCapabilityA(143, 70, 5)).toBe(4477);
  });
});

describe("blocked incomplete library vehicles", () => {
  it("blocks 18T_Padfoot from full recommendation", () => {
    const db = loadDb();
    const result = calculate(db, { mode: "library", modelId: "18T_Padfoot" });
    expect(result.blocked).toBe(true);
    expect(result.outputs).toBeNull();
    expect(result.completeness.canRunFullRecommendation).toBe(false);
    expect(result.checks.some((c) => c.id === "data-completeness")).toBe(true);
  });
});

describe("complete library vehicle", () => {
  it("B45E produces PDF outputs and fuse recommendation", () => {
    const db = loadDb();
    const result = calculate(db, { mode: "library", modelId: "B45E" });
    expect(result.blocked).toBe(false);
    expect(result.outputs).not.toBeNull();
    expect(result.outputs!.cableSizeMm2).toBe(70);
    expect(result.outputs!.suggestedFuseSizeA).not.toBeNull();
    expect(result.checks.some((c) => c.id === "fuse-protects-cable")).toBe(true);
    expect(result.checks.some((c) => c.id === "fuse-i2t")).toBe(true);
  });
});

describe("manual entry mode", () => {
  it("runs full calculation with valid inputs", () => {
    const db = loadDb();
    const result = calculate(db, { mode: "manual", inputs: validManual });
    expect(result.blocked).toBe(false);
    expect(result.inputMode).toBe("manual");
    expect(result.outputs).not.toBeNull();
    expect(result.outputs!.cableType).toBe(validManual.cableType);
  });

  it("blocks invalid manual input", () => {
    const db = loadDb();
    const result = calculate(db, {
      mode: "manual",
      inputs: { ...validManual, peakCrankingCurrentA: NaN },
    });
    expect(result.blocked).toBe(true);
    expect(result.validationErrors!.length).toBeGreaterThan(0);
  });
});

describe("fuse protects cable check", () => {
  it("fails when selected fuse rating exceeds cable continuous", () => {
    const db = loadDb();
    const result = calculate(db, {
      mode: "manual",
      inputs: {
        ...validManual,
        alternatorContinuousA: 150,
        cableContinuousA: 199,
        peakCurrentCutoffA: 1000,
      },
    });
    const protects = result.checks.find((c) => c.id === "fuse-protects-cable");
    expect(protects).toBeDefined();
    expect(protects!.status).toBe("fail");
  });
});
