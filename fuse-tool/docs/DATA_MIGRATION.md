# Data migration — Excel to JSON

## Source

`Resources/Tool/APP_Fuse/Fuse_GUI_APP.xlsx`

## Command

From `fuse-tool/`:

```bash
python scripts/import_from_xlsx.py
# Or explicit path:
python scripts/import_from_xlsx.py "D:/GB Engineering/Resources/Tool/APP_Fuse/Fuse_GUI_APP.xlsx"
```

Requires: `pip install openpyxl`

## Output files

| File | Source sheet | Records |
|------|--------------|---------|
| `machines.json` | MachinesOnSite | 37 machines |
| `fuse-library.json` | Fuse_Library | 9 fuse rows |
| `mega32v-curve.json` | MEGA32V | Time-current grid |
| `cable-capacity.json` | Cable_Capacity | Cable ampacity table |
| `copper-k-factors.json` | Copper_K_Factor | K constants |
| `constants.json` | User Input defaults + MD6250 | App constants |
| `bundle.json` | Combined | Used by web app |
| `meta.json` | — | Import metadata |

## Column mapping (MachinesOnSite)

| Excel column | JSON field |
|--------------|------------|
| D Model | `id`, `model` |
| C Manufcturer | `manufacturer` |
| Q Peak current cut off | `peakCurrentCutoffA` |
| T Peak continuous cranking | `peakCrankingCurrentA` |
| X Cranking time measured | `crankingTimeMeasuredS` |
| W Cranking voltage | `crankingVoltageMeasuredV` |
| Z Alternator continuous | `alternatorContinuousA` |
| AE Cable Size | `cableSizeMm2` |
| AG Continuous Current | `cableContinuousA` |
| AD Cable Type | `cableType` |
| AI Cable Length | `cableLengthM` |

Sentinel values (`TBC`, `Data Unavailable`, `Select`) → `null` at import.

## Re-import workflow

1. Engineers update Excel fleet sheet
2. Run `npm run import:data`
3. Run `npm test` to verify golden cases
4. Commit updated `data/*.json`
