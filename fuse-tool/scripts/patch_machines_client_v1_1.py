#!/usr/bin/env python3
"""
Patch MachinesOnSite JSON for client v1.1:
- cutoffVoltageV = 16 V where blank
- peakCurrentCutoffA (Q) derived from power/efficiency/cutoff when missing or #VALUE!
"""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
DEFAULT_CUTOFF_V = 16.0


def derive_q(power_kw: object, efficiency_pct: object, cutoff_v: float) -> int | None:
    try:
        p = float(power_kw)
        eff = float(efficiency_pct) / 100.0
        if p <= 0 or eff <= 0 or cutoff_v <= 0:
            return None
        return round(p * 1000 / (eff * cutoff_v))
    except (TypeError, ValueError):
        return None


def q_needs_fix(value: object) -> bool:
    if value is None:
        return True
    if isinstance(value, str):
        s = value.strip()
        if s in ("", "#VALUE!", "#N/A", "0"):
            return True
        try:
            return float(s) <= 0
        except ValueError:
            return True
    try:
        return float(value) <= 0
    except (TypeError, ValueError):
        return True


def patch_machine(m: dict) -> dict:
    out = dict(m)
    cutoff = out.get("cutoffVoltageV")
    try:
        cutoff_f = float(cutoff) if cutoff not in (None, "") else DEFAULT_CUTOFF_V
    except (TypeError, ValueError):
        cutoff_f = DEFAULT_CUTOFF_V
    if cutoff in (None, ""):
        out["cutoffVoltageV"] = DEFAULT_CUTOFF_V

    if q_needs_fix(out.get("peakCurrentCutoffA")):
        derived = derive_q(out.get("powerAtCutoffKw"), out.get("efficiencyPercent"), cutoff_f)
        if derived is not None:
            out["peakCurrentCutoffA"] = derived

    if out.get("electricalSystemV") in (None, ""):
        out["electricalSystemV"] = 24

    return out


def main() -> None:
    machines_path = DATA / "machines.json"
    bundle_path = DATA / "bundle.json"
    machines = json.loads(machines_path.read_text(encoding="utf-8"))
    patched = [patch_machine(m) for m in machines]
    machines_path.write_text(json.dumps(patched, indent=2) + "\n", encoding="utf-8")

    bundle = json.loads(bundle_path.read_text(encoding="utf-8"))
    bundle["machines"] = patched
    bundle_path.write_text(json.dumps(bundle, indent=2) + "\n", encoding="utf-8")

    fixed_q = sum(1 for o, n in zip(machines, patched) if o.get("peakCurrentCutoffA") != n.get("peakCurrentCutoffA"))
    fixed_v = sum(
        1 for o, n in zip(machines, patched) if o.get("cutoffVoltageV") in (None, "") and n.get("cutoffVoltageV") == 16
    )
    print(f"Patched {len(patched)} machines: Q derived/fixed={fixed_q}, cutoffV set to 16={fixed_v}")


if __name__ == "__main__":
    main()
