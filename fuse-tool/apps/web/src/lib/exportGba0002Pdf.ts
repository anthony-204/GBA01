import { jsPDF } from "jspdf";
import type { Gba0002Result } from "@fuse-tool/engine";

function dash(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

function fmtAmps(a: number | null | undefined): string {
  if (a == null) return "—";
  return `${a} A`;
}

function fmtLength(m: number | null | undefined): string {
  if (m == null) return "—";
  return `${m} m`;
}

function fmtTemp(c: string | number | null | undefined): string {
  if (c == null || c === "—") return "—";
  const s = String(c);
  if (s.includes("°C")) return s;
  if (/^-?\d+(\.\d+)?$/.test(s.trim())) return `${s} °C`;
  return s;
}

/**
 * Download a PDF summary of the latest GBA-0002 calculation result.
 */
export function exportGba0002Pdf(result: Gba0002Result, appVersion: string): void {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 14;
  const pageWidth = doc.internal.pageSize.getWidth();
  const maxWidth = pageWidth - margin * 2;
  let y = margin;

  const now = new Date();
  const dateStr = now.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
  const timeStr = now.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const ensureSpace = (neededMm: number) => {
    if (y + neededMm > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const heading = (text: string) => {
    ensureSpace(10);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(text, margin, y);
    y += 7;
  };

  const line = (label: string, value: string) => {
    ensureSpace(7);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(`${label}:`, margin, y);
    doc.setFont("helvetica", "normal");
    const labelWidth = doc.getTextWidth(`${label}: `);
    const lines = doc.splitTextToSize(value, maxWidth - labelWidth);
    doc.text(lines, margin + labelWidth, y);
    y += Math.max(6, lines.length * 5);
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("GB Auto Fuse & Cable Tool", margin, y);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Report generated: ${dateStr}  ${timeStr}`, margin, y);
  y += 5;
  doc.text(`App version: ${appVersion}`, margin, y);
  y += 8;

  heading("User inputs");
  line("Safety factor", `${result.inputs.safetyFactorPercent}%`);
  line("Machine make / model", dash(result.modelId));
  line("Manufacturer", dash(result.manufacturer));
  line("Battery voltage during cranking", `${result.inputs.batteryVoltageDuringCrankingV} V`);
  line("Operating temperature", `${result.inputs.operatingTempC} °C`);
  if (result.derived.starterCrankingCurrentOverridden) {
    line(
      "Column Q (manual override)",
      fmtAmps(result.derived.starterCrankingCurrentA),
    );
    line("Column Q (database)", fmtAmps(result.derived.databasePeakCurrentCutoffA));
  } else {
    line("Column Q (database)", fmtAmps(result.derived.starterCrankingCurrentA));
  }

  y += 2;
  heading("Result");
  line("Status", result.statusLabel);
  line("Summary", result.summary);

  y += 2;
  heading("Cable & fuse outputs");
  line("Cable type and size", dash(result.cable.message));
  line("Cable current rating", fmtAmps(result.cable.cableCurrentRatingA));
  line("Max one-way cable length", fmtLength(result.cable.maxAllowableOneWayLengthM));
  line("Cable operating temperature", fmtTemp(result.cable.operatingTempRangeC));
  line("Suggested fuse size", fmtAmps(result.fuse.suggestedFuseSizeA));
  line(
    "Fuse make and part number",
    [result.fuse.fuseMakeModel, result.fuse.fusePartNumber].filter(Boolean).join(" · ") || "—",
  );
  line("Fuse operating temperature", fmtTemp(result.fuse.fuseOperatingTempC));

  y += 2;
  heading("Derived details");
  line("Design cranking current Q", fmtAmps(result.derived.starterCrankingCurrentA));
  line("Measured cranking current T", fmtAmps(result.derived.measuredStarterCrankingA));
  line(
    "Measured cranking time X",
    result.derived.measuredCrankingTimeS == null
      ? "—"
      : `${result.derived.measuredCrankingTimeS} s`,
  );
  line("Alternator continuous current", fmtAmps(result.derived.alternatorContinuousA));
  line("Cable type (site)", dash(result.derived.cableTypePresent));
  line(
    "Cable size",
    result.derived.existingCableSizeMm2 == null
      ? "—"
      : `${result.derived.existingCableSizeMm2} mm²`,
  );
  line("K-factor", dash(result.derived.kFactor));
  line(
    "Cable resistance",
    result.derived.cableResistanceOhmPerKm == null
      ? "—"
      : `${result.derived.cableResistanceOhmPerKm} Ω/km`,
  );
  line("Max allowable voltage drop", `${result.derived.maxAllowableVoltageDropV} V`);
  line(
    "Thermal withstand time",
    result.cable.cableThermalWithstandTimeS == null
      ? "—"
      : `${result.cable.cableThermalWithstandTimeS} s`,
  );
  line("Required fuse current", fmtAmps(result.derived.requiredFuseCurrentA));

  const safeModel = result.modelId.replace(/[^\w.-]+/g, "_").slice(0, 40);
  const stamp = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
  doc.save(`GBA0002_${safeModel}_${stamp}.pdf`);
}
