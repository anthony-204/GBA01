/** Legacy implementation notes — separated for calculate.ts */
export const IMPLEMENTATION_FIXES: string[] = [
  "Cable peak formula uses cranking time, not Excel G13 (=15/1000 s).",
  "Cable peak compares I_crank to capability, not cutoff current (G12 vs G30 bug).",
  "Battery check compares cranking voltage to min battery voltage (G19 bug fixed).",
  "Machine fields use full MachinesOnSite columns, not MATLAB A:X truncate.",
  "K-factor from Copper_K_Factor lookup unless manually overridden.",
  "Fuse selection uses MEGA32V graph with iterative escalation.",
  "Incomplete library vehicles are blocked from full recommendations (V2).",
  "Defaults (limits, K-factor) documented in derived.assumptionsUsed.",
];
