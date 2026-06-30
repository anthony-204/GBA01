"use client";

import type { CheckResult, CheckStatus } from "@fuse-tool/engine";

const STATUS_STYLES: Record<CheckStatus, string> = {
  pass: "border-emerald-500/40 bg-emerald-950/40 text-emerald-100",
  fail: "border-red-500/40 bg-red-950/40 text-red-100",
  warning: "border-amber-500/40 bg-amber-950/40 text-amber-100",
  unavailable: "border-yellow-500/40 bg-yellow-950/30 text-yellow-100",
  invalid: "border-slate-500/40 bg-slate-900/60 text-slate-300",
};

const STATUS_LABEL: Record<CheckStatus, string> = {
  pass: "Pass",
  fail: "Fail",
  warning: "Warning",
  unavailable: "Data unavailable",
  invalid: "Invalid",
};

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
        <summary className="cursor-pointer hover:opacity-100">Specification</summary>
        <p className="mt-1">{check.specification}</p>
        {check.legacyReference && (
          <p className="mt-1 italic">Legacy: {check.legacyReference}</p>
        )}
      </details>
    </article>
  );
}
