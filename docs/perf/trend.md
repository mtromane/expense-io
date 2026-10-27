# Performance — progression de la migration

Ratio p95 version courante / baseline (1 = identique, < 1 = plus rapide).

| Scénario | `d5e31b3` | `d354ae2` | `6bebb01` |
|---|---|---|---|
| P-EMP | 1.00 | 1.04 | 0.78 |
| P-MGR | 0.99 | 0.90 | 0.63 |
| P-HR | 1.01 | 0.83 | 0.18 |
| P-USERS | 0.97 | 0.99 | 0.97 |
| P-CREATE | 0.98 | 0.97 | 1.02 |
| P-OCR | 1.02 | 0.98 | 0.03 |
| P-MIX | 1.01 | 1.03 | 0.51 |
| P-LOGIN | 0.97 | 0.99 | 1.00 |

```mermaid
xychart-beta
  title "P-EMP"
  x-axis ["d5e31b3", "d354ae2", "6bebb01"]
  y-axis "ratio p95" 0 --> 2
  line [1.005, 1.044, 0.776]
```

```mermaid
xychart-beta
  title "P-MGR"
  x-axis ["d5e31b3", "d354ae2", "6bebb01"]
  y-axis "ratio p95" 0 --> 2
  line [0.988, 0.895, 0.63]
```

```mermaid
xychart-beta
  title "P-HR"
  x-axis ["d5e31b3", "d354ae2", "6bebb01"]
  y-axis "ratio p95" 0 --> 2
  line [1.011, 0.833, 0.176]
```

```mermaid
xychart-beta
  title "P-USERS"
  x-axis ["d5e31b3", "d354ae2", "6bebb01"]
  y-axis "ratio p95" 0 --> 2
  line [0.97, 0.987, 0.969]
```

```mermaid
xychart-beta
  title "P-CREATE"
  x-axis ["d5e31b3", "d354ae2", "6bebb01"]
  y-axis "ratio p95" 0 --> 2
  line [0.976, 0.966, 1.02]
```

```mermaid
xychart-beta
  title "P-OCR"
  x-axis ["d5e31b3", "d354ae2", "6bebb01"]
  y-axis "ratio p95" 0 --> 2
  line [1.021, 0.98, 0.033]
```

```mermaid
xychart-beta
  title "P-MIX"
  x-axis ["d5e31b3", "d354ae2", "6bebb01"]
  y-axis "ratio p95" 0 --> 2
  line [1.012, 1.034, 0.51]
```

```mermaid
xychart-beta
  title "P-LOGIN"
  x-axis ["d5e31b3", "d354ae2", "6bebb01"]
  y-axis "ratio p95" 0 --> 2
  line [0.967, 0.993, 1.001]
```
