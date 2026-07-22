# Fuse Tool -- GB Auto Fuse & Cable Protection

**GBA-0002 client web calculator** (app v1.2).

For full handover instructions (install, run, build, deploy), see the **[repository README](../README.md)**.

## Quick start

```bash
cd fuse-tool
npm install
npm run patch:machines-v1.1
npm run build
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Client documentation

- [CLIENT_V1.md](./docs/CLIENT_V1.md) -- prototype overview
- [CHANGELOG.md](./docs/CHANGELOG.md) -- version history
- [V0_CALCULATIONS.md](./docs/V0_CALCULATIONS.md) -- formulas
- [DATA_REPORT.md](./docs/DATA_REPORT.md) -- data inventory
- [DEPLOY_VERCEL.md](./docs/DEPLOY_VERCEL.md) -- web hosting

## Project structure

```
fuse-tool/
├── apps/web/              # Next.js field UI
├── packages/engine/       # @fuse-tool/engine -- calculations + tests
├── data/                  # JSON fleet / library data
├── scripts/               # Excel import and data patch scripts
└── docs/                  # Specifications and handover notes
```

## Disclaimer

This tool is a **design aid**. Outputs depend on imported fleet data and documented assumptions. Final fuse and cable selections require engineering approval before installation.
