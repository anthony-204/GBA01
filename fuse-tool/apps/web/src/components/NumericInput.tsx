"use client";

import { useEffect, useState } from "react";

interface Props {
  id?: string;
  label: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  className?: string;
}

/** Controlled numeric field using text input — avoids type=number empty→0 behaviour. */
export function NumericInput({ id, label, value, onChange, className }: Props) {
  const [text, setText] = useState(() => (value === undefined ? "" : String(value)));

  useEffect(() => {
    setText(value === undefined ? "" : String(value));
  }, [value]);

  return (
    <label className={`block text-sm ${className ?? ""}`}>
      <span className="mb-1 block text-slate-400">{label}</span>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        value={text}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw !== "" && !/^-?\d*\.?\d*$/.test(raw)) return;
          setText(raw);
          if (raw === "" || raw === "-" || raw === ".") {
            onChange(undefined);
            return;
          }
          const n = Number(raw);
          if (Number.isFinite(n)) onChange(n);
        }}
        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none ring-sky-500 focus:ring-2"
      />
    </label>
  );
}
