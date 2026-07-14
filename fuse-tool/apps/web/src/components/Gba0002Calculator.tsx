"use client";

import { useMemo, useState, type CSSProperties } from "react";
import {
  calculateGba0002,
  filterClientMachines,
  GBA0002_SAFETY_FACTOR_OPTIONS,
  type Gba0002Result,
} from "@fuse-tool/engine";
import { getDatabase } from "@/lib/db";
import { exportGba0002Pdf } from "@/lib/exportGba0002Pdf";

const APP_VERSION = "1.2.0";

const CHANGELOG: { version: string; date: string; items: string[] }[] = [
  {
    version: "1.0",
    date: "June 2026",
    items: [
      "Initial prototype with 9 machines hardcoded. Includes 4 user inputs. Cable and fuse sizing from MachinesOnSite and library tables.",
    ],
  },
  {
    version: "1.1",
    date: "14/07/2026",
    items: [
      'Switched "Peak continuous current during cranking (A)" (column T) to theoretical "Peak current cut off(A) from power and efficiency calculation" (column Q).',
      "Version 1.1 now checks: battery voltage vs 16 V minimum, measured cranking (T) vs limit (Q), measured cranking time (X) vs 5 s.",
      "Database: 16 V cutoff assumed for blank data points and column Q derived from power and efficiency where missing.",
      "Fixed cable upgrade (Condition 2) using Cable_Capacity k-factor on each row.",
      "Results now show the manufacturer and output labels include also units.",
    ],
  },
  {
    version: "1.2",
    date: "14/07/2026",
    items: [
      "Export calculation result as PDF (date/time, inputs, outputs, derived details).",
      "Optional manual entry for column Q (peak current cut-off) to override the database value for sizing.",
    ],
  },
];

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

const buttonStyle: CSSProperties = {
  marginTop: 8,
  padding: "6px 12px",
  color: "#000",
  backgroundColor: "#eee",
  border: "1px solid #999",
  cursor: "pointer",
};

function formatLength(m: number | null | undefined): string {
  if (m == null) return "—";
  return `${m} m`;
}

function formatAmps(a: number | null | undefined): string {
  if (a == null) return "—";
  return `${a} A`;
}

function formatTemp(c: string | number | null | undefined): string {
  if (c == null || c === "—") return "—";
  const s = String(c);
  if (s.includes("°C")) return s;
  if (/^-?\d+(\.\d+)?$/.test(s.trim())) return `${s} °C`;
  return s;
}

