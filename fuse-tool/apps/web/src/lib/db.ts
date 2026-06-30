/**
 * Load fleet database bundled from Excel import.
 * Regenerate via: npm run import:data (from fuse-tool root)
 */

import type { FuseToolDatabase } from "@fuse-tool/engine";
import bundle from "../../../../data/bundle.json";

let cached: FuseToolDatabase | null = null;

export function getDatabase(): FuseToolDatabase {
  if (!cached) {
    cached = bundle as FuseToolDatabase;
  }
  return cached;
}
