"use client";

import { useMemo, useState, type CSSProperties } from "react";
import {
  calculateGba0002,
  filterClientMachines,
  GBA0002_CRANKING_TIME_S,
  GBA0002_MIN_STARTER_VOLTAGE_V,
  GBA0002_SAFETY_FACTOR_OPTIONS,
  type Gba0002Result,
} from "@fuse-tool/engine";
import { getDatabase } from "@/lib/db";

const fieldStyle: CSSProperties = {
  display: "block",
  width: "100%",
  marginTop: 4,
  padding: "6px 8px",
  color: "#000",
  backgroundColor: "#fff",
  border: "1px solid #999",
};

const pageStyle: CSSProperties = {
  fontFamily: "Arial, sans-serif",
  maxWidth: 640,
  margin: "16px auto",
  padding: 12,
  color: "#000",
  backgroundColor: "#fff",
  minHeight: "100vh",
};

export function Gba0002Calculator() {
  const db = useMemo(() => getDatabase(), []);
  const machines = useMemo(() => filterClientMachines(db.machines), [db]);

  const [modelId, setModelId] = useState(machines[0]?.id ?? "D10T");
  const [safetyFactor, setSafetyFactor] = useState<25 | 50>(25);
  const [batteryV, setBatteryV] = useState("20");
  const [operatingTemp, setOperatingTemp] = useState("60");
  const [result, setResult] = useState<Gba0002Result | null>(null);

  function runCalculate() {
    const battery = Number(batteryV);
    const temp = Number(operatingTemp);
    setResult(
      calculateGba0002(db, {
        modelId,
        safetyFactorPercent: safetyFactor,
        batteryVoltageDuringCrankingV: battery,
        operatingTempC: temp,
      }),
    );
  }

  return (
    <div style={pageStyle}>
      <h1 style={{ fontSize: 20, color: "#000" }}>GB Auto Fuse &amp; Cable Prototype</h1>
      <p style={{ fontSize: 13, color: "#000" }}>
        Fixed assumptions: minimum starter voltage = {GBA0002_MIN_STARTER_VOLTAGE_V} V, cranking time ={" "}
        {GBA0002_CRANKING_TIME_S} s. Max voltage drop = battery V during cranking − 16 V (see docs).
      </p>

      <div style={{ border: "1px solid #999", padding: 12, marginTop: 12, backgroundColor: "#fff" }}>
        <p style={{ margin: "0 0 8px", fontWeight: "bold", color: "#000" }}>User inputs</p>

        <label style={{ display: "block", marginBottom: 8, color: "#000" }}>
          Safety factor (%)
          <select
            value={safetyFactor}
            onChange={(e) => setSafetyFactor(Number(e.target.value) as 25 | 50)}
            style={fieldStyle}
          >
            {GBA0002_SAFETY_FACTOR_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}%
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "block", marginBottom: 8, color: "#000" }}>
          Machine make and model
          <select value={modelId} onChange={(e) => setModelId(e.target.value)} style={fieldStyle}>
            {machines.map((m) => (
              <option key={m.id} value={m.id}>
                {m.id}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "block", marginBottom: 8, color: "#000" }}>
          Battery voltage during cranking (V)
          <input type="text" value={batteryV} onChange={(e) => setBatteryV(e.target.value)} style={fieldStyle} />
        </label>

        <label style={{ display: "block", marginBottom: 8, color: "#000" }}>
          Operating temperature (°C)
          <input
            type="text"
            value={operatingTemp}
            onChange={(e) => setOperatingTemp(e.target.value)}
            style={fieldStyle}
          />
        </label>

        <button
          type="button"
          onClick={runCalculate}
          style={{ marginTop: 8, padding: "6px 12px", color: "#000", backgroundColor: "#eee", border: "1px solid #999" }}
        >
          Calculate
        </button>
      </div>

      {result && (
        <>
          <div style={{ border: "1px solid #999", padding: 12, marginTop: 12, backgroundColor: "#fff", color: "#000" }}>
            <p style={{ margin: 0 }}>
              <strong>Status:</strong> {result.statusLabel}
            </p>
            <p style={{ margin: "8px 0 0" }}>{result.summary}</p>
          </div>

          <table
            border={1}
            cellPadding={6}
            style={{
              width: "100%",
              marginTop: 12,
              borderCollapse: "collapse",
              fontSize: 14,
              color: "#000",
              backgroundColor: "#fff",
            }}
          >
            <tbody>
              <tr>
                <td>Cable type and size</td>
                <td>{result.cable.message}</td>
              </tr>
              <tr>
                <td>Cable current rating (A)</td>
                <td>{result.cable.cableCurrentRatingA ?? "—"}</td>
              </tr>
              <tr>
                <td>Max one-way cable length (m)</td>
                <td>{result.cable.maxAllowableOneWayLengthM ?? "—"}</td>
              </tr>
              <tr>
                <td>Cable operating temperature</td>
                <td>{result.cable.operatingTempRangeC ?? "—"}</td>
              </tr>
              <tr>
                <td>Suggested fuse size (A)</td>
                <td>{result.fuse.suggestedFuseSizeA ?? "—"}</td>
              </tr>
              <tr>
                <td>Fuse make and part number</td>
                <td>
                  {[result.fuse.fuseMakeModel, result.fuse.fusePartNumber].filter(Boolean).join(" · ") ||
                    "—"}
                </td>
              </tr>
              <tr>
                <td>Fuse operating temperature</td>
                <td>{result.fuse.fuseOperatingTempC ?? "—"}</td>
              </tr>
            </tbody>
          </table>

          <pre
            style={{
              marginTop: 12,
              padding: 12,
              background: "#f5f5f5",
              border: "1px solid #999",
              fontSize: 12,
              overflow: "auto",
              color: "#000",
            }}
          >
            {`Debug / details
Machine: ${result.modelId}
Cable type: ${result.derived.cableTypePresent ?? "—"}
Cable size (mm²): ${result.derived.existingCableSizeMm2 ?? "—"}
Starter cranking current (A): ${result.derived.starterCrankingCurrentA ?? "—"}
Alternator continuous current (A): ${result.derived.alternatorContinuousA ?? "—"}
K-factor (by cable type): ${result.derived.kFactor ?? "—"}
Cable resistance (Ω/km): ${result.derived.cableResistanceOhmPerKm ?? "—"}
Max allowable voltage drop (V): ${result.derived.maxAllowableVoltageDropV}
Thermal withstand time (s): ${result.cable.cableThermalWithstandTimeS ?? "—"}
Required fuse current (A): ${result.derived.requiredFuseCurrentA ?? "—"}`}
          </pre>
        </>
      )}
    </div>
  );
}
