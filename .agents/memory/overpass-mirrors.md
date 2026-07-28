---
name: Overpass API mirrors
description: Which Overpass API endpoints work from Replit and how to query efficiently
---

`overpass-api.de` returns HTTP 504 for any non-trivial query when called from the Replit environment (even with a reduced radius/feature set). `overpass.kumi.systems` is unreachable (000).

**Working mirror:** `https://maps.mail.ru/osm/tools/overpass/api/interpreter` — returns 200.

**How to apply:** In `server/routes.ts` `/api/contextual-analysis`, try mirrors in order:
1. `maps.mail.ru` (primary)
2. `overpass-api.de` (fallback)

Use `out tags` instead of `out geom` — the analysis only reads `element.tags`, so geometry is wasted bandwidth and increases timeout risk. If all mirrors fail, return `analyzeContextualData([])` as a graceful degraded response rather than a 500.
