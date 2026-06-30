# Legacy bugs fixed in Phase 1 engine

Register of known issues in `Fuse_GUI_APP.xlsx` and `fuse_matlab_code_extract` corrected in `@fuse-tool/engine`.

## Excel bugs

| ID | Location | Problem | Fix in engine |
|----|----------|---------|---------------|
| EX-01 | G13 | `=15/1000` (0.015 s) used in `SQRT(G13)` for cable peak | Use `max(crankingTimeMeasuredS, 5)` |
| EX-02 | G31 | Compares G12 (1000 A cutoff) to G30 (capability ~85 kA) | Compare `peakCrankingCurrentA` to capability |
| EX-03 | G19 | `IF(G16<G8)` compares manufacturer string to voltage | Compare `crankingVoltageMeasuredV` to `minBatteryVoltageV` |
| EX-04 | Headers | Typos: Manufcturer, Cranking Voltge, StandardComplaince | Normalized at import (`import_from_xlsx.py`) |
| EX-05 | Structure | 16 sheets, triplicate UI columns E/J/O | Single code path; one JSON schema |
| EX-06 | — | No automated tests | Vitest golden tests |

## MATLAB bugs

| ID | Location | Problem | Fix in engine |
|----|----------|---------|---------------|
| ML-01 | read range A2:X2 | Cable/alternator in Z, AE, AG not loaded | Full machine JSON export |
| ML-02 | Column name | `Starter Motor Peak Current (A)` missing | Mapped to `peakCrankingCurrentA` (col T) |
| ML-03 | K factor | Hard-coded 143 | Lookup `copper-k-factors.json` |
| ML-04 | Fuse match | I²t only | Primary: MEGA32V graph + escalation |
| ML-05 | Scope | 5 output rows | Full check list with audit fields |

## Intentional differences

- **Parallel fuse logic** (Excel G55–G57): deferred to Phase 2
- **Manual entry mode** (columns J/L): deferred to Phase 2
- **Temperature fuse de-rating** (G53): deferred — constant placeholder in Excel