export function Gba0002Calculator() {
  const db = useMemo(() => getDatabase(), []);
  const machines = useMemo(() => filterClientMachines(db.machines), [db]);

  const [modelId, setModelId] = useState(machines[0]?.id ?? "D10T");
  const [safetyFactor, setSafetyFactor] = useState<25 | 50>(25);
  const [batteryV, setBatteryV] = useState("20");
  const [operatingTemp, setOperatingTemp] = useState("60");
  const [manualQEnabled, setManualQEnabled] = useState(false);
  const [manualQA, setManualQA] = useState("");
  const [result, setResult] = useState<Gba0002Result | null>(null);
  const [showChangelog, setShowChangelog] = useState(false);
  const [calcError, setCalcError] = useState<string | null>(null);

  const selectedMachine = machines.find((m) => m.id === modelId);
  const databaseQA = selectedMachine?.peakCurrentCutoffA;

  function runCalculate() {
    setCalcError(null);
    const battery = Number(batteryV);
    const temp = Number(operatingTemp);

    let manualPeakCurrentCutoffA: number | null = null;
    if (manualQEnabled) {
      const q = Number(manualQA);
      if (!Number.isFinite(q) || q <= 0) {
        setCalcError("Enter a valid column Q current (A) greater than zero.");
        setResult(null);
        return;
      }
      manualPeakCurrentCutoffA = q;
    }

    setResult(
      calculateGba0002(db, {
        modelId,
        safetyFactorPercent: safetyFactor,
        batteryVoltageDuringCrankingV: battery,
        operatingTempC: temp,
        manualPeakCurrentCutoffA,
      }),
    );
  }

  function onExportPdf() {
    if (!result) return;
    exportGba0002Pdf(result, APP_VERSION);
  }

  return (
    <div style={pageStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h1 style={{ fontSize: 20, color: "#000", margin: 0 }}>GB Auto Fuse &amp; Cable Tool</h1>
        <span style={{ fontSize: 12, color: "#444" }}>v{APP_VERSION}</span>
      </div>
      <button
        type="button"
        onClick={() => setShowChangelog((v) => !v)}
        style={{
          marginTop: 8,
          padding: "4px 8px",
          fontSize: 12,
          border: "1px solid #999",
          background: "#f5f5f5",
          cursor: "pointer",
        }}
      >
        {showChangelog ? "Hide" : "Show"} changelog
      </button>
      {showChangelog && (
        <div style={{ marginTop: 8, padding: 10, border: "1px solid #ccc", fontSize: 13, background: "#fafafa" }}>
          {CHANGELOG.map((entry) => (
            <div key={entry.version} style={{ marginBottom: 10 }}>
              <strong>Version {entry.version}</strong>{" "}
              <span style={{ color: "#555" }}>({entry.date})</span>
              <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
                {entry.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

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
                {m.manufacturer ? `${m.manufacturer} — ` : ""}
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

        <div
          style={{
            marginTop: 12,
            marginBottom: 8,
            padding: 10,
            border: "1px dashed #888",
            background: "#fafafa",
          }}
        >
          <label style={{ display: "flex", gap: 8, alignItems: "flex-start", color: "#000" }}>
            <input
              type="checkbox"
              checked={manualQEnabled}
              onChange={(e) => setManualQEnabled(e.target.checked)}
              style={{ marginTop: 2 }}
            />
            <span>
              Enable manual entry of cranking current (column Q)
              <br />
              <span style={{ fontSize: 12, color: "#555" }}>
                Database Q for this machine:{" "}
                {databaseQA == null ? "—" : `${databaseQA} A`}
              </span>
            </span>
          </label>
          {manualQEnabled && (
            <label style={{ display: "block", marginTop: 8, color: "#000" }}>
              Peak current cut-off Q (A)
              <input
                type="text"
                value={manualQA}
                onChange={(e) => setManualQA(e.target.value)}
                placeholder="e.g. 800"
                style={fieldStyle}
              />
            </label>
          )}
        </div>

        {calcError && (
          <p style={{ margin: "8px 0 0", color: "#a00", fontSize: 13 }}>{calcError}</p>
        )}

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" onClick={runCalculate} style={buttonStyle}>
            Calculate
          </button>
          <button
            type="button"
            onClick={onExportPdf}
            disabled={!result}
            style={{
              ...buttonStyle,
              opacity: result ? 1 : 0.5,
              cursor: result ? "pointer" : "not-allowed",
            }}
          >
            Export PDF
          </button>
        </div>
      </div>

      {result && (
        <>
          <div style={{ border: "1px solid #999", padding: 12, marginTop: 12, backgroundColor: "#fff", color: "#000" }}>
            <p style={{ margin: 0 }}>
              <strong>Status:</strong> {result.statusLabel}
            </p>
            <p style={{ margin: "8px 0 0" }}>
              <strong>Manufacturer:</strong> {result.manufacturer ?? selectedMachine?.manufacturer ?? "—"}
            </p>
            <p style={{ margin: "8px 0 0" }}>
              <strong>Model:</strong> {result.modelId}
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
                <td>Cable current rating</td>
                <td>{formatAmps(result.cable.cableCurrentRatingA)}</td>
              </tr>
              <tr>
                <td>Max one-way cable length</td>
                <td>{formatLength(result.cable.maxAllowableOneWayLengthM)}</td>
              </tr>
              <tr>
                <td>Cable operating temperature</td>
                <td>{formatTemp(result.cable.operatingTempRangeC)}</td>
              </tr>
              <tr>
                <td>Suggested fuse size</td>
                <td>{formatAmps(result.fuse.suggestedFuseSizeA)}</td>
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
                <td>{formatTemp(result.fuse.fuseOperatingTempC)}</td>
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
Manufacturer: ${result.manufacturer ?? "—"}
Model: ${result.modelId}
Design cranking current Q (A): ${result.derived.starterCrankingCurrentA ?? "—"}
Database column Q (A): ${result.derived.databasePeakCurrentCutoffA ?? "—"}
Q overridden manually: ${result.derived.starterCrankingCurrentOverridden ? "yes" : "no"}
Measured cranking current T (A): ${result.derived.measuredStarterCrankingA ?? "—"}
Measured cranking time X (s): ${result.derived.measuredCrankingTimeS ?? "—"}
Alternator continuous current (A): ${result.derived.alternatorContinuousA ?? "—"}
Cable type: ${result.derived.cableTypePresent ?? "—"}
Cable size (mm²): ${result.derived.existingCableSizeMm2 ?? "—"}
K-factor: ${result.derived.kFactor ?? "—"}
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
