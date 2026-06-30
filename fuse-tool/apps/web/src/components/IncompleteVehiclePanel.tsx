"use client";

import type { RecommendationResult } from "@fuse-tool/engine";
import { completenessBadge, completenessText } from "@/lib/statusStyles";

export function IncompleteVehiclePanel({ result }: { result: RecommendationResult }) {
  return (
    <section className="rounded-xl border border-amber-600/40 bg-amber-950/25 p-4">
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-lg font-semibold text-amber-100">
          {completenessText(result.completeness.label)}
        </h2>
        <span
          className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold ${completenessBadge(result.completeness.label)}`}
        >
          Blocked
        </span>
      </div>
      <p className="mt-2 text-sm text-amber-100/90">{result.blockReason}</p>
      {result.completeness.missingFieldLabels.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase text-amber-200/70">Missing fields</p>
          <ul className="mt-1 list-inside list-disc text-sm text-amber-50/90">
            {result.completeness.missingFieldLabels.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>
      )}
      <p className="mt-4 text-xs text-amber-200/60">
        Switch to <strong>Manual entry</strong> to analyse this case, or update the fleet database
        with the missing engineering data.
      </p>
    </section>
  );
}
