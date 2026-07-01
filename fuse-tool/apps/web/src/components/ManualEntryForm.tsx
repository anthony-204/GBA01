"use client";

import type { ManualEntryInput } from "@fuse-tool/engine";
import { NumericInput } from "@/components/NumericInput";

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

function TextField({
  label,
  id,
  value,
  onChange,
}: {
  label: string;
  id: keyof ManualEntryInput;
  value: string | undefined;
  onChange: (id: keyof ManualEntryInput, v: string) => void;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-slate-400">{label}</span>
      <input
        id={id}
        type="text"
        value={value ?? ""}
        onChange={(e) => onChange(id, e.target.value)}
        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none ring-sky-500 focus:ring-2"
      />
    </label>
  );
}

type NumericKey =
  | "safetyFactorPercent"
  | "crankingTimeRequiredS"
  | "electricalSystemV"
  | "voltageDropLimitPercent"
  | "peakCrankingCurrentA"
  | "alternatorContinuousA"
  | "cableSizeMm2"
  | "cableContinuousA"
  | "cableLengthM"
  | "operatingTempC"
  | "peakCurrentCutoffA"
  | "crankingVoltageMeasuredV"
  | "minBatteryVoltageV"
  | "maxAllowedCrankingTimeS"
  | "kFactorCopper";

export function ManualEntryForm({ value, onChange, onCalculate, validationErrors }: Props) {
  const setNum = (id: NumericKey, n: number | undefined) => {
    onChange({ ...value, [id]: n } as ManualEntryInput);
  };

  const setText = (id: keyof ManualEntryInput, raw: string) => {
    onChange({ ...value, [id]: raw });
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
        <TextField label="Machine label" id="machineLabel" value={value.machineLabel} onChange={setText} />
        <NumericInput
          label="Safety factor (%)"
          id="safetyFactorPercent"
          value={value.safetyFactorPercent}
          onChange={(n) => setNum("safetyFactorPercent", n)}
        />
        <NumericInput
          label="Required cranking time (s)"
          id="crankingTimeRequiredS"
          value={value.crankingTimeRequiredS}
          onChange={(n) => setNum("crankingTimeRequiredS", n)}
        />
        <NumericInput
          label="System voltage (V)"
          id="electricalSystemV"
          value={value.electricalSystemV}
          onChange={(n) => setNum("electricalSystemV", n)}
        />
        <NumericInput
          label="Voltage drop limit (%)"
          id="voltageDropLimitPercent"
          value={value.voltageDropLimitPercent}
          onChange={(n) => setNum("voltageDropLimitPercent", n)}
        />
        <NumericInput
          label="Starter cranking current (A)"
          id="peakCrankingCurrentA"
          value={value.peakCrankingCurrentA}
          onChange={(n) => setNum("peakCrankingCurrentA", n)}
        />
        <NumericInput
          label="Alternator continuous current (A)"
          id="alternatorContinuousA"
          value={value.alternatorContinuousA}
          onChange={(n) => setNum("alternatorContinuousA", n)}
        />
        <NumericInput
          label="Starter peak current limit (A)"
          id="peakCurrentCutoffA"
          value={value.peakCurrentCutoffA}
          onChange={(n) => setNum("peakCurrentCutoffA", n)}
        />
        <TextField label="Cable type" id="cableType" value={value.cableType} onChange={setText} />
        <NumericInput
          label="Cable size (mm²)"
          id="cableSizeMm2"
          value={value.cableSizeMm2}
          onChange={(n) => setNum("cableSizeMm2", n)}
        />
        <NumericInput
          label="Cable current rating (A)"
          id="cableContinuousA"
          value={value.cableContinuousA}
          onChange={(n) => setNum("cableContinuousA", n)}
        />
        <NumericInput
          label="Cable length (m)"
          id="cableLengthM"
          value={value.cableLengthM}
          onChange={(n) => setNum("cableLengthM", n)}
        />
        <NumericInput
          label="Cable operating temp (°C)"
          id="operatingTempC"
          value={value.operatingTempC}
          onChange={(n) => setNum("operatingTempC", n)}
        />
        <NumericInput
          label="Measured cranking voltage (V) — optional"
          id="crankingVoltageMeasuredV"
          value={value.crankingVoltageMeasuredV}
          onChange={(n) => setNum("crankingVoltageMeasuredV", n)}
        />
        <NumericInput
          label="Min battery voltage (V) — optional"
          id="minBatteryVoltageV"
          value={value.minBatteryVoltageV}
          onChange={(n) => setNum("minBatteryVoltageV", n)}
        />
        <NumericInput
          label="Max allowed cranking time (s) — optional"
          id="maxAllowedCrankingTimeS"
          value={value.maxAllowedCrankingTimeS}
          onChange={(n) => setNum("maxAllowedCrankingTimeS", n)}
        />
        <NumericInput
          label="K-factor override — optional"
          id="kFactorCopper"
          value={value.kFactorCopper}
          onChange={(n) => setNum("kFactorCopper", n)}
        />
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
