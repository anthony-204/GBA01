# Changelog — GBA-0002 Client Tool

## Version 1.1 — 14/07/2026

- **Sizing current:** Client confirmed column **Q** (`peakCurrentCutoffA`) for cable thermal, max length, and fuse withstand (replaces column T).
- **Version 1.1 checks (spec):**
  - Battery voltage during cranking &lt; 16 V → fail with prescribed message.
  - Measured cranking **T** &gt; design limit **Q** → starter motor review message.
  - Measured cranking time **X** &gt; 5 s → cranking time review message.
- **Database:** `cutoffVoltageV = 16 V` where blank; **Q** derived from power/efficiency where `#VALUE!` or missing (`npm run patch:machines-v1.1`).
- **Fix:** Cable upgrade (PDF Condition 2) uses `kFactor` on each Cable_Capacity row (was incorrectly looking up "Two Single Core" in Copper_K_Factor).
- **UI:** Manufacturer (column C) in results; units on outputs; in-app changelog; app version 1.1.0.
- **Machine list:** Removed legacy hardcoded allow-list; UI now shows all machines that pass v1.1 calculation prerequisites.
- **Branch:** `client/v0` renamed to **`client/v1`**; prior `client/v1` → `client/old1`, `client/v2` → `client/old2`.

## Version 1.0 — June 2026

- Initial prototype on `client/v0`: nine machines, four user inputs, GBA-0002 cable/fuse path.
- Used column T for cranking current (superseded in 1.1).
