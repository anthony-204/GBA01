/**
 * GBA-0002 client v0 — minimal smoke tests.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  calculateGba0002,
  filterClientMachines,
  GBA0002_CLIENT_MACHINE_IDS,
  loadDatabase,
} from "../src/index.js";

const dataDir = resolve(dirname(fileURLToPath(import.meta.url)), "../../../data");
const db = loadDatabase(JSON.parse(readFileSync(resolve(dataDir, "bundle.json"), "utf-8")));

describe("GBA-0002 v0", () => {
  it("loads nine client machines", () => {
    expect(filterClientMachines(db.machines).map((m) => m.id)).toEqual([
      ...GBA0002_CLIENT_MACHINE_IDS,
    ]);
  });

  it("recommends for B45E with valid inputs", () => {
    const result = calculateGba0002(db, {
      modelId: "B45E",
      safetyFactorPercent: 25,
      batteryVoltageDuringCrankingV: 20,
      operatingTempC: 60,
    });
    expect(result.blocked).toBe(false);
    expect(result.overallStatus).toBe("pass");
  });

  it("blocks invalid battery voltage", () => {
    const result = calculateGba0002(db, {
      modelId: "B45E",
      safetyFactorPercent: 25,
      batteryVoltageDuringCrankingV: -1,
      operatingTempC: 60,
    });
    expect(result.blocked).toBe(true);
  });
});
