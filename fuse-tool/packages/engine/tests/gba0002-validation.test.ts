/**
 * GBA-0002 client v2 — validation guardrail tests.
 * Maps to "Verification and Justification of Input Validation Guardrails" test matrix.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  calculateGba0002,
  validateGba0002Inputs,
  validateGba0002Outputs,
  parseComponentMaxTempC,
  loadDatabase,
  type FuseToolDatabase,
} from "../src/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = resolve(__dirname, "../../../data");

function loadDb(): FuseToolDatabase {
  return loadDatabase(JSON.parse(readFileSync(resolve(dataDir, "bundle.json"), "utf-8")));
}

function baseInputs(overrides: Record<string, unknown> = {}) {
  return {
    modelId: "B45E",
    safetyFactorPercent: 25,
    batteryVoltageDuringCrankingV: 20,
    operatingTempC: 60,
    crankingTimeS: 5,
    inputMode: "simple" as const,
    ...overrides,
  };
}

describe("GBA-0002 v2 validation — hard blocks (VIN rules)", () => {
  let db: FuseToolDatabase;
  let machine: FuseToolDatabase["machines"][0];

  beforeAll(() => {
    db = loadDb();
    machine = db.machines.find((m) => m.id === "B45E")!;
  });

  it("VIN-001: blocks negative cranking voltage", () => {
    const result = calculateGba0002(db, baseInputs({ batteryVoltageDuringCrankingV: -1 }));
    expect(result.blocked).toBe(true);
    expect(result.validation.errors.some((e) => e.includes("positive"))).toBe(true);
    expect(result.overallStatus).toBe("fail");
  });

  it("VIN-002: blocks over-class cranking voltage (40 V on 24 V system)", () => {
    const result = calculateGba0002(db, baseInputs({ batteryVoltageDuringCrankingV: 40 }));
    expect(result.blocked).toBe(true);
    expect(result.validation.errors.some((e) => e.includes("plausibility ceiling"))).toBe(true);
  });

  it("VIN-003: blocks zero cranking time", () => {
    const result = calculateGba0002(db, baseInputs({ crankingTimeS: 0 }));
    expect(result.blocked).toBe(true);
    expect(result.validation.errors.some((e) => e.includes("positive duration"))).toBe(true);
  });

  it("VIN-004: blocks excessive cranking time (>30 s)", () => {
    const result = calculateGba0002(db, baseInputs({ crankingTimeS: 35 }));
    expect(result.blocked).toBe(true);
    expect(result.validation.errors.some((e) => e.includes("30 s"))).toBe(true);
  });

  it("VIN-005: blocks unsupported temperature (>125 °C)", () => {
    const result = calculateGba0002(db, baseInputs({ operatingTempC: 130 }));
    expect(result.blocked).toBe(true);
    expect(result.validation.errors.some((e) => e.includes("125"))).toBe(true);
  });

  it("VIN-006: Simple Mode blocks arbitrary safety factor", () => {
    const v = validateGba0002Inputs(
      baseInputs({ safetyFactorPercent: 37, inputMode: "simple" }),
      machine,
    );
    expect(v.errors.some((e) => e.includes("Simple Mode"))).toBe(true);
    const result = calculateGba0002(
      db,
      baseInputs({ safetyFactorPercent: 37, inputMode: "simple" }),
    );
    expect(result.blocked).toBe(true);
  });
});

describe("GBA-0002 v2 validation — review / warning", () => {
  let db: FuseToolDatabase;

  beforeAll(() => {
    db = loadDb();
  });

  it("VIN-007: long but possible cranking (12 s) requires review", () => {
    const result = calculateGba0002(db, baseInputs({ crankingTimeS: 12 }));
    expect(result.blocked).toBe(false);
    expect(result.validation.warnings.some((w) => w.includes("above normal"))).toBe(true);
    expect(result.overallStatus).toBe("warning");
  });

  it("VIN-008: Advanced Mode high factor (55%) requires review", () => {
    const result = calculateGba0002(
      db,
      baseInputs({ safetyFactorPercent: 55, inputMode: "advanced" }),
    );
    expect(result.blocked).toBe(false);
    expect(result.validation.warnings.some((w) => w.includes("engineering approval"))).toBe(
      true,
    );
    expect(result.overallStatus).toBe("warning");
  });
});

describe("GBA-0002 v2 validation — output sanity", () => {
  it("VIN-009: blocks implausible derived cable length (>100 m)", () => {
    const out = validateGba0002Outputs(250, 60, 90, null, []);
    expect(out.errors.some((e) => e.includes("implausible"))).toBe(true);
  });

  it("VIN-010: blocks when operating temp exceeds cable rating", () => {
    const out = validateGba0002Outputs(5, 110, 90, null, []);
    expect(out.errors.some((e) => e.includes("cable temperature"))).toBe(true);
  });

  it("parses fuse temperature range upper bound", () => {
    expect(parseComponentMaxTempC("-40°C to +125°C")).toBe(125);
  });
});

describe("GBA-0002 v2 — regression pass case", () => {
  it("B45E valid inputs still pass with no warnings", () => {
    const db = loadDb();
    const result = calculateGba0002(db, baseInputs());
    expect(result.blocked).toBe(false);
    expect(result.validation.errors).toHaveLength(0);
    expect(result.overallStatus).toBe("pass");
    expect(result.cable.recommendationStatus).toBe("no-change");
  });
});
