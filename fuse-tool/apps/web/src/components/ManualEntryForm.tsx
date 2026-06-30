"use client";

import type { ManualEntryInput } from "@fuse-tool/engine";

export const DEFAULT_MANUAL_INPUT: ManualEntryInput = {
  machineLabel: "Manual entry",
  safetyFactorPercent: 25,
  crankingTimeRequiredS: 5,
  electricalSystemV: 24,
  voltageDropLimitPercent: 3,
  peakCrankingCurrentA: 200,
  alternatorContinuousA: 80,
  cableType: "Thermosetting 90°C XLPE EDR",
  cableSizeMm2: 70,
  cableContinuousA: 314,
  cableLengthM: 6,
  operatingTempC: 60,
  peakCurrentCutoffA: 500,
  crankingVoltageMeasuredV: 20,
  minBatteryVoltageV: 16.48,
};

interface Props {
  value: ManualEntryInput;
  onChange: (next: ManualEntryInput) => void;
  onCalculate: () => void;
  validationErrors?: string[];
}

function Field({
  label,
  id,
  value,
  onChange,
  step = "any",
}: {
  label: string;
  id: keyof ManualEntryInput;
  value: string | number | undefined;
  onChange: (id: keyof ManualEntryInput, v: string) => void;
  step?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-slate-400">{label}</span>
      <input
        id={id}
        type={typeof value === "number" ? "number" : "text"}
        step={step}
        value={value ?? ""}
        onChange={(e) => onChange(id, e.target.value)}
        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none ring-sky-500 focus:ring-2"
      />
    </label>
  );
}

export function ManualEntryForm({ value, onChange, onCalculate, validationErrors }: Props) {
  const set = (id: keyof ManualEntryInput, raw: string) => {
    const numericKeys: (keyof ManualEntryInput)[] = [
      "safetyFactorPercent",
      "crankingTimeRequiredS",
      "electricalSystemV",
      "voltageDropLimitPercent",
      "peakCrankingCurrentA",
      "alternatorContinuousA",
      "cableSizeMm2",
      "cableContinuousA",
      "cableLengthM",
      "operatingTempC",
      "peakCurrentCutoffA",
      "crankingVoltageMeasuredV",
      "minBatteryVoltageV",
      "maxAllowedCrankingTimeS",
      "kFactorCopper",
    ];
    const next = { ...value, [id]: numericKeys.includes(id) ? Number(raw) : raw };
    onChange(next as ManualEntryInput);
  };

  return (
    <div className="space-y-4">
      {validationErrors && validationErrors.length > 0 && (
        <div className="rounded-lg border border-red-500/40 bg-red-950/30 p-3 text-sm text-red-100">
          <p className="font-semibold">Fix these inputs:</p>
          <ul className="mt-1 list-inside list-disc">
            {validationErrors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Machine label" id="machineLabel" value={value.machineLabel} onChange={set} />
        <Field label="Safety factor (%)" id="safetyFactorPercent" value={value.safetyFactorPercent} onChange={set} />
        <Field label="Required cranking time (s)" id="crankingTimeRequiredS" value={value.crankingTimeRequiredS} onChange={set} />
        <Field label="System voltage (V)" id="electricalSystemV" value={value.electricalSystemV} onChange={set} />
        <Field label="Voltage drop limit (%)" id="voltageDropLimitPercent" value={value.voltageDropLimitPercent} onChange={set} />
        <Field label="Starter cranking current (A)" id="peakCrankingCurrentA" value={value.peakCrankingCurrentA} onChange={set} />
        <Field label="Alternator continuous current (A)" id="alternatorContinuousA" value={value.alternatorContinuousA} onChange={set} />
        <Field label="Starter peak current limit (A)" id="peakCurrentCutoffA" value={value.peakCurrentCutoffA} onChange={set} />
        <Field label="Cable type" id="cableType" value={value.cableType} onChange={set} />
        <Field label="Cable size (mm²)" id="cableSizeMm2" value={value.cableSizeMm2} onChange={set} />
        <Field label="Cable current rating (A)" id="cableContinuousA" value={value.cableContinuousA} onChange={set} />
        <Field label="Cable length (m)" id="cableLengthM" value={value.cableLengthM} onChange={set} />
        <Field label="Cable operating temp (°C)" id="operatingTempC" value={value.operatingTempC} onChange={set} />
        <Field label="Measured cranking voltage (V) — optional" id="crankingVoltageMeasuredV" value={value.crankingVoltageMeasuredV} onChange={set} />
        <Field label="Min battery voltage (V) — optional" id="minBatteryVoltageV" value={value.minBatteryVoltageV} onChange={set} />
        <Field label="Max allowed cranking time (s) — optional" id="maxAllowedCrankingTimeS" value={value.maxAllowedCrankingTimeS} onChange={set} />
        <Field label="K-factor override — optional" id="kFactorCopper" value={value.kFactorCopper} onChange={set} />
      </div>

      <button
        type="button"
        onClick={onCalculate}
        className="w-full rounded-lg bg-sky-600 py-3 text-sm font-semibold text-white hover:bg-sky-500"
      >
        Calculate recommendation
      </button>
    </div>
  );
}
