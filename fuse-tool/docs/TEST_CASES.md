# GBA Prototype Test Cases

| # | Case | Input | Expected |
|---|------|-------|----------|
| 1 | Valid machine | B45E, 25%, 20 V, 60 °C | PASS, fuse selected |
| 2 | Battery too low | battery = 15 V | FAIL, no confident recommendation |
| 3 | Negative voltage | battery = −1 V | FAIL |
| 4 | Missing machine | unknown id | DATA MISSING |

Run: `npm test --workspace=@fuse-tool/engine -- gba0002`
