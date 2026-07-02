"use client";

import { useMemo, useState } from "react";
import {
  calculateGba0002,
  filterClientMachines,
  GBA0002_SAFETY_FACTOR_OPTIONS,
} from "@fuse-tool/engine";
import { getDatabase } from "@/lib/db";
import { NumericInput } from "@/components/NumericInput";

export function Gba0002Calculator() {
  const db = useMemo(() => getDatabase(), []);
  const machines = useMemo(() => filterClientMachines(db.machines), [db]);

  const [modelId, setModelId] = useState(machines[0]?.id ?? "D10T");
  const [safetyFactor, setSafetyFactor] = useState<25 | 50>(25);
  const [batteryV, setBatteryV] = useState<number | undefined>(20);
  const [operatingTemp, setOperatingTemp] = useState<number | undefined>(60);

  const result = useMemo(() => {
    if (batteryV === undefined || operatingTemp === undefined) return null;
    return calculateGba0002(db, {
      modelId,
      safetyFactorPercent: safetyFactor,
      batteryVoltageDuringCrankingV: batteryV,
      operatingTempC: operatingTemp,
    });
  }, [db, modelId, safetyFactor, batteryV, operatingTemp]);

  return (
    <div className="mx-auto max-w-md space-y-4 px-4 py-8">
      <h1 className="text-xl font-bold">GB Auto Fuse &amp; Cable (v0)</h1>

      <select
        value={modelId}
        onChange={(e) => setModelId(e.target.value)}
        className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
      >
        {machines.map((m) => (
          <option key={m.id} value={m.id}>
            {m.id}
          </option>
        ))}
      </select>

      <select
        value={safetyFactor}
        onChange={(e) => setSafetyFactor(Number(e.target.value) as 25 | 50)}
        className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
      >
        {GBA0002_SAFETY_FACTOR_OPTIONS.map((s) => (
          <option key={s} value={s}>
            Safety factor {s}%
          </option>
        ))}
      </select>

      <NumericInput label="Battery V during cranking" value={batteryV} onChange={setBatteryV} />
      <NumericInput label="Operating temp (°C)" value={operatingTemp} onChange={setOperatingTemp} />

      {result && (
        <div className="rounded border border-slate-700 p-4 text-sm">
          <p className="font-semibold uppercase">{result.overallStatus}</p>
          <p className="mt-1">{result.summary}</p>
          {!result.blocked && (
            <ul className="mt-3 space-y-1 text-slate-300">
              <li>
                Cable: {result.cable.cableType ?? "—"} {result.cable.cableSizeMm2 ?? ""} mm²
              </li>
              <li>Max length (m): {result.cable.maxAllowableOneWayLengthM ?? "—"}</li>
              <li>Fuse (A): {result.fuse.suggestedFuseSizeA ?? "—"}</li>
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
