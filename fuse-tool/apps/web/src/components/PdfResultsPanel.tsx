"use client";

import type { PdfCableFuseOutputs } from "@fuse-tool/engine";
import { STATUS_LABEL, STATUS_STYLES } from "@/lib/statusStyles";

interface Props {
  outputs: PdfCableFuseOutputs;
}

function Row({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-800 py-2 text-sm last:border-0">
      <dt className="text-slate-400">{label}</dt>
      <dd className="text-right font-medium">{value ?? "—"}</dd>
    </div>
  );
}

function SuitabilityBadge({ label, status }: { label: string; status: keyof typeof STATUS_STYLES }) {
  return (
    <div className={`rounded-lg border px-3 py-2 text-center text-xs font-semibold ${STATUS_STYLES[status]}`}>
      {label}: {STATUS_LABEL[status]}
    </div>
  );
}

export function PdfResultsPanel({ outputs }: Props) {
  return (
    <section className="rounded-xl border border-sky-800/40 bg-sky-950/20 p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-sky-300">
        Cable &amp; fuse specification (GBA-0002)
      </h2>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase text-slate-500">Cable</h3>
          <dl>
            <Row label="Cable type" value={outputs.cableType} />
            <Row label="Cable size (mm²)" value={outputs.cableSizeMm2} />
            <Row label="Cable current rating (A)" value={outputs.cableCurrentRatingA} />
            <Row label="Cable length (mm)" value={outputs.cableLengthMm} />
            <Row label="Operating temp (°C)" value={outputs.cableOperatingTempC} />
          </dl>
        </div>
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase text-slate-500">Fuse</h3>
          <dl>
            <Row label="Suggested fuse size (A)" value={outputs.suggestedFuseSizeA} />
            <Row label="Fuse make & model" value={outputs.fuseMakeModel} />
            <Row label="Fuse operating temp" value={outputs.fuseOperatingTempC} />
          </dl>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <SuitabilityBadge label="Cable suitability" status={outputs.cableSuitabilityStatus} />
        <SuitabilityBadge label="Fuse suitability" status={outputs.fuseSuitabilityStatus} />
      </div>
    </section>
  );
}
