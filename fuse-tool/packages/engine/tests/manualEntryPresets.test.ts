/**
 * Manual entry preset tests — Excel column O verification vs engine.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  calculate,
  loadDatabase,
  EXCEL_MANUAL_PRESET,
  EXCEL_MANUAL_EXPECTED,
  DEFAULT_MANUAL_PRESET,
  getManualEntryPreset,
  computeTargetFuseRatingA,
  computeCablePeakCapabilityA,
  computeVoltageDropPercent,
  type FuseToolDatabase,
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

describe("manual entry presets", () => {
  it("returns copies from getManualEntryPreset", () => {
    const a = getManualEntryPreset("excel");
    const b = getManualEntryPreset("excel");
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
  });

  it("default preset matches B45E-style values", () => {
    expect(DEFAULT_MANUAL_PRESET.peakCrankingCurrentA).toBe(200);
    expect(DEFAULT_MANUAL_PRESET.alternatorContinuousA).toBe(80);
  });
});

describe("Excel manual preset — formula verification", () => {
  it("cable continuous matches Cable_Capacity Q24", () => {
    expect(EXCEL_MANUAL_PRESET.cableContinuousA).toBe(EXCEL_MANUAL_EXPECTED.cableContinuousA);
  });

  it("cable peak capability matches Q26 formula (K×S/√t)", () => {
    const cap = computeCablePeakCapabilityA(143, 120, 5);
    expect(cap).toBe(EXCEL_MANUAL_EXPECTED.cablePeakCapabilityA);
  });

  it("engine fuse target uses alternator × 1.25 (G39), not Excel Q33 cable formula", () => {
    const target = computeTargetFuseRatingA(
      EXCEL_MANUAL_PRESET.alternatorContinuousA,
      EXCEL_MANUAL_PRESET.safetyFactorPercent,
    );
    expect(target).toBe(EXCEL_MANUAL_EXPECTED.engineFuseTargetFromAlternatorA);
    expect(target).not.toBe(EXCEL_MANUAL_EXPECTED.excelFuseTargetFromCableA);
  });

  it("voltage drop at 1000 A matches Excel-style calculation (~5.17%)", () => {
    const pct = computeVoltageDropPercent(
      1000,
      EXCEL_MANUAL_PRESET.cableLengthM,
      EXCEL_MANUAL_EXPECTED.cableResistanceOhmPerKm,
      EXCEL_MANUAL_PRESET.electricalSystemV,
    );
    expect(pct).not.toBeNull();
    expect(pct!).toBeCloseTo(EXCEL_MANUAL_EXPECTED.voltageDropPercentAt1000A, 1);
  });
});

describe("Excel manual preset — full calculation run", () => {
  let db: FuseToolDatabase;

  beforeAll(() => {
    db = loadDb();
  });

  it("runs without block and passes cable checks", () => {
    const result = calculate(db, { mode: "manual", inputs: EXCEL_MANUAL_PRESET });
    expect(result.blocked).toBe(false);
    expect(result.checks.find((c) => c.id === "cable-continuous")?.status).toBe("pass");
    expect(result.checks.find((c) => c.id === "cable-peak")?.status).toBe("pass");
    expect(result.fuse.targetRatingA).toBe(125);
    expect(result.fuse.selectedRatingA).toBe(125);
  });

  it("flags voltage drop warning at 1000 A cranking (Excel Q20 limit 3%)", () => {
    const result = calculate(db, { mode: "manual", inputs: EXCEL_MANUAL_PRESET });
    const vdrop = result.checks.find((c) => c.id === "voltage-drop");
    expect(vdrop?.status).toBe("warning");
  });
});

describe("library B45E vs Excel G-column fuse target", () => {
  it("B45E fuse target ~100 A (1.25 × 80 A alternator)", () => {
    const db = loadDb();
    const result = calculate(db, { mode: "library", modelId: "B45E" });
    expect(result.fuse.targetRatingA).toBeCloseTo(100, 0);
  });
});
