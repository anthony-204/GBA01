/**
 * Build PDF-required output block (GBA-0002).
 */

import type { CheckResult, CheckStatus, FuseRecommendation, PdfCableFuseOutputs } from "./types.js";

export interface OutputBuildContext {
  cableType: string | null;
  cableSizeMm2: number | null;
  cableContinuousA: number | null;
  cableLengthM: number | null;
  operatingTempC: number | null;
  fuse: FuseRecommendation;
  checks: CheckResult[];
}

function worstOf(ids: string[], checks: CheckResult[]): CheckStatus {
  const subset = checks.filter((c) => ids.includes(c.id));
  const order: CheckStatus[] = ["fail", "invalid", "warning", "unavailable", "pass"];
  for (const s of order) {
    if (subset.some((c) => c.status === s)) return s;
  }
  return "unavailable";
}

export function buildPdfOutputs(ctx: OutputBuildContext): PdfCableFuseOutputs {
  const fuse = ctx.fuse.selectedFuse;
  const fuseMakeModel = fuse
    ? [fuse.manufacturer, fuse.description, fuse.manufacturerPartNumber]
        .filter(Boolean)
        .join(" · ")
    : null;

  const cableIds = ["cable-continuous", "cable-peak", "voltage-drop"];
  const fuseIds = ["fuse-rating", "fuse-withstand", "fuse-i2t", "fuse-protects-cable", "fuse-gb-part"];

  return {
    cableType: ctx.cableType,
    cableSizeMm2: ctx.cableSizeMm2,
    cableCurrentRatingA: ctx.cableContinuousA,
    cableLengthMm: ctx.cableLengthM !== null ? Math.round(ctx.cableLengthM * 1000) : null,
    cableOperatingTempC: ctx.operatingTempC,
    suggestedFuseSizeA: ctx.fuse.selectedRatingA,
    fuseMakeModel,
    fuseOperatingTempC: fuse?.temperatureRangeC ?? null,
    cableSuitabilityStatus: worstOf(cableIds, ctx.checks),
    fuseSuitabilityStatus: worstOf(fuseIds, ctx.checks),
  };
}
