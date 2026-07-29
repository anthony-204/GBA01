# GB Auto: Fuse & Cable Protection Tool

Client package for the **GBA Fuse & Cable Protection Tool** (field-use web calculator).

The project contains the calculation engine, fleet data, and web application used to check starter-circuit cable and fuse sizing against the GBA specification.

**Current app version:** 1.3.0 (see `fuse-tool/docs/CHANGELOG.md`).

## What is included

| Item | Location |
|------|----------|
| Web application | `fuse-tool/apps/web/` |
| Calculation engine | `fuse-tool/packages/engine/` |
| Fleet and library data | `fuse-tool/data/` |
| Documentation | `fuse-tool/docs/` |
| Source Excel workbook | `Resources/Tool/Fuse_GUI_APP.xlsx` |

## Prerequisites

Install once on the computer that will run the tool:

1. **Node.js 20 LTS** (minimum 18) from [https://nodejs.org](https://nodejs.org)

   ```bash
   node -v
   npm -v
   ```

2. **Python 3.10+** (optional, only needed when re-importing data from Excel)

   ```bash
   python --version
   pip install openpyxl
   ```

## Run the application

Open a terminal in the project folder.

### Windows

```powershell
cd fuse-tool
npm install
npm run patch:machines-v1.1
npm run build
npm run dev
```

### macOS / Linux

```bash
cd fuse-tool
npm install
npm run patch:machines-v1.1
npm run build
npm run dev
```

Open a browser at **http://localhost:3000**.

Tick the **design-aid disclaimer** checkbox, enter the machine details, then click **Calculate Recommendation**. Use **Export PDF** to save a report if needed.

Press `Ctrl+C` in the terminal to stop the server.

## Production build on one computer

```bash
cd fuse-tool
npm install
npm run patch:machines-v1.1
npm run build
npm run start -w @fuse-tool/web
```

Open **http://localhost:3000**.

## Run tests

```bash
cd fuse-tool
npm install
npm test --workspace=@fuse-tool/engine -- gba0002
```

## Project layout

```
GB Engineering/
├── README.md
├── fuse-tool/
│   ├── apps/web/           # web UI
│   ├── packages/engine/    # calculation engine + tests
│   ├── data/               # JSON fleet and library tables
│   ├── scripts/            # Excel import and data patch
│   └── docs/               # changelog, calculations, test notes
└── Resources/Tool/         # original Excel workbook
```

## Documentation

| File | Purpose |
|------|---------|
| `fuse-tool/docs/CHANGELOG.md` | Version history |
| `fuse-tool/docs/CALCULATIONS.md` | Formula and logic reference |
| `fuse-tool/docs/TEST_CASES.md` | Example test cases |

## Updating fleet data from Excel

If `Fuse_GUI_APP.xlsx` is updated:

```bash
cd fuse-tool
pip install openpyxl
npm run import:data
npm run patch:machines-v1.1
npm run build
```

Restart the web app after rebuilding.

## Disclaimer

All outputs are **design aids only**. Final cable and fuse selections must be reviewed against applicable standards, manufacturer datasheets, site requirements and approved by a qualified engineer before implementation.
