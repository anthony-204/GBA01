"use client";

import { useMemo, useState } from "react";
import {
  calculate,
  listVehiclesWithCompleteness,
  type ManualEntryInput,
  type RecommendationResult,
} from "@fuse-tool/engine";
import { getDatabase } from "@/lib/db";
import { completenessBadge, completenessText } from "@/lib/statusStyles";
import { CheckCard } from "@/components/CheckCard";
import { PdfResultsPanel } from "@/components/PdfResultsPanel";
import { IncompleteVehiclePanel } from "@/components/IncompleteVehiclePanel";
import { ManualEntryForm, DEFAULT_MANUAL_INPUT } from "@/components/ManualEntryForm";
import { NumericInput } from "@/components/NumericInput";

type Mode = "library" | "manual";

export function Calculator() {
  const db = useMemo(() => getDatabase(), []);
  const vehicles = useMemo(() => listVehiclesWithCompleteness(db.machines), [db]);

  const [mode, setMode] = useState<Mode>("library");
  const [query, setQuery] = useState("");
  const [modelId, setModelId] = useState(
    () => vehicles.find((v) => v.completeness.isComplete)?.id ?? vehicles[0]?.id ?? "",
  );
  const [safetyFactor, setSafetyFactor] = useState<number | undefined>(
    db.constants.defaultSafetyFactorPercent,
  );
  const [voltageDropLimit, setVoltageDropLimit] = useState<number | undefined>(
    db.constants.voltageDropPercentLimit,
  );
  const [manualInput, setManualInput] = useState<ManualEntryInput>(DEFAULT_MANUAL_INPUT);
  const [manualResult, setManualResult] = useState<RecommendationResult | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return vehicles;
    return vehicles.filter(
      (v) =>
        v.id.toLowerCase().includes(q) ||
        (v.manufacturer?.toLowerCase().includes(q) ?? false),
    );
  }, [vehicles, query]);

  const selectedVehicle = vehicles.find((v) => v.id === modelId);

  const libraryResult: RecommendationResult | null = useMemo(() => {
    if (mode !== "library" || !modelId) return null;
    return calculate(db, {
      mode: "library",
      modelId,
      safetyFactorPercent: safetyFactor ?? db.constants.defaultSafetyFactorPercent,
      voltageDropLimitPercent: voltageDropLimit ?? db.constants.voltageDropPercentLimit,
    });
  }, [db, mode, modelId, safetyFactor, voltageDropLimit]);

  const result = mode === "library" ? libraryResult : manualResult;

  const runManual = () => {
    setManualResult(calculate(db, { mode: "manual", inputs: manualInput }));
  };

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-6 pb-20">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-sky-400">
          GB Auto · Version 2
        </p>
        <h1 className="text-2xl font-bold tracking-tight">Fuse &amp; Cable Protection</h1>
        <p className="text-sm text-slate-400">
          Design aid per GBA-0002 — engineering approval required before installation.
        </p>
      </header>

      <div className="flex rounded-lg border border-slate-800 p-1">
        {(["library", "manual"] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`flex-1 rounded-md py-2 text-sm font-medium ${
              mode === m ? "bg-sky-600 text-white" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {m === "library" ? "Vehicle library" : "Manual entry"}
          </button>
        ))}
      </div>

      {mode === "library" ? (
        <section className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <input
            type="search"
            placeholder="Search make / model…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
          />
          <label className="block text-sm font-medium text-slate-300" htmlFor="model">
            Machine model
          </label>
          <select
            id="model"
            value={modelId}
            onChange={(e) => setModelId(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
          >
            {filtered.map((v) => (
              <option key={v.id} value={v.id}>
                {v.id}
                {v.manufacturer ? ` · ${v.manufacturer}` : ""}
                {!v.completeness.isComplete ? " · ⚠" : ""}
              </option>
            ))}
          </select>

          {selectedVehicle && (
            <span
              className={`inline-block rounded-full border px-2 py-0.5 text-xs font-semibold ${completenessBadge(selectedVehicle.completeness.label)}`}
            >
              {completenessText(selectedVehicle.completeness.label)}
            </span>
          )}

          <NumericInput
            id="safety"
            label="Fuse safety factor (%)"
            value={safetyFactor}
            onChange={setSafetyFactor}
          />
          <NumericInput
            id="vdrop"
            label="Voltage drop limit (%)"
            value={voltageDropLimit}
            onChange={setVoltageDropLimit}
          />
        </section>
      ) : (
        <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <ManualEntryForm
            value={manualInput}
            onChange={setManualInput}
            onCalculate={runManual}
            validationErrors={manualResult?.validationErrors}
          />
        </section>
      )}

      {result && (
        <>
          {result.blocked ? (
            <IncompleteVehiclePanel result={result} />
          ) : (
            <>
              <section
                className={`rounded-xl border p-4 ${
                  result.summary.overallStatus === "pass"
                    ? "border-emerald-600/50 bg-emerald-950/30"
                    : result.summary.overallStatus === "fail"
                      ? "border-red-600/50 bg-red-950/30"
                      : "border-amber-600/50 bg-amber-950/30"
                }`}
              >
                <h2 className="text-sm font-semibold uppercase opacity-80">Summary</h2>
                <p className="mt-1 text-lg font-semibold">{result.summary.recommendedAction}</p>
                {result.machine && (
                  <p className="mt-2 text-sm opacity-80">
                    {result.machine.manufacturer} · {result.machine.category} · {result.machine.site}
                  </p>
                )}
              </section>

              {result.outputs && <PdfResultsPanel outputs={result.outputs} />}
            </>
          )}

          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Engineering checks ({result.checks.length})
            </h2>
            {result.checks.map((c) => (
              <CheckCard key={c.id} check={c} />
            ))}
          </section>

          {!result.blocked && result.derived.assumptionsUsed.length > 0 && (
            <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-xs text-slate-400">
              <h2 className="font-semibold text-slate-300">Documented assumptions</h2>
              <ul className="mt-2 list-inside list-disc space-y-1">
                {result.derived.assumptionsUsed.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      <footer className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 text-xs text-slate-500">
        <strong>Disclaimer:</strong> This tool is a design aid only. Final cable and fuse
        selection must be confirmed against applicable AS/NZS standards, manufacturer datasheets,
        site requirements, and review by a qualified electrical engineer before implementation.
      </footer>
    </div>
  );
}
