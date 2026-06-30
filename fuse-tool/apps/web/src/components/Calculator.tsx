"use client";

import { useMemo, useState } from "react";
import {
  recommend,
  listModelIds,
  type RecommendationResult,
} from "@fuse-tool/engine";
import { getDatabase } from "@/lib/db";
import { CheckCard } from "@/components/CheckCard";

export function Calculator() {
  const db = useMemo(() => getDatabase(), []);
  const models = useMemo(() => listModelIds(db), [db]);
  const [modelId, setModelId] = useState(models[0] ?? "");
  const [safetyFactor, setSafetyFactor] = useState(
    db.constants.defaultSafetyFactorPercent,
  );
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return models;
    return models.filter((m) => m.toLowerCase().includes(q));
  }, [models, query]);

  const result: RecommendationResult | null = useMemo(() => {
    if (!modelId) return null;
    return recommend(db, { modelId, safetyFactorPercent: safetyFactor });
  }, [db, modelId, safetyFactor]);

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-6 pb-16">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-sky-400">
          GB Engineering · Phase 1
        </p>
        <h1 className="text-2xl font-bold tracking-tight">Fuse &amp; Cable Protection</h1>
        <p className="text-sm text-slate-400">
          Mine-site library mode — corrected logic vs legacy Excel/MATLAB
        </p>
      </header>

      <section className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4">
        <label className="block text-sm font-medium text-slate-300" htmlFor="search">
          Search model
        </label>
        <input
          id="search"
          type="search"
          placeholder="Filter models…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none ring-sky-500 focus:ring-2"
        />
        <label className="block text-sm font-medium text-slate-300" htmlFor="model">
          Machine model
        </label>
        <select
          id="model"
          value={modelId}
          onChange={(e) => setModelId(e.target.value)}
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none ring-sky-500 focus:ring-2"
        >
          {filtered.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>

        <label className="block text-sm font-medium text-slate-300" htmlFor="safety">
          Fuse safety factor (%)
        </label>
        <input
          id="safety"
          type="number"
          min={0}
          max={100}
          value={safetyFactor}
          onChange={(e) => setSafetyFactor(Number(e.target.value))}
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none ring-sky-500 focus:ring-2"
        />
      </section>

      {result && (
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
            <h2 className="text-sm font-semibold uppercase tracking-wide opacity-80">
              Summary
            </h2>
            <p className="mt-1 text-lg font-semibold">{result.summary.recommendedAction}</p>
            {result.machine && (
              <p className="mt-2 text-sm opacity-80">
                {result.machine.manufacturer} · {result.machine.category} ·{" "}
                {result.machine.site}
              </p>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Checks ({result.checks.length})
            </h2>
            {result.checks.map((c) => (
              <CheckCard key={c.id} check={c} />
            ))}
          </section>

          <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-sm">
            <h2 className="font-semibold text-slate-300">Derived values</h2>
            <dl className="mt-2 grid grid-cols-2 gap-2 text-xs">
              <dt className="text-slate-500">K-factor used</dt>
              <dd>{result.derived.kFactorUsed ?? "—"}</dd>
              <dt className="text-slate-500">Cable peak capability (A)</dt>
              <dd>{result.derived.cablePeakCapabilityA ?? "—"}</dd>
              <dt className="text-slate-500">Cranking time used (s)</dt>
              <dd>{result.derived.cablePeakTimeUsedS ?? "—"}</dd>
              <dt className="text-slate-500">Fuse target (A)</dt>
              <dd>{result.fuse.targetRatingA?.toFixed(1) ?? "—"}</dd>
              <dt className="text-slate-500">Fuse selected (A)</dt>
              <dd>{result.fuse.selectedRatingA ?? "—"}</dd>
              <dt className="text-slate-500">Voltage drop (%)</dt>
              <dd>
                {result.derived.voltageDropPercent !== null
                  ? result.derived.voltageDropPercent.toFixed(2)
                  : "—"}
              </dd>
            </dl>
          </section>

          <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-xs text-slate-400">
            <h2 className="font-semibold text-slate-300">Implementation notes</h2>
            <ul className="mt-2 list-inside list-disc space-y-1">
              {result.implementationNotes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </section>
        </>
      )}

      <footer className="text-center text-xs text-slate-600">
        Recommendations require engineering verification on site.
      </footer>
    </div>
  );
}
