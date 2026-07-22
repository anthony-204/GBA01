# GB Auto -- Fuse & Cable Protection Tool

Client handover package for the **GBA-0002 Fuse & Cable Protection Tool** (field-use web calculator).

This repository contains the calculation engine, fleet data, and web application used to check starter-circuit cable and fuse sizing against the GBA-0002 specification.

## What you receive

| Item | Location |
|------|----------|
| Web application (Next.js) | `fuse-tool/apps/web/` |
| Calculation engine | `fuse-tool/packages/engine/` |
| Fleet and library data | `fuse-tool/data/` |
| Client documentation | `fuse-tool/docs/` |
| Source Excel workbook | `Resources/Tool/Fuse_GUI_APP.xlsx` |

**Current client app version:** 1.2.0 (see `fuse-tool/docs/CHANGELOG.md`).

## Prerequisites (any computer)

Install these once on the machine that will run the tool:

1. **Node.js 20 LTS** (minimum 18)  
   Download from [https://nodejs.org](https://nodejs.org) and run the installer.  
   Confirm in a terminal:

   ```bash
   node -v
   npm -v
   ```

2. **Python 3.10+** (optional -- only needed if you re-import data from Excel)

   ```bash
   python --version
   pip install openpyxl
   ```

## Run the application locally

Open a terminal (Command Prompt, PowerShell, or Terminal) in the project folder.

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

Then open a browser at **http://localhost:3000**.

You should see the **GB Auto Fuse & Cable Protection Tool** with machine inputs and a **Calculate Recommendation** button. You must tick the design-aid disclaimer checkbox before calculating.

### Stop the local server

Press `Ctrl+C` in the terminal.

## Production build (local or server)

To build and run the optimised production version on the same machine:

```bash
cd fuse-tool
npm install
npm run patch:machines-v1.1
npm run build
npm run start -w @fuse-tool/web
```

Open **http://localhost:3000** (default port 3000).

## Run tests (optional)

```bash
cd fuse-tool
npm install
npm test --workspace=@fuse-tool/engine -- gba0002
```

## Deploy to the web (Vercel)

See **`fuse-tool/docs/DEPLOY_VERCEL.md`** for hosting the static Next.js app on Vercel. No API keys or database are required -- calculations run entirely in the browser.

## Project layout

```
GB Engineering/
├── README.md                 <- this file (handover guide)
├── fuse-tool/                <- application monorepo
│   ├── apps/web/             <- web UI
│   ├── packages/engine/      <- calculation engine + tests
│   ├── data/bundle.json      <- fleet / library data (embedded at build)
│   └── docs/                 <- specifications, changelog, deploy notes
├── Resources/Tool/           <- authoritative Excel workbook
└── docs/                     <- project-level notes
```

## Key documentation

| Document | Purpose |
|----------|---------|
| `fuse-tool/docs/CLIENT_V1.md` | Client prototype overview |
| `fuse-tool/docs/CHANGELOG.md` | App version history |
| `fuse-tool/docs/V0_CALCULATIONS.md` | Formula reference |
| `fuse-tool/docs/DATA_REPORT.md` | Data inventory and quality notes |
| `fuse-tool/docs/GBA0002_SPEC_CLARIFICATION_MEMO.md` | Open specification questions |

## Updating fleet data from Excel (optional)

If the MachinesOnSite workbook is updated:

```bash
cd fuse-tool
pip install openpyxl
npm run import:data
npm run patch:machines-v1.1
npm run build
```

Then restart the web app (`npm run dev` or redeploy).

## Disclaimer

All outputs from this tool are **design aids only**. Final cable and fuse selections must be reviewed against applicable standards, manufacturer datasheets, site requirements and **approved by a qualified engineer** before implementation. The web app requires users to confirm this before running a calculation.

## Support files in repo root

| File | Purpose |
|------|---------|
| `REDEPLOY_VERCEL_BRANCH.bat` | Trigger a Vercel redeploy for the `v1_nat` branch |
| `REDEPLOY_V1_TESTING.bat` | Trigger a Vercel redeploy for the `v1_testing` branch |

These are optional deployment helpers for maintainers. They are not required to run the app locally.
