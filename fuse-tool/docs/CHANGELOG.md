# Changelog -- GBA-0002 Client Tool

## Version 1.3 -- 22/07/2026

- Added GB Auto logo.
- Mandatory design-aid disclaimer checkbox before calculation.
- Client handover documentation and project cleanup.

## Version 1.2 -- 14/07/2026

- Export calculation result as PDF (date/time, inputs, outputs, derived details).
- Manual entry for column Q after a non-PASS result.
- Field-use UI with traffic-light status, result cards, and detailed checks.
- PDF label/value layout uses a fixed column to prevent text overlap.

## Version 1.1 -- 08/07/2026

- Switched sizing current from column T to column Q.
- Checks: battery voltage vs 16 V, measured T vs Q, measured cranking time vs 5 s.
- Database patch: 16 V cutoff default and derived Q where missing.
- Fixed cable upgrade using Cable_Capacity k-factor on each row.
- Manufacturer shown in results; output labels include units.

## Version 1.0 -- June 2026

- Initial prototype with 9 machines hardcoded, 4 user inputs, cable and fuse sizing from MachinesOnSite and library tables.
