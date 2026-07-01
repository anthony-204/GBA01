/**
 * @fuse-tool/engine — Fleet fuse & cable protection calculator
 * Version 2: library completeness gate, manual entry, PDF outputs.
 */

export * from "./types.js";
export * from "./parseValue.js";
export * from "./lookups.js";
export * from "./cableChecks.js";
export * from "./fuseSelection.js";
export * from "./completeness.js";
export * from "./validation.js";
export * from "./fieldLabels.js";
export * from "./outputs.js";
export {
  calculate,
  recommend,
  IMPLEMENTATION_FIXES,
} from "./calculate.js";
export {
  DEFAULT_MANUAL_PRESET,
  EXCEL_MANUAL_PRESET,
  MANUAL_ENTRY_PRESETS,
  EXCEL_MANUAL_EXPECTED,
  getManualEntryPreset,
  type ManualEntryPresetId,
  type ManualEntryPreset,
} from "./manualEntryPresets.js";
export { listModelIds, loadDatabase } from "./catalog.js";
