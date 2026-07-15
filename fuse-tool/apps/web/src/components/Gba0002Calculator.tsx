"use client";

import { useMemo, useRef, useState, type CSSProperties } from "react";
import {
  calculateGba0002,
  filterClientMachines,
  GBA0002_MIN_STARTER_VOLTAGE_V,
  GBA0002_SAFETY_FACTOR_OPTIONS,
  type Gba0002Result,
} from "@fuse-tool/engine";
import { getDatabase } from "@/lib/db";
import { exportGba0002Pdf } from "@/lib/exportGba0002Pdf";
import { ExplanationDropdown } from "@/components/ExplanationDropdown";
import {
  StatusBadge,
  StatusPanel,
  statusToneFromLabel,
  type UiStatusTone,
} from "@/components/StatusBadge";

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
      "Optional manual entry for column Q (peak current cut-off) after a non-PASS result, to override the database value for sizing.",
      "Field-use UI: traffic-light status, result cards, expandable explanations.",
      "PDF label/value layout uses a fixed column so text no longer overlaps.",
    ],
  },
];

const pageStyle: CSSProperties = {
  fontFamily: "Arial, Helvetica, sans-serif",
  maxWidth: 720,
  margin: "0 auto",
  padding: "12px 14px 32px",
  color: "#111",
  backgroundColor: "#fff",
  minHeight: "100vh",
};

const cardStyle: CSSProperties = {
  border: "1px solid #bbb",
  borderRadius: 4,
  padding: 14,
  marginTop: 14,
  backgroundColor: "#fff",
};

const fieldStyle: CSSProperties = {
  display: "block",
  width: "100%",
  boxSizing: "border-box",
  marginTop: 6,
  padding: "10px 12px",
  fontSize: 16,
  color: "#000",
  backgroundColor: "#fff",
  border: "1px solid #999",
  borderRadius: 4,
};

const fieldErrorStyle: CSSProperties = {
  ...fieldStyle,
  border: "2px solid #c62828",
  backgroundColor: "#fff5f5",
};

const buttonPrimary: CSSProperties = {
  marginTop: 12,
  width: "100%",
  padding: "14px 16px",
  fontSize: 17,
  fontWeight: 700,
  color: "#111",
  backgroundColor: "#e0e0e0",
  border: "2px solid #555",
  borderRadius: 4,
  cursor: "pointer",
};

