# Performance — progression de la migration

Ratio p95 version courante / baseline (1 = identique, < 1 = plus rapide).

| Scénario | `d5e31b3` | `d354ae2` |
|---|---|---|
| P-EMP | 1.00 | 1.04 |
| P-MGR | 0.99 | 0.90 |
| P-HR | 1.01 | 0.83 |
| P-USERS | 0.97 | 0.99 |
| P-CREATE | 0.98 | 0.97 |
| P-OCR | 1.02 | 0.98 |
| P-MIX | 1.01 | 1.03 |
| P-LOGIN | 0.97 | 0.99 |

```mermaid
xychart-beta
  title "P-EMP"
  x-axis ["d5e31b3", "d354ae2"]
  y-axis "ratio p95" 0 --> 2
  line [1.005, 1.044]
```

```mermaid
xychart-beta
  title "P-MGR"
  x-axis ["d5e31b3", "d354ae2"]
  y-axis "ratio p95" 0 --> 2
  line [0.988, 0.895]
```

```mermaid
xychart-beta
  title "P-HR"
  x-axis ["d5e31b3", "d354ae2"]
  y-axis "ratio p95" 0 --> 2
  line [1.011, 0.833]
```

```mermaid
xychart-beta
  title "P-USERS"
  x-axis ["d5e31b3", "d354ae2"]
  y-axis "ratio p95" 0 --> 2
  line [0.97, 0.987]
```

```mermaid
xychart-beta
  title "P-CREATE"
  x-axis ["d5e31b3", "d354ae2"]
  y-axis "ratio p95" 0 --> 2
  line [0.976, 0.966]
```

```mermaid
xychart-beta
  title "P-OCR"
  x-axis ["d5e31b3", "d354ae2"]
  y-axis "ratio p95" 0 --> 2
  line [1.021, 0.98]
```

```mermaid
xychart-beta
  title "P-MIX"
  x-axis ["d5e31b3", "d354ae2"]
  y-axis "ratio p95" 0 --> 2
  line [1.012, 1.034]
```

```mermaid
xychart-beta
  title "P-LOGIN"
  x-axis ["d5e31b3", "d354ae2"]
  y-axis "ratio p95" 0 --> 2
  line [0.967, 0.993]
```
