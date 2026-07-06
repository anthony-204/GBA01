# GBA-0002 Engineering Theory

Reference for the client calculator (`client/v0`, `client/v1`, `client/v2`).  
Aligned with *GBA-0002 Vehicle database (2).pdf* and the prototype functionality spec.

---

## 1. Maximum allowable voltage drop (battery V − 16 V)

**Formula in the app:**

```text
maximumAllowableVoltageDropV = batteryVoltageDuringCrankingV − 16
```

**Why 16 V?**

On a typical 24 V machine (two 12 V batteries in series), the starter motor must receive enough voltage at its terminals to produce cranking torque. GBA-0002 fixes **16 V** as the minimum acceptable voltage **at the starter** during the cranking event.

The user enters **battery voltage during cranking** — the measured DC voltage at the battery / start bus while the starter is engaged. That measurement is the available source voltage for the whole starter circuit. Part of it is lost in the cable (out conductor + return conductor), and the remainder appears at the starter:

```text
V_battery ≈ V_cable_drop + V_starter
```

Rearranging for the largest cable drop that still leaves 16 V at the starter:

```text
V_cable_drop_max = V_battery_measured − 16 V
```

So the “16 V” constant is not an arbitrary deduction — it is the **minimum starter terminal voltage** from the specification (PDF line item 5). The subtraction gives the **voltage budget** available for cable loss before the starter is starved.

If `maximumAllowableVoltageDropV ≤ 0`, the measured battery voltage is already at or below the starter minimum; no cable length can fix that without improving the battery or measurement conditions.

---

## 2. Maximum one-way cable length

```text
maxLengthM = (maximumAllowableVoltageDropV × 1000) / (I_crank × 2 × R_ohm_per_km)
```

- **I_crank** — starter inrush / cranking current (MachinesOnSite column Q).
- **R** — cable resistance (Ω/km) from Cable_Capacity for the selected size.
- **× 1000** — converts km resistance to metres.
- **× 2** — current travels **out and back** (positive and return conductors); total loop resistance is doubled.

This is the one-way length that would consume the entire voltage budget from §1.

---

## 3. K-factor lookup (updated rule)

**Correct path (PDF line item 13):**

1. From the selected machine, read **cable type** (MachinesOnSite column **AD**).
2. Match that cable type in **Copper_k_factor** column **A**.
3. Read **K** from column **B**.

The K-factor is a property of the **cable insulation / conductor material**, not the machine model. The app must not guess a default K if the cable type is missing from the table.

---

## 4. Cable thermal withstand — two equivalent forms

GBA-0002 gives the adiabatic short-time form (PDF line item 14):

```text
cableThermalWithstandTimeS = (k × S / I)²
```

Pass when `cableThermalWithstandTimeS ≥ crankingTimeS` (5 s in this app).

The calculation guide (PDF §7) states the same check as **peak current capability**:

```text
cablePeakCapabilityA = k × S / √(crankingTimeS)
```

Pass when `I_crank ≤ cablePeakCapabilityA`.

**Why these are the same:**  
Let `t = (kS/I)²`. Then `√t = kS/I`, so `I = kS/√t`. The inequality `t ≥ t_required` is equivalent to `I ≤ kS/√t_required`.

A 70 mm² cable rated 314 A **continuous** does not carry 1000 A steady-state — but copper thermal mass allows a **short** cranking pulse; the K-factor model estimates how long (or how much peak current) is tolerable before insulation temperature limits are exceeded.

---

## 5. Cable continuous current

```text
existingCableCurrentRatingA ≥ alternatorContinuousCurrentA
```

Continuous alternator charge current must not exceed the cable’s continuous ampacity (MachinesOnSite AG or Cable_Capacity G for upgrades).

---

## 6. Fuse selection

```text
requiredFuseCurrentA = alternatorContinuousCurrentA × (1 + safetyFactorPercent / 100)
```

Select fuse rating where:

```text
cableRatingA ≥ fuseRatingA ≥ requiredFuseCurrentA
```

and fuse **withstand time** at starter inrush ≥ 5 s (MEGA32V / Fuse_Library), and fuse **operating temperature range** includes site temperature.

---

## 7. Design-aid disclaimer

These relationships follow standard low-voltage sizing practice but **do not replace** AS/NZS verification, manufacturer datasheets, installation derating, fault-current interrupting rating, or sign-off by a qualified engineer.
