import type { ReactNode } from "react";

export function ExplanationDropdown({
  summary,
  children,
}: {
  summary: string;
  children: ReactNode;
}) {
  return (
    <details style={{ marginTop: 6, fontSize: 13, color: "#444" }}>
      <summary style={{ cursor: "pointer", color: "#1565c0", userSelect: "none" }}>{summary}</summary>
      <div style={{ marginTop: 6, lineHeight: 1.45 }}>{children}</div>
    </details>
  );
}
