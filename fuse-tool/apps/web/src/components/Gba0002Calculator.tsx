"use client";

import { useMemo, useState, type CSSProperties } from "react";
import {
  calculateGba0002,
  filterClientMachines,
  GBA0002_SAFETY_FACTOR_OPTIONS,
  type Gba0002Result,
} from "@fuse-tool/engine";
import { getDatabase } from "@/lib/db";

const APP_VERSION = "1.1.2";

const CHANGELOG: { version: string; date: string; items: string[] }[] = [
  {
    version: "1.1.2",
    date: "15/07/2026",
    items: [
      "When the starter peak-current value is missing, users can enter either approved starter power at cut-off voltage or an approved peak current cut-off.",
    ],
  },
  {
    version: "1.1.1",
    date: "15/07/2026",
    items: [
      "Added an approved starter peak-current limit input when the stored limit is missing or invalid. Calculated results are not used as machine input data.",
    ],
  },
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
      'Switched from measured peak continuous cranking current to the theoretical peak current cut-off calculated from power and efficiency.',
      "Version 1.1 now checks: battery voltage vs 16 V minimum, measured cranking (T) vs limit (Q), measured cranking time (X) vs 5 s.",
      "Database: 16 V cut-off assumed for blank data points and peak current derived from power and efficiency where possible.",
      "Fixed cable upgrade (Condition 2) using Cable_Capacity k-factor on each row.",
      "Results now show the manufacturer and output labels include also units.",
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
  const [starterPeakCurrentLimit, setStarterPeakCurrentLimit] = useState("");
  const [starterPowerAtCutoff, setStarterPowerAtCutoff] = useState("");
  const [peakLimitInputMethod, setPeakLimitInputMethod] = useState<"power" | "current">("power");
  const [showPeakLimitInput, setShowPeakLimitInput] = useState(false);
  const [result, setResult] = useState<Gba0002Result | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);
  const [showChangelog, setShowChangelog] = useState(false);

  const selectedMachine = machines.find((m) => m.id === modelId);
  const storedPeakLimit = Number(selectedMachine?.peakCurrentCutoffA);
  const needsPeakLimit = !Number.isFinite(storedPeakLimit) || storedPeakLimit <= 0;

  function runCalculate() {
    setInputError(null);
    const battery = Number(batteryV);
    const temp = Number(operatingTemp);
    const enteredPeakLimit = Number(starterPeakCurrentLimit);
    const enteredPower = Number(starterPowerAtCutoff);
    if (
      needsPeakLimit &&
      showPeakLimitInput &&
      peakLimitInputMethod === "current" &&
      (!Number.isFinite(enteredPeakLimit) || enteredPeakLimit <= 0)
    ) {
      setInputError("Enter an approved starter peak current limit greater than 0 A.");
      return;
    }
    if (
      needsPeakLimit &&
      showPeakLimitInput &&
      peakLimitInputMethod === "power" &&
      (!Number.isFinite(enteredPower) || enteredPower <= 0)
    ) {
      setInputError("Enter approved starter power at cut-off voltage greater than 0 kW.");
      return;
    }
    const nextResult = calculateGba0002(db, {
      modelId,
      safetyFactorPercent: safetyFactor,
      batteryVoltageDuringCrankingV: battery,
      operatingTempC: temp,
      starterPeakCurrentLimitA:
        needsPeakLimit && showPeakLimitInput && peakLimitInputMethod === "current"
          ? enteredPeakLimit
          : undefined,
      starterPowerAtCutoffKw:
        needsPeakLimit && showPeakLimitInput && peakLimitInputMethod === "power"
          ? enteredPower
          : undefined,
    });
    setResult(nextResult);
    if (needsPeakLimit && nextResult.blocked) setShowPeakLimitInput(true);
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
              <strong>
                Version {entry.version}
              </strong>{" "}
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
          <select
            value={modelId}
            onChange={(e) => {
              setModelId(e.target.value);
              setStarterPeakCurrentLimit("");
              setStarterPowerAtCutoff("");
              setPeakLimitInputMethod("power");
              setShowPeakLimitInput(false);
              setInputError(null);
              setResult(null);
            }}
            style={fieldStyle}
          >
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

        {needsPeakLimit && showPeakLimitInput && (
          <div style={{ marginBottom: 8, padding: 10, border: "1px solid #b7791f", background: "#fffaf0" }}>
            <p style={{ margin: "0 0 8px", fontWeight: "bold", color: "#000" }}>
              Complete the missing starter data
            </p>
            <label style={{ display: "block", marginBottom: 6, color: "#000" }}>
              <input
                type="radio"
                name="peak-limit-method"
                checked={peakLimitInputMethod === "power"}
                onChange={() => {
                  setPeakLimitInputMethod("power");
                  setInputError(null);
                }}
              />{" "}
              Enter power at cut-off voltage (kW) — recommended
            </label>
            <label style={{ display: "block", marginBottom: 8, color: "#000" }}>
              <input
                type="radio"
                name="peak-limit-method"
                checked={peakLimitInputMethod === "current"}
                onChange={() => {
                  setPeakLimitInputMethod("current");
                  setInputError(null);
                }}
              />{" "}
              Enter peak current cut-off (A)
            </label>
            {peakLimitInputMethod === "power" ? (
              <label style={{ display: "block", color: "#000" }}>
                Power at cut-off voltage (kW)
                <input
                  type="text"
                  inputMode="decimal"
                  value={starterPowerAtCutoff}
                  onChange={(e) => setStarterPowerAtCutoff(e.target.value)}
                  placeholder="e.g. 4.5"
                  style={fieldStyle}
                />
              </label>
            ) : (
              <label style={{ display: "block", color: "#000" }}>
                Peak current cut-off (A)
                <input
                  type="text"
                  inputMode="decimal"
                  value={starterPeakCurrentLimit}
                  onChange={(e) => setStarterPeakCurrentLimit(e.target.value)}
                  placeholder="e.g. 500"
                  style={fieldStyle}
                />
              </label>
            )}
            <p style={{ margin: "6px 0 0", fontSize: 12, color: "#744210" }}>
              The starter peak-current data is missing or invalid. Use approved manufacturer, machine, or site data only.
            </p>
          </div>
        )}

        {inputError && <p style={{ margin: "0 0 8px", color: "#a00", fontSize: 13 }}>{inputError}</p>}

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