const buttonSecondary: CSSProperties = {
  marginTop: 8,
  padding: "10px 14px",
  fontSize: 15,
  color: "#111",
  backgroundColor: "#f5f5f5",
  border: "1px solid #888",
  borderRadius: 4,
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

function overallHeadline(status: string): string {
  switch (status) {
    case "PASS":
      return "PASS — Existing cable and selected fuse satisfy the required checks.";
    case "FAIL":
      return "FAIL — Do not proceed without engineering review.";
    case "DATA MISSING":
      return "MISSING DATA — A recommendation cannot be made until required values are provided.";
    case "ENGINEERING REVIEW REQUIRED":
      return "ENGINEERING REVIEW — The result requires review before use.";
    default:
      return status;
  }
}

function cableStatusTone(result: Gba0002Result): UiStatusTone {
  if (result.statusLabel === "FAIL" && result.cable.recommendationStatus === "unsuitable") {
    return "fail";
  }
  if (result.cable.recommendationStatus === "unsuitable") return "fail";
  if (result.statusLabel === "DATA MISSING" || result.statusLabel === "ENGINEERING REVIEW REQUIRED") {
    return statusToneFromLabel(result.statusLabel);
  }
  if (result.cable.recommendationStatus === "upgraded") return "warning";
  if (result.cable.thermalWithstandPass && result.cable.operatingTempPass) return "pass";
  return "fail";
}

function cableStatusLabel(result: Gba0002Result): string {
  const tone = cableStatusTone(result);
  if (tone === "pass") return "PASS";
  if (tone === "warning") {
    if (result.cable.recommendationStatus === "upgraded") return "WARNING";
    return result.statusLabel;
  }
  return "FAIL";
}

function cableRecommendationText(result: Gba0002Result): string {
  switch (result.cable.recommendationStatus) {
    case "no-change":
      return "No change required";
    case "upgraded":
      return "Replace cable";
    default:
      return "Engineering review required";
  }
}

function fuseStatusTone(result: Gba0002Result): UiStatusTone {
  if (result.statusLabel === "DATA MISSING" || result.statusLabel === "ENGINEERING REVIEW REQUIRED") {
    return statusToneFromLabel(result.statusLabel);
  }
  if (result.fuse.fusePass) return "pass";
  return "fail";
}

type CheckItem = {
  id: string;
  title: string;
  tone: UiStatusTone;
  label: string;
  summary: string;
  details: string;
};

function buildChecks(result: Gba0002Result): CheckItem[] {
  const d = result.derived;
  const batteryPass = result.inputs.batteryVoltageDuringCrankingV >= GBA0002_MIN_STARTER_VOLTAGE_V;
  const continuousPass =
    d.existingCableContinuousA != null &&
    d.alternatorContinuousA != null &&
    d.existingCableContinuousA >= d.alternatorContinuousA;
  const lengthKnown = result.cable.maxAllowableOneWayLengthM != null;
  const fuseProtects =
    result.fuse.suggestedFuseSizeA != null &&
    result.cable.cableCurrentRatingA != null &&
    result.fuse.suggestedFuseSizeA <= result.cable.cableCurrentRatingA + 0.01;
  const reqFuseOk =
    result.fuse.suggestedFuseSizeA != null &&
    d.requiredFuseCurrentA != null &&
    result.fuse.suggestedFuseSizeA + 0.01 >= d.requiredFuseCurrentA;
  const withstandOk =
    result.fuse.withstandTimeS != null && result.fuse.withstandTimeS >= d.crankingTimeS;

  return [
    {
      id: "battery",
      title: "Battery voltage check",
      tone: batteryPass ? "pass" : "fail",
      label: batteryPass ? "PASS" : "FAIL",
      summary: batteryPass
        ? "Battery voltage during cranking is at or above the 16 V minimum."
        : "Battery voltage during cranking is below the minimum required value.",
      details: `Minimum starter voltage = ${GBA0002_MIN_STARTER_VOLTAGE_V} V. Entered: ${result.inputs.batteryVoltageDuringCrankingV} V.`,
    },
    {
      id: "thermal",
      title: "Cable thermal withstand check",
      tone: result.cable.thermalWithstandPass ? "pass" : "fail",
      label: result.cable.thermalWithstandPass ? "PASS" : "FAIL",
      summary: result.cable.thermalWithstandPass
        ? "The cable can survive the cranking current for the required time."
        : "Cable thermal withstand is below the required cranking time.",
      details: `Formula: thermal withstand time = (k × S / I)². Computed: ${result.cable.cableThermalWithstandTimeS ?? "—"} s (required ≥ ${d.crankingTimeS} s).`,
    },
    {
      id: "continuous",
      title: "Cable continuous-current check",
      tone: continuousPass ? "pass" : "fail",
      label: continuousPass ? "PASS" : "FAIL",
      summary: continuousPass
        ? "Cable current rating is at or above alternator continuous current."
        : "Cable current rating is below alternator continuous current.",
      details: `Cable rating: ${formatAmps(d.existingCableContinuousA)}. Alternator: ${formatAmps(d.alternatorContinuousA)}.`,
    },
    {
      id: "cable-temp",
      title: "Cable operating temperature check",
      tone: result.cable.operatingTempPass ? "pass" : "fail",
      label: result.cable.operatingTempPass ? "PASS" : "FAIL",
      summary: result.cable.operatingTempPass
        ? "Operating temperature is within the cable rating."
        : "Operating temperature is outside the cable rating.",
      details: `Entered operating temperature: ${result.inputs.operatingTempC} °C. Cable/site limit: ${formatTemp(result.cable.operatingTempRangeC)}.`,
    },
    {
      id: "length",
      title: "Maximum allowable cable length",
      tone: lengthKnown ? "pass" : "warning",
      label: lengthKnown ? "PASS" : "WARNING",
      summary: lengthKnown
        ? `Maximum one-way length for the voltage budget is ${formatLength(result.cable.maxAllowableOneWayLengthM)}.`
        : "Maximum one-way cable length could not be calculated.",
      details:
        "Based on battery voltage minus 16 V, cranking current Q, and cable resistance. Installed length is not yet compared automatically.",
    },
    {
      id: "fuse-current",
      title: "Fuse current rating check",
      tone: result.fuse.fusePass && reqFuseOk ? "pass" : result.fuse.suggestedFuseSizeA == null ? "fail" : "fail",
      label: result.fuse.fusePass && reqFuseOk ? "PASS" : "FAIL",
      summary:
        result.fuse.fusePass && reqFuseOk
          ? "Suggested fuse rating meets the required fuse current."
          : "No suitable fuse rating was found for the required current.",
      details: `Required fuse current: ${formatAmps(d.requiredFuseCurrentA)}. Suggested: ${formatAmps(result.fuse.suggestedFuseSizeA)}.`,
    },
    {
      id: "fuse-withstand",
      title: "Fuse withstand check",
      tone: withstandOk ? "pass" : "fail",
      label: withstandOk ? "PASS" : "FAIL",
      summary: withstandOk
        ? "Fuse withstand time is at least the required cranking time."
        : "Fuse withstand time is below the required cranking time.",
      details: `Fuse withstand: ${result.fuse.withstandTimeS ?? "—"} s. Required: ${d.crankingTimeS} s.`,
    },
    {
      id: "fuse-protects",
      title: "Fuse protects cable check",
      tone: fuseProtects ? "pass" : "fail",
      label: fuseProtects ? "PASS" : "FAIL",
      summary: fuseProtects
        ? "Fuse rating does not exceed the cable current rating."
        : "Fuse rating may be higher than the cable current rating.",
      details: `Fuse: ${formatAmps(result.fuse.suggestedFuseSizeA)}. Cable rating: ${formatAmps(result.cable.cableCurrentRatingA)}.`,
    },
    {
      id: "fuse-temp",
      title: "Fuse temperature check",
      tone: result.fuse.fuseOperatingTempPass ? "pass" : "fail",
      label: result.fuse.fuseOperatingTempPass ? "PASS" : "FAIL",
      summary: result.fuse.fuseOperatingTempPass
        ? "Operating temperature is within the fuse rating."
        : "Operating temperature is outside the fuse rating.",
      details: `Fuse temperature range: ${formatTemp(result.fuse.fuseOperatingTempC)}. Entered: ${result.inputs.operatingTempC} °C.`,
    },
  ];
}

function CheckCard({ check }: { check: CheckItem }) {
  return (
    <StatusPanel tone={check.tone} style={{ marginTop: 10 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
        <StatusBadge label={check.label} tone={check.tone} />
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ fontWeight: 700, color: "#111" }}>{check.title}</div>
          <div style={{ marginTop: 4, color: "#222", fontSize: 14 }}>{check.summary}</div>
          <ExplanationDropdown summary="Details">
            <p style={{ margin: 0 }}>{check.details}</p>
          </ExplanationDropdown>
        </div>
      </div>
    </StatusPanel>
  );
}

export function Gba0002Calculator() {
  const db = useMemo(() => getDatabase(), []);
  const machines = useMemo(() => filterClientMachines(db.machines), [db]);
  const resultRef = useRef<HTMLDivElement | null>(null);

  const [modelId, setModelId] = useState(machines[0]?.id ?? "D10T");
  const [safetyFactor, setSafetyFactor] = useState<25 | 50>(25);
  const [batteryV, setBatteryV] = useState("20");
  const [operatingTemp, setOperatingTemp] = useState("60");
  const [manualQA, setManualQA] = useState("");
  const [result, setResult] = useState<Gba0002Result | null>(null);
  const [showChangelog, setShowChangelog] = useState(false);
  const [calcError, setCalcError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    battery?: string;
    temp?: string;
    recovery?: string;
  }>({});

  const selectedMachine = machines.find((m) => m.id === modelId);
  const databaseQA = selectedMachine?.peakCurrentCutoffA;
  const databaseQNumber = Number(databaseQA);
  const databaseQMissing = !Number.isFinite(databaseQNumber) || databaseQNumber <= 0;
  const showStarterRecovery =
    result !== null && result.statusLabel === "DATA MISSING" && databaseQMissing;
  const overallTone = result ? statusToneFromLabel(result.statusLabel) : "neutral";
  const checks = result ? buildChecks(result) : [];

  function runCalculate() {
    setCalcError(null);
    const errors: { battery?: string; temp?: string; recovery?: string } = {};
    const battery = Number(batteryV);
    const temp = Number(operatingTemp);

    if (!Number.isFinite(battery) || battery <= 0) {
      errors.battery = "Battery voltage during cranking must be a realistic positive number.";
    }
    if (!Number.isFinite(temp)) {
      errors.temp = "Operating temperature must be a number.";
    }

    let manualPeakCurrentCutoffA: number | null = null;
    if (showStarterRecovery) {
      const q = Number(manualQA);
      if (!Number.isFinite(q) || q <= 0) {
        errors.recovery = "Enter an approved peak current cut-off greater than 0 A.";
      } else {
        manualPeakCurrentCutoffA = q;
      }
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setCalcError("Correct the highlighted inputs before calculating.");
      return;
    }

    const next = calculateGba0002(db, {
      modelId,
      safetyFactorPercent: safetyFactor,
      batteryVoltageDuringCrankingV: battery,
      operatingTempC: temp,
      manualPeakCurrentCutoffA,
    });
    setResult(next);
    if (next.statusLabel === "PASS") {
      setManualQA("");
    }
    window.setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  function onExportPdf() {
    if (!result) return;
    exportGba0002Pdf(result, APP_VERSION);
  }

  return (
    <div style={pageStyle}>
      <header style={{ textAlign: "left", paddingBottom: 8, borderBottom: "1px solid #ddd" }}>
        <div
          style={{
            display: "inline-block",
            background: "#000",
            padding: "8px 12px",
            borderRadius: 4,
          }}
        >
          <img
            src="/GBAuto_LOGO.png"
            alt="GB Auto"
            style={{ display: "block", height: 56, width: "auto", maxWidth: "100%" }}
          />
        </div>
        <h1 style={{ fontSize: 22, margin: "10px 0 4px", lineHeight: 1.2 }}>
          Fuse &amp; Cable Protection Tool
        </h1>
        <p style={{ margin: 0, fontSize: 14, color: "#444" }}>
          Simple field-use calculator for starter circuit cable and fuse checks
        </p>
        <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: "#666" }}>v{APP_VERSION}</span>
          <button
            type="button"
            onClick={() => setShowChangelog((v) => !v)}
            style={{ ...buttonSecondary, marginTop: 0, padding: "4px 8px", fontSize: 12 }}
          >
            {showChangelog ? "Hide" : "Show"} changelog
          </button>
        </div>
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
      </header>

      <section style={cardStyle}>
        <h2 style={{ margin: "0 0 12px", fontSize: 18 }}>Step 1 — Enter Machine Details</h2>

        <label style={{ display: "block", marginBottom: 14, fontWeight: 600 }}>
          Machine make and model
          <select
            value={modelId}
            onChange={(e) => {
              setModelId(e.target.value);
              setResult(null);
              setManualQA("");
              setCalcError(null);
              setFieldErrors({});
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

        <fieldset style={{ border: "none", margin: "0 0 14px", padding: 0 }}>
          <legend style={{ fontWeight: 600, padding: 0 }}>Safety factor</legend>
          <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
            {GBA0002_SAFETY_FACTOR_OPTIONS.map((s) => (
              <label key={s} style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 400 }}>
                <input
                  type="radio"
                  name="safetyFactor"
                  checked={safetyFactor === s}
                  onChange={() => setSafetyFactor(s)}
                />
                {s}%
              </label>
            ))}
          </div>
          <ExplanationDropdown summary="Why this matters">
            The safety factor increases the target fuse size above normal alternator current.
          </ExplanationDropdown>
        </fieldset>

        <label style={{ display: "block", marginBottom: 14, fontWeight: 600 }}>
          Battery voltage during cranking (V)
          <input
            type="text"
            inputMode="decimal"
            value={batteryV}
            onChange={(e) => setBatteryV(e.target.value)}
            style={fieldErrors.battery ? fieldErrorStyle : fieldStyle}
          />
          {fieldErrors.battery && (
            <span style={{ display: "block", marginTop: 4, color: "#c62828", fontSize: 13, fontWeight: 400 }}>
              {fieldErrors.battery}
            </span>
          )}
          <ExplanationDropdown summary="Why this matters">
            This is the voltage measured while the starter is cranking. If the voltage is too low, the starter
            may not operate reliably and voltage drop becomes more critical.
          </ExplanationDropdown>
        </label>

        <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
          Operating temperature (°C)
          <input
            type="text"
            inputMode="decimal"
            value={operatingTemp}
            onChange={(e) => setOperatingTemp(e.target.value)}
            style={fieldErrors.temp ? fieldErrorStyle : fieldStyle}
          />
          {fieldErrors.temp && (
            <span style={{ display: "block", marginTop: 4, color: "#c62828", fontSize: 13, fontWeight: 400 }}>
              {fieldErrors.temp}
            </span>
          )}
          <ExplanationDropdown summary="Why this matters">
            Ambient / operating temperature used to check cable and fuse temperature ratings.
          </ExplanationDropdown>
        </label>

        {showStarterRecovery && (
          <div
            style={{
              marginTop: 12,
              padding: 12,
              border: "1px dashed #888",
              background: "#fafafa",
              borderRadius: 4,
            }}
          >
            <p style={{ margin: "0 0 8px", fontWeight: 700 }}>Complete the missing starter data</p>
            <p style={{ margin: "0 0 8px", fontSize: 13, color: "#555" }}>
              The starter peak current limit is missing from the machine data. Use approved manufacturer, machine,
              or site data only.
            </p>
            <label style={{ display: "block", fontWeight: 600 }}>
              Peak current cut-off (A)
              <input
                type="text"
                inputMode="decimal"
                value={manualQA}
                onChange={(e) => setManualQA(e.target.value)}
                placeholder="e.g. 500"
                style={fieldErrors.recovery ? fieldErrorStyle : fieldStyle}
              />
            </label>
            {fieldErrors.recovery && (
              <span style={{ display: "block", marginTop: 4, color: "#c62828", fontSize: 13 }}>
                {fieldErrors.recovery}
              </span>
            )}
            <ExplanationDropdown summary="What value should I enter?">
              Enter the approved starter peak current cut-off from manufacturer, machine, or site data.
            </ExplanationDropdown>
          </div>
        )}

        {calcError && (
          <p style={{ margin: "10px 0 0", color: "#c62828", fontSize: 14, fontWeight: 600 }}>{calcError}</p>
        )}

        <button type="button" onClick={runCalculate} style={buttonPrimary}>
          Calculate Recommendation
        </button>
        <button
          type="button"
          onClick={onExportPdf}
          disabled={!result}
          style={{
            ...buttonSecondary,
            width: "100%",
            opacity: result ? 1 : 0.5,
            cursor: result ? "pointer" : "not-allowed",
          }}
        >
          Export PDF
        </button>
      </section>

      {result && (
        <div ref={resultRef}>
          <section style={{ ...cardStyle, padding: 0, overflow: "hidden", border: "none" }}>
            <StatusPanel
              tone={overallTone}
              style={{
                borderWidth: 4,
                borderStyle: "solid",
                borderRadius: 4,
                padding: 18,
              }}
            >
              <h2 style={{ margin: "0 0 10px", fontSize: 20, color: "#111", fontWeight: 800 }}>
                Overall Result
              </h2>
              <StatusBadge label={result.statusLabel} tone={overallTone} large />
              <p style={{ margin: "14px 0 0", fontSize: 18, fontWeight: 800, color: "#111" }}>
                {overallHeadline(result.statusLabel)}
              </p>
              <p style={{ margin: "8px 0 0", color: "#222", fontSize: 14 }}>{result.summary}</p>
              <p style={{ margin: "8px 0 0", color: "#333", fontSize: 14 }}>
                <strong>Manufacturer:</strong> {result.manufacturer ?? selectedMachine?.manufacturer ?? "—"}
                <br />
                <strong>Model:</strong> {result.modelId}
              </p>
            </StatusPanel>
          </section>

          <section style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
              <h2 style={{ margin: 0, fontSize: 18 }}>Cable Recommendation</h2>
              <StatusBadge label={cableStatusLabel(result)} tone={cableStatusTone(result)} />
            </div>
            <p style={{ margin: "10px 0 0", fontWeight: 600 }}>
              Recommendation: {cableRecommendationText(result)}
            </p>
            <div style={{ marginTop: 10, fontSize: 15, lineHeight: 1.55 }}>
              <div>
                <strong>Cable type / size:</strong> {result.cable.message}
              </div>
              <div>
                <strong>Cable current rating:</strong> {formatAmps(result.cable.cableCurrentRatingA)}
              </div>
              <div>
                <strong>Operating temperature:</strong> {formatTemp(result.cable.operatingTempRangeC)}
              </div>
              <div>
                <strong>Maximum one-way length:</strong> {formatLength(result.cable.maxAllowableOneWayLengthM)}
              </div>
              <div>
                <strong>Thermal withstand time:</strong>{" "}
                {result.cable.cableThermalWithstandTimeS == null
                  ? "—"
                  : `${result.cable.cableThermalWithstandTimeS} s`}
              </div>
            </div>
            <ExplanationDropdown summary="Reasoning">
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                <li>
                  Thermal withstand: {result.cable.thermalWithstandPass ? "pass" : "fail"} (
                  {result.cable.cableThermalWithstandTimeS ?? "—"} s)
                </li>
                <li>
                  Continuous current vs alternator:{" "}
                  {formatAmps(result.derived.existingCableContinuousA)} vs{" "}
                  {formatAmps(result.derived.alternatorContinuousA)}
                </li>
                <li>Operating temperature within rating: {result.cable.operatingTempPass ? "yes" : "no"}</li>
              </ul>
            </ExplanationDropdown>
          </section>

          <section style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
              <h2 style={{ margin: 0, fontSize: 18 }}>Fuse Recommendation</h2>
              <StatusBadge
                label={fuseStatusTone(result) === "pass" ? "PASS" : fuseStatusTone(result) === "warning" ? "WARNING" : "FAIL"}
                tone={fuseStatusTone(result)}
              />
            </div>
            <div style={{ marginTop: 10, fontSize: 15, lineHeight: 1.55 }}>
              <div>
                <strong>Suggested fuse size:</strong> {formatAmps(result.fuse.suggestedFuseSizeA)}
              </div>
              <div>
                <strong>Fuse make/model:</strong> {result.fuse.fuseMakeModel ?? "—"}
              </div>
              <div>
                <strong>Part number:</strong> {result.fuse.fusePartNumber ?? "—"}
              </div>
              <div>
                <strong>Operating temperature:</strong> {formatTemp(result.fuse.fuseOperatingTempC)}
              </div>
              <div>
                <strong>Withstand time:</strong>{" "}
                {result.fuse.withstandTimeS == null ? "—" : `${result.fuse.withstandTimeS} s`}
              </div>
            </div>
            <ExplanationDropdown summary="Reasoning">
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                <li>Required fuse current: {formatAmps(result.derived.requiredFuseCurrentA)}</li>
                <li>
                  Fuse withstand vs required cranking time: {result.fuse.withstandTimeS ?? "—"} s /{" "}
                  {result.derived.crankingTimeS} s
                </li>
                <li>
                  Fuse ≤ cable rating: {formatAmps(result.fuse.suggestedFuseSizeA)} vs{" "}
                  {formatAmps(result.cable.cableCurrentRatingA)}
                </li>
              </ul>
            </ExplanationDropdown>
          </section>

          <section style={cardStyle}>
            <h2 style={{ margin: "0 0 4px", fontSize: 18 }}>Detailed Checks</h2>
            <p style={{ margin: "0 0 8px", fontSize: 13, color: "#555" }}>
              Traffic-light view of each check used in the recommendation.
            </p>
            {checks.map((c) => (
              <CheckCard key={c.id} check={c} />
            ))}
          </section>

          <section style={cardStyle}>
            <h2 style={{ margin: "0 0 8px", fontSize: 18 }}>Calculation Details</h2>
            <ExplanationDropdown summary="What is cable thermal withstand?">
              Confirms whether the cable can handle the short high current during engine cranking for the required
              time using (k × S / I)².
            </ExplanationDropdown>
            <ExplanationDropdown summary="What is K-factor?">
              K-factor depends on cable insulation and conductor material. It is used in the adiabatic thermal
              withstand calculation.
            </ExplanationDropdown>
            <ExplanationDropdown summary="What is voltage drop?">
              Maximum voltage drop is battery voltage during cranking minus the 16 V minimum starter voltage. It
              limits how long the cable can be.
            </ExplanationDropdown>
            <ExplanationDropdown summary="What does fuse withstand mean?">
              The fuse must survive the cranking current for the required cranking time without opening early.
            </ExplanationDropdown>
            <ExplanationDropdown summary="Why must the fuse protect the cable?">
              A fuse must not be so large that the cable overheats before the fuse operates.
            </ExplanationDropdown>
            <ExplanationDropdown summary="Show derived numbers">
              <pre
                style={{
                  margin: 0,
                  whiteSpace: "pre-wrap",
                  fontSize: 12,
                  background: "#f5f5f5",
                  padding: 10,
                  border: "1px solid #ddd",
                }}
              >
                {`Design cranking current Q (A): ${result.derived.starterCrankingCurrentA ?? "—"}
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
Required fuse current (A): ${result.derived.requiredFuseCurrentA ?? "—"}`}
              </pre>
            </ExplanationDropdown>
          </section>
        </div>
      )}

      <p
        style={{
          marginTop: 20,
          padding: 12,
          borderTop: "1px solid #ccc",
          fontSize: 12,
          color: "#555",
          lineHeight: 1.45,
        }}
      >
        This tool is a design aid only. Final cable and fuse selection must be reviewed against applicable
        standards, manufacturer datasheets, site requirements and approved by a qualified engineer before
        implementation.
      </p>
    </div>
  );
}
