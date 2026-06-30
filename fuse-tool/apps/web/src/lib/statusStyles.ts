import type { CheckStatus } from "@fuse-tool/engine";

export const STATUS_STYLES: Record<CheckStatus, string> = {
  pass: "border-emerald-500/40 bg-emerald-950/40 text-emerald-100",
  fail: "border-red-500/40 bg-red-950/40 text-red-100",
  warning: "border-amber-500/40 bg-amber-950/40 text-amber-100",
  unavailable: "border-slate-500/40 bg-slate-800/60 text-slate-300",
  invalid: "border-slate-600/40 bg-slate-900/60 text-slate-400",
};

export const STATUS_LABEL: Record<CheckStatus, string> = {
  pass: "Pass",
  fail: "Fail",
  warning: "Warning",
  unavailable: "Unavailable",
  invalid: "Invalid",
};

export function completenessBadge(label: string): string {
  switch (label) {
    case "complete":
      return "bg-emerald-900/50 text-emerald-200 border-emerald-700/50";
    case "incomplete":
      return "bg-amber-900/50 text-amber-200 border-amber-700/50";
    default:
      return "bg-orange-900/50 text-orange-200 border-orange-700/50";
  }
}

export function completenessText(label: string): string {
  switch (label) {
    case "complete":
      return "Complete data";
    case "incomplete":
      return "Incomplete data";
    default:
      return "Engineering data required";
  }
}
