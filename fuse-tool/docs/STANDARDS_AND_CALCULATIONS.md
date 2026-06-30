# Standards and calculations reference

Engineering basis for formulas in `@fuse-tool/engine`. This tool supports **fleet starting-circuit protection** analysis for 24 V heavy machinery (tailings dam / civil fleet context).

---

## Applicable standards (from project documentation)

| Standard | Application |
|----------|-------------|
| **AS/NZS 5000.1** | Electric cables — extruded insulation — design guidelines |
| **AS/NZS 1125** | Conductors in electric cables |
| **AS/NZS 1995:2003** | Welding cable duty cycles (reference for cranking duty) |
| **IEC / SAE** | Referenced in project Phase 2 for expanded library |

Stored in `data/constants.json` → `standards[]`.

---

## Electrical boundary conditions (24 V starting circuit)

From project presentation and `MD6250 Project` sheet assumptions:

| Condition | Typical value | Notes |
|-----------|---------------|-------|
| System voltage | 24 V | From machine record |
| Minimum battery voltage | 16.48 V | 16 V + 3% allowance |
| Cut-off voltage at starter | 16 V | Critical electronics threshold |
| Inrush current | ~2000 A, &lt; 1 s | Fuse must survive or be slow-blow |
| Cranking current | ~1000 A, &lt; 10 s | Primary sizing boundary |
| Continuous load | ~80–150 A | Alternator output after start |

---

## Cable continuous current check

**Rule:** The alternator continuous output must not exceed the cable's rated continuous current capacity.

```
I_alternator ≤ I_cable_continuous
```

**Data source:** `MachinesOnSite` columns Z (alternator) and AG (cable rating from OEM or `Cable_Capacity` table).

**Action if fail:** Increase cable size to next standard size (e.g. 70 → 95 mm²).

---

## Cable peak / adiabatic check

For short-duration cranking (&lt; 5 s), copper conductors can carry currents above continuous rating using the **adiabatic equation**:

```
I_allow = K × S / √t

Where:
  K  = material constant (A·√s/mm²) from Copper_K_Factor table
  S  = cross-sectional area (mm²)
  t  = duration (seconds)
```

**K values (copper, from `copper-k-factors.json`):**

| Insulation | K (approx.) |
|------------|-------------|
| Thermoplastic 70°C PVC | 115 |
| Thermoplastic 90°C PVC | 100 |
| Thermosetting 90°C XLPE | **143** |
| Thermosetting 60°C rubber | 141 |

**Rule:**

```
I_crank ≤ I_allow
```

**Required cranking time:**

```
t_required = max(t_measured, 5 s)
```

The 5 s floor matches Excel column Y and ensures conservative comparison for brief measured cranks.

**Validity:** Formula intended for **t ≤ 5 s**. Longer cranking returns a warning — investigate starter, battery, or mechanical fault.

---

## Voltage drop

During cranking, cable resistance causes voltage loss at the starter:

```
ΔV = I × R_total
R_total = 2 × L × (R_ohm_per_km / 1000)   [round trip]

ΔV% = (ΔV / V_crank) × 100
```

**Guideline:** Flag if ΔV% &gt; 3% (`constants.voltageDropPercentLimit`).

**Resistance:** From `cable-capacity.json` by cable size (Excel VLOOKUP on column H).

---

## Fuse continuous rating

When cable continuous check passes:

```
I_fuse_target = (1 + safety/100) × I_alternator
```

Default safety = **25%** → multiply by **1.25**.

This provides headroom above alternator full-load current without nuisance blowing under normal operation.

---

## Fuse cranking / inrush withstand

Primary method (Excel path): **MEGA32V time-current graph**

For Littelfuse MEGA 32V fuses, the library stores pre-computed withstand times at defined breaking currents. The engine:

1. Finds closest `ratingOptionA` to target
2. Reads `timeFromGraphS` for matching breaking current (= peak cranking limit, typically 1000 A)
3. Compares withstand time to `t_required`
4. Escalates to next standard fuse size if insufficient (125 → 150 → … → 500 A)

Secondary method (MATLAB / audit): **I²t**

```
I²t = I² × t

Fuse must satisfy: I²t_fuse > I_crank² × t_required
```

I²t values stored in `fuse-library.json` → `i2tA2s`.

---

## Welding cable duty cycle (reference)

Excel `WeldingCable` sheet documents AS/NZS duty cycle interpolation for cranking:

- 30% duty cycle ≈ 9 s ON / 21 s OFF
- 120 mm² welding cable ≈ 830 A for 9 s
- ~1000 A requires ~19% duty (~5 s) — aligns with 5 s minimum cranking time floor

Full welding cable path not in Phase 1 engine (uses adiabatic K×S/√t instead for installed OEM cables).

---

## Disclaimer

These calculations are **decision-support** tools. Final fuse and cable selection must consider:

- Installation method and bundling derating
- Ambient temperature (`operatingTempC` on machine record)
- Manufacturer OEM guidance
- Parallel fuse de-rating (Phase 2)
- Short-circuit coordination with battery CCA

Always document assumptions for audit (Phase 3 requirement).
