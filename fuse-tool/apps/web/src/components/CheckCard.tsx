"use client";

import type { CheckResult } from "@fuse-tool/engine";
import { STATUS_LABEL, STATUS_STYLES } from "@/lib/statusStyles";

export function CheckCard({ check }: { check: CheckResult }) {
  return (
    <article
      className={`rounded-xl border p-4 ${STATUS_STYLES[check.status]}`}
      aria-label={check.label}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <h3 className="text-sm font-medium leading-snug">{check.label}</h3>
        <span className="shrink-0 rounded-full bg-black/20 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide">
          {STATUS_LABEL[check.status]}
        </span>
      </div>
      <p className="text-base font-semibold">
        {check.value === null || check.value === undefined ? "—" : String(check.value)}
      </p>
      <p className="mt-2 text-sm opacity-90">{check.message}</p>
      <details className="mt-3 text-xs opacity-70">
        <summary className="cursor-pointer hover:opacity-100">Calculation details</summary>
        <p className="mt-1">{check.specification}</p>
        {check.legacyReference && (
          <p className="mt-1 italic">Reference: {check.legacyReference}</p>
        )}
      </details>
    </article>
  );
}
