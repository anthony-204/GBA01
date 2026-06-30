/**
 * @fuse-tool/engine — Fleet fuse & cable protection calculator (Phase 1)
 *
 * Pure TypeScript calculation engine. No UI dependencies.
 * See docs/CALCULATION_SPEC.md for rules and legacy Excel traceability.
 */

export * from "./types.js";
export * from "./parseValue.js";
export * from "./lookups.js";
export * from "./cableChecks.js";
export * from "./fuseSelection.js";
export {
  recommend,
  listModelIds,
  loadDatabase,
  IMPLEMENTATION_FIXES,
} from "./recommend.js";
