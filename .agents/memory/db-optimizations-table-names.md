---
name: DB optimizations stale table names
description: Correct table/column names for database-optimizations.ts vs what was originally coded
---

`server/database-optimizations.ts` was written with table names that don't match `shared/schema.ts`. The corrections:

| Wrong name | Correct name | Notes |
|---|---|---|
| `activities` | `activity` | pgTable("activity") — has session_id, type, created_at |
| `tracking_points` | `spatial_points` | pgTable("spatial_points") — timestamp col is `created_at`, not `timestamp` |
| `ST_Point(...)` GIST index | removed | PostGIS is not installed on the Neon database; GIST/ST_Point fails with 42883 |

**Why:** Task agents added index/query code referencing non-existent table names without cross-checking the schema.

**How to apply:** Any new index or raw SQL in database-optimizations.ts must be verified against `shared/schema.ts` pgTable definitions before committing.
