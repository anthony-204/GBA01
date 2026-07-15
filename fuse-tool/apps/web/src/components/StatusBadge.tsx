import type { CSSProperties, ReactNode } from "react";

export type UiStatusTone = "pass" | "fail" | "warning" | "neutral";

const TONE_STYLES: Record<
  UiStatusTone,
  { bg: string; border: string; text: string; badgeBg: string; badgeText: string }
> = {
  pass: {
    bg: "#c8e6c9",
    border: "#1b5e20",
    text: "#0d3b12",
    badgeBg: "#1b5e20",
    badgeText: "#fff",
  },
  fail: {
    bg: "#ef9a9a",
    border: "#b71c1c",
    text: "#7f0000",
    badgeBg: "#b71c1c",
    badgeText: "#fff",
  },
  warning: {
    bg: "#ffe082",
    border: "#f57f17",
    text: "#e65100",
    badgeBg: "#f9a825",
    badgeText: "#111",
  },
  neutral: {
    bg: "#e0e0e0",
    border: "#616161",
    text: "#212121",
    badgeBg: "#757575",
    badgeText: "#fff",
  },
};

export function statusToneFromLabel(label: string | null | undefined): UiStatusTone {
  const s = (label ?? "").toUpperCase();
  if (s === "PASS") return "pass";
  if (s === "FAIL" || s.includes("INVALID") || s.includes("NO MATCH")) return "fail";
  if (
    s.includes("WARNING") ||
    s.includes("MISSING") ||
    s.includes("ENGINEERING") ||
    s.includes("REVIEW")
  ) {
    return "warning";
  }
  return "neutral";
}

export function StatusBadge({
  label,
  tone,
  large = false,
}: {
  label: string;
  tone?: UiStatusTone;
  large?: boolean;
}) {
  const resolved = tone ?? statusToneFromLabel(label);
  const colors = TONE_STYLES[resolved];
  const style: CSSProperties = {
    display: "inline-block",
    padding: large ? "8px 14px" : "4px 10px",
    borderRadius: 4,
    background: colors.badgeBg,
    color: colors.badgeText,
    fontWeight: 700,
    fontSize: large ? 18 : 13,
    letterSpacing: 0.4,
    lineHeight: 1.2,
  };
  return <span style={style}>{label}</span>;
}

export function StatusPanel({
  tone,
  children,
  style,
}: {
  tone: UiStatusTone;
  children: ReactNode;
  style?: CSSProperties;
}) {
  const colors = TONE_STYLES[tone];
  return (
    <div
      style={{
        border: `2px solid ${colors.border}`,
        background: colors.bg,
        color: colors.text,
        padding: 14,
        borderRadius: 4,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export { TONE_STYLES };
