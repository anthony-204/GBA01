"use client";

import { useMemo, useState } from "react";
import {
  calculateGba0002,
  filterClientMachines,
  GBA0002_SAFETY_FACTOR_OPTIONS,
  type Gba0002InputMode,
  type Gba0002Result,
} from "@fuse-tool/engine";
import { getDatabase } from "@/lib/db";
import { STATUS_LABEL, STATUS_STYLES } from "@/lib/statusStyles";
import { NumericInput } from "@/components/NumericInput";

function ResultRow({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div className="flex justify-between gap-3 border-b border-slate-800 py-2 text-sm last:border-0">
      <dt className="text-slate-400">{label}</dt>
      <dd className="text-right font-medium">{value ?? "—"}</dd>
    </div>
  );
}

function StatusPill({ status }: { status: Gba0002Result["overallStatus"] }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

export function Gba0002Calculator() {
  const db = useMemo(() => getDatabase(), []);
  const machines = useMemo(() => filterClientMachines(db.machines), [db]);

  const [modelId, setModelId] = useState(machines[0]?.id ?? "D10T");
  const [inputMode, setInputMode] = useState<Gba0002InputMode>("simple");
  const [safetyFactor, setSafetyFactor] = useState<number>(25);
  const [batteryV, setBatteryV] = useState<number | undefined>(20);
  const [operatingTemp, setOperatingTemp] = useState<number | undefined>(60);
  const [crankingTimeS, setCrankingTimeS] = useState<number | undefined>(5);

  const result: Gba0002Result | null = useMemo(() => {
    if (
      batteryV === undefined ||
      operatingTemp === undefined ||
      crankingTimeS === undefined ||
      !modelId
    ) {
      return null;
    }
    return calculateGba0002(db, {
      modelId,
      safetyFactorPercent: safetyFactor,
      batteryVoltageDuringCrankingV: batteryV,
      operatingTempC: operatingTemp,
      crankingTimeS,
      inputMode,
    });
  }, [db, modelId, safetyFactor, batteryV, operatingTemp, crankingTimeS, inputMode]);

  const machine = machines.find((m) => m.id === modelId);

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-6 pb-20">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-sky-400">
          GB Auto · GBA-0002 · Client v2
        </p>
        <h1 className="text-2xl font-bold tracking-tight">Fuse &amp; Cable Protection</h1>
        <p className="text-sm text-slate-400">
          Field tool with layered input validation — block impossible values, review unusual ones.
        </p>
      </header>

      <section className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4">
        <h2 className="text-sm font-semibold uppercase text-slate-400">User inputs</h2>

        <label className="block text-sm">
          <span className="mb-1 block text-slate-400">Input mode</span>
          <select
            value={inputMode}
            onChange={(e) => {
              const mode = e.target.value as Gba0002InputMode;
              setInputMode(mode);
              if (mode === "simple" && !GBA0002_SAFETY_FACTOR_OPTIONS.includes(safetyFactor as 25 | 50)) {
                setSafetyFactor(25);
              }
            }}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
          >
            <option value="simple">Simple — 25% / 50% safety factor only</option>
            <option value="advanced">Advanced — variable safety factor (engineer)</option>
          </select>
        </label>

        {inputMode === "simple" ? (
          <label className="block text-sm">
            <span className="mb-1 block text-slate-400">Safety factor (%)</span>
            <select
              value={safetyFactor}
              onChange={(e) => setSafetyFactor(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            >
              {GBA0002_SAFETY_FACTOR_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}%
                </option>
              ))}
            </select>
          </label>
        ) : (
          <NumericInput
            label="Safety factor (%) — Advanced Mode (0–60)"
            value={safetyFactor}
            onChange={setSafetyFactor}
          />
        )}

        <label className="block text-sm">
          <span className="mb-1 block text-slate-400">Machine make and model</span>
          <select
            value={modelId}
            onChange={(e) => setModelId(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
          >
            {machines.map((m) => (
              <option key={m.id} value={m.id}>
                {m.id}
                {m.manufacturer ? ` · ${m.manufacturer}` : ""}
              </option>
            ))}
          </select>
        </label>

        {machine && (
          <p className="text-xs text-slate-500">
            {machine.manufacturer} · {machine.category} · {machine.electricalSystemV ?? 24} V system ·
            Cranking {String(machine.peakCrankingCurrentA)} A
          </p>
        )}

        <NumericInput
          label="Battery voltage during cranking (V)"
          value={batteryV}
          onChange={setBatteryV}
        />
        <NumericInput
          label="Operating temperature (°C)"
          value={operatingTemp}
          onChange={setOperatingTemp}
        />
        <NumericInput
          label="Cranking time (s) — default 5 s"
          value={crankingTimeS}
          onChange={setCrankingTimeS}
        />
      </section>

      {result && (
        <>
          {(result.validation.errors.length > 0 || result.validation.warnings.length > 0) && (
            <section className="space-y-2 rounded-xl border border-slate-700 bg-slate-900/60 p-4">
              <h2 className="text-sm font-semibold uppercase text-slate-400">Validation</h2>
              {result.validation.errors.map((msg) => (
                <p key={msg} className="rounded-lg border border-red-800/60 bg-red-950/40 px-3 py-2 text-sm text-red-200">
                  {msg}
                </p>
              ))}
              {result.validation.warnings.map((msg) => (
                <p
                  key={msg}
                  className="rounded-lg border border-amber-800/60 bg-amber-950/40 px-3 py-2 text-sm text-amber-100"
                >
                  {msg}
                </p>
              ))}
            </section>
          )}

          <section
            className={`rounded-xl border p-4 ${
              result.overallStatus === "pass"
                ? "border-emerald-600/50 bg-emerald-950/30"
                : result.overallStatus === "fail"
                  ? "border-red-600/50 bg-red-950/30"
                  : "border-amber-600/50 bg-amber-950/30"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-sm font-semibold uppercase opacity-80">Summary</h2>
              <StatusPill status={result.overallStatus} />
            </div>
            <p className="mt-2 text-base font-medium">{result.summary}</p>
            {result.blocked && (
              <p className="mt-2 text-xs opacity-80">
                Calculation blocked — correct inputs before relying on any recommendation.
              </p>
            )}
          </section>

          {!result.blocked && (
            <>
              <section className="rounded-xl border border-sky-800/40 bg-sky-950/20 p-4">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-sky-300">
                  Results (GBA-0002)
                </h2>
                <dl className="mt-3">
                  <ResultRow
                    label="Cable type & size"
                    value={
                      result.cable.cableType && result.cable.cableSizeMm2
                        ? result.cable.recommendationStatus === "no-change"
                          ? `No change — ${result.cable.cableType} · ${result.cable.cableSizeMm2} mm²`
                          : `${result.cable.cableType} · ${result.cable.cableSizeMm2} mm²`
                        : result.cable.message
                    }
                  />
                  <ResultRow label="Cable current rating (A)" value={result.cable.cableCurrentRatingA} />
                  <ResultRow
                    label="Max allowable one-way length (m)"
                    value={result.cable.maxAllowableOneWayLengthM}
                  />
                  <ResultRow
                    label="Cable operating temperature"
                    value={result.cable.operatingTempRangeC}
                  />
                  <ResultRow label="Suggested fuse size (A)" value={result.fuse.suggestedFuseSizeA} />
                  <ResultRow
                    label="Fuse make & part number"
                    value={
                      result.fuse.fuseMakeModel && result.fuse.fusePartNumber
                        ? `${result.fuse.fuseMakeModel} · ${result.fuse.fusePartNumber}`
                        : result.fuse.fuseMakeModel
                    }
                  />
                  <ResultRow
                    label="Fuse operating temperature"
                    value={result.fuse.fuseOperatingTempC}
                  />
                </dl>
              </section>

              <section className="space-y-2">
                <h2 className="text-sm font-semibold uppercase text-slate-400">
                  Calculation trace (line items)
                </h2>
                {result.lineItems.map((item) => (
                  <article
                    key={item.id}
                    className={`rounded-lg border p-3 text-sm ${STATUS_STYLES[item.status]}`}
                  >
                    <div className="flex justify-between gap-2">
                      <span className="font-medium">
                        {item.line}. {item.label}
                      </span>
                      <StatusPill status={item.status} />
                    </div>
                    <p className="mt-1 font-semibold">{item.value ?? "—"}</p>
                    {item.detail && <p className="mt-1 text-xs opacity-80">{item.detail}</p>}
                  </article>
                ))}
              </section>
            </>
          )}
        </>
      )}

      <footer className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 text-xs text-slate-500">
        <strong>Disclaimer:</strong> Design aid per GBA-0002 with GB Auto engineering guardrails.
        Hard blocks and review warnings are application limits — final selections require engineering
        approval against AS/NZS standards and manufacturer datasheets.
      </footer>
    </div>
  );
}
