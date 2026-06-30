# Usage guide

## For field technicians (web app)

1. Open the app (local: `npm run dev` → http://localhost:3000)
2. Search or select **machine model** (e.g. B45E, D10T)
3. Adjust **fuse safety factor** if instructed (default 25%)
4. Review **Summary** and coloured check cards:
   - **Green (Pass)** — condition met
   - **Red (Fail)** — action required
   - **Amber (Warning)** — review with engineer
   - **Yellow (Unavailable)** — missing fleet data
5. Expand **Specification** on any card for the formula used
6. Note **GB Part #** and recommended fuse rating (A)
7. **Verify on site** before installation

## For developers

### Run tests

```bash
cd fuse-tool
npm test
```

### Use engine in code

```typescript
import { recommend, loadDatabase } from "@fuse-tool/engine";
import bundle from "../data/bundle.json";

const db = loadDatabase(bundle as FuseToolDatabase);
const result = recommend(db, { modelId: "B45E" });
```

### Regenerate data after Excel update

```bash
npm run import:data
npm test
```

### Project scripts

| Script | Description |
|--------|-------------|
| `npm run import:data` | Excel → JSON |
| `npm test` | Vitest unit tests |
| `npm run dev` | Next.js dev server |
| `npm run build` | Build engine + web |

## For engineers validating results

1. Compare engine output to Excel **User Input column G** for same model
2. Expect **differences** where legacy bugs were fixed (see LEGACY_BUGS_FIXED.md)
3. Sign off golden test models in `recommend.test.ts`
4. Document any formula changes in CALCULATION_SPEC.md before Phase 2
