/**
 * Golden tests — engine output vs known machine scenarios.
 * Validates corrected logic; documents expected behaviour per CALCULATION_SPEC.md.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  recommend,
  listModelIds,
  loadDatabase,
  computeCablePeakCapabilityA,
  computeTargetFuseRatingA,
  IMPLEMENTATION_FIXES,
  type FuseToolDatabase,
} from "../src/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = resolve(__dirname, "../../../data");

function loadJson<T>(name: string): T {
  return JSON.parse(readFileSync(resolve(dataDir, name), "utf-8")) as T;
}

function loadDb(): FuseToolDatabase {
  return loadDatabase({
    constants: loadJson("constants.json"),
    machines: loadJson("machines.json"),
    fuseLibrary: loadJson("fuse-library.json"),
    mega32vCurve: loadJson("mega32v-curve.json"),
    cableCapacity: loadJson("cable-capacity.json"),
    copperKFactors: loadJson("copper-k-factors.json"),
  });
}

describe("parseValue / cable formulas", () => {
  it("computes adiabatic peak with K=143, 70mm2, 5s", () => {
    // 143 * 70 / sqrt(5) ≈ 4477 A
    const cap = computeCablePeakCapabilityA(143, 70, 5);
    expect(cap).toBe(4477);
  });

  it("target fuse rating uses 25% safety factor", () => {
    expect(computeTargetFuseRatingA(80, 25)).toBeCloseTo(100, 5);
    expect(computeTargetFuseRatingA(95, 25)).toBeCloseTo(118.75, 5);
  });
});

describe("implementation fixes documented", () => {
  it("lists Excel/MATLAB corrections", () => {
    expect(IMPLEMENTATION_FIXES.length).toBeGreaterThanOrEqual(5);
    expect(IMPLEMENTATION_FIXES.some((n) => n.includes("G13"))).toBe(true);
  });
});

describe("database", () => {
  let db: FuseToolDatabase;

  beforeAll(() => {
    db = loadDb();
  });

  it("loads machines and fuses", () => {
    expect(db.machines.length).toBeGreaterThan(30);
    expect(db.fuseLibrary.length).toBeGreaterThan(0);
    expect(listModelIds(db)).toContain("B45E");
  });
});

describe("recommend — B45E (Bell truck, tailings dam)", () => {
  let db: FuseToolDatabase;

  beforeAll(() => {
    db = loadDb();
  });

  it("finds machine and passes cranking limit", () => {
    const result = recommend(db, { modelId: "B45E" });
    expect(result.machine?.manufacturer).toBe("Bell");
    expect(result.machine?.peakCrankingCurrentA).toBe(200);
    const cranking = result.checks.find((c) => c.id === "cranking-limit");
    expect(cranking?.status).toBe("pass");
  });

  it("passes cable continuous (80 A alternator vs 314 A cable)", () => {
    const result = recommend(db, { modelId: "B45E" });
    const cont = result.checks.find((c) => c.id === "cable-continuous");
    expect(cont?.status).toBe("pass");
  });

  it("passes cable peak at required cranking time (max(3,5)=5s)", () => {
    const result = recommend(db, { modelId: "B45E" });
    expect(result.derived.cablePeakTimeUsedS).toBe(5);
    const peak = result.checks.find((c) => c.id === "cable-peak");
    expect(peak?.status).toBe("pass");
  });

  it("selects a fuse rating when continuous cable OK", () => {
    const result = recommend(db, { modelId: "B45E" });
    expect(result.fuse.targetRatingA).toBeCloseTo(100, 0);
    expect(result.fuse.selectedRatingA).not.toBeNull();
  });
});

describe("recommend — D10T (Caterpillar)", () => {
  let db: FuseToolDatabase;

  beforeAll(() => {
    db = loadDb();
  });

  it("runs full pipeline without error", () => {
    const result = recommend(db, { modelId: "D10T" });
    expect(result.machine).not.toBeNull();
    expect(result.checks.length).toBeGreaterThan(5);
    expect(result.summary.overallStatus).toBeDefined();
  });

  it("uses alternator 95A for fuse target ~118.75A", () => {
    const result = recommend(db, { modelId: "D10T" });
    expect(result.fuse.targetRatingA).toBeCloseTo(118.75, 1);
  });
});

describe("recommend — unknown model", () => {
  it("returns fail status", () => {
    const db = loadDb();
    const result = recommend(db, { modelId: "NOT_A_REAL_MODEL" });
    expect(result.summary.overallStatus).toBe("fail");
    expect(result.machine).toBeNull();
  });
});

describe("recommend — cranking over limit", () => {
  it("fails when cranking exceeds peak cutoff", () => {
    const db = loadDb();
    const clone = structuredClone(db);
    clone.machines.push({
      id: "TEST_HIGH_CRANK",
      peakCrankingCurrentA: 1500,
      peakCurrentCutoffA: 1000,
      alternatorContinuousA: 80,
      cableContinuousA: 300,
      cableSizeMm2: 70,
      crankingTimeMeasuredS: 3,
      crankingVoltageMeasuredV: 20,
      minBatteryVoltageV: 16.48,
    });
    const result = recommend(clone, { modelId: "TEST_HIGH_CRANK" });
    const cranking = result.checks.find((c) => c.id === "cranking-limit");
    expect(cranking?.status).toBe("fail");
  });
});
