# Changelog — GBA-0002 Client Tool

## Version 1.2 — 14/07/2026

- Export calculation result as PDF (date/time, inputs, outputs, derived details).
- Optional manual entry for column Q (peak current cut-off) to override the database value for sizing — shown only after a non-PASS result.
- Field-use UI: traffic-light status, cable/fuse result cards, detailed checks, expandable explanations, disclaimer.
- PDF label/value layout uses a fixed column so text no longer overlaps.

## Version 1.1 — 14/07/2026

- Switched "Peak continuous current during cranking (A)" (column T) to theoretical "Peak current cut off(A) from power and efficiency calculation" (column Q).
- Version 1.1 now checks: battery voltage vs 16 V minimum, measured cranking (T) vs limit (Q), measured cranking time (X) vs 5 s.
- Database: 16 V cutoff assumed for blank data points and column Q derived from power and efficiency where missing.
- Fixed cable upgrade (Condition 2) using Cable_Capacity k-factor on each row.
- Results now show the manufacturer and output labels include also units.

## Version 1.0 — June 2026

- Initial prototype with 9 machines hardcoded. Includes 4 user inputs. Cable and fuse sizing from MachinesOnSite and library tables.
