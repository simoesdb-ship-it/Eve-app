/**
 * Integration tests: calculateStatsOptimized() accuracy
 *
 * Guards against the Cartesian cross-join regression where a FULL OUTER JOIN
 * across pattern_suggestions × votes × locations × spatial_points would
 * return inflated counts.  The rewritten version uses independent subquery
 * COUNTs; these tests verify that the returned numbers exactly match what
 * direct COUNT(*) queries return on each table.
 *
 * Two branches are covered:
 *   1. Global (no sessionId)  — counts must equal independent table COUNTs.
 *   2. Per-session (sessionId) — counts must equal what was seeded for that
 *      specific session, and must not bleed in rows from other sessions.
 *
 * Seeding uses the drizzle Pool driver (server/db) which properly returns
 * RETURNING results; COUNT verification uses the neon HTTP client for an
 * independent code path.
 */

import { describe, it, expect, afterAll } from "vitest";
import { neon } from "@neondatabase/serverless";
import { db } from "../server/db";
import {
  locations,
  patternSuggestions,
  votes,
  spatialPoints,
  patterns,
} from "../shared/schema";
import { eq, inArray } from "drizzle-orm";
import { dbOptimizations } from "../server/database-optimizations";

const DATABASE_URL =
  process.env.DATABASE_URL ?? process.env.NEON_DATABASE_URL ?? "";

/** A tag guaranteed to be unique per test run so cleanup is surgical. */
const RUN_TAG = `test-stats-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// ---------------------------------------------------------------------------
// Global branch tests
// ---------------------------------------------------------------------------

describe.skipIf(!DATABASE_URL)(
  "calculateStatsOptimized — global branch (no sessionId)",
  () => {
    it(
      "returns counts that exactly match independent COUNT(*) queries on each table",
      { timeout: 30_000 },
      async () => {
        // Call the function under test first.
        const stats = await dbOptimizations.calculateStatsOptimized();

        // Then run independent direct COUNTs via a separate HTTP client.
        const sql = neon(DATABASE_URL);
        const [ps, v, l, sp] = await Promise.all([
          sql`SELECT COUNT(*)::int AS n FROM pattern_suggestions`,
          sql`SELECT COUNT(*)::int AS n FROM votes`,
          sql`SELECT COUNT(*)::int AS n FROM locations`,
          sql`SELECT COUNT(*)::int AS n FROM spatial_points WHERE type = 'offline'`,
        ]);

        // Coerce to numbers for safe comparison (some drivers return strings
        // for BIGINT/NUMERIC columns).
        expect(Number(stats.suggested_patterns)).toBe(Number(ps[0].n));
        expect(Number(stats.votes_contributed)).toBe(Number(v[0].n));
        expect(Number(stats.locations_tracked)).toBe(Number(l[0].n));
        expect(Number(stats.offline_patterns)).toBe(Number(sp[0].n));
      }
    );

    it(
      "global stats increase by exactly the seeded delta when new rows are added",
      { timeout: 30_000 },
      async () => {
        const sessionId = RUN_TAG + "-global-delta";

        // Snapshot counts before seeding (clear cache so we get a fresh DB read).
        dbOptimizations.clearGlobalStatsCache();
        const before = await dbOptimizations.calculateStatsOptimized();

        // Seed 2 locations, 1 spatial_point (offline) using drizzle inserts.
        await db.insert(locations).values([
          { latitude: "10.00000000", longitude: "20.00000000", sessionId },
          { latitude: "11.00000000", longitude: "21.00000000", sessionId },
        ]);
        await db.insert(spatialPoints).values([
          {
            latitude: "10.00000000",
            longitude: "20.00000000",
            type: "offline",
            sessionId,
            metadata: "{}",
          },
        ]);

        // Snapshot counts after seeding (clear cache so we get a fresh DB read).
        dbOptimizations.clearGlobalStatsCache();
        const after = await dbOptimizations.calculateStatsOptimized();

        expect(Number(after.locations_tracked) - Number(before.locations_tracked)).toBe(2);
        expect(Number(after.offline_patterns) - Number(before.offline_patterns)).toBe(1);

        // Clean up seeded rows.
        await db.delete(locations).where(eq(locations.sessionId, sessionId));
        await db.delete(spatialPoints).where(eq(spatialPoints.sessionId, sessionId));
      }
    );

    it(
      "non-offline spatial_points do not appear in offline_patterns count",
      { timeout: 30_000 },
      async () => {
        const sessionId = RUN_TAG + "-non-offline";

        dbOptimizations.clearGlobalStatsCache();
        const before = await dbOptimizations.calculateStatsOptimized();

        // Insert two spatial_points with type !== 'offline'.
        await db.insert(spatialPoints).values([
          {
            latitude: "12.00000000",
            longitude: "22.00000000",
            type: "tracking",
            sessionId,
            metadata: "{}",
          },
          {
            latitude: "13.00000000",
            longitude: "23.00000000",
            type: "analyzed",
            sessionId,
            metadata: "{}",
          },
        ]);

        // Clear cache so we read the actual post-insert DB state.
        dbOptimizations.clearGlobalStatsCache();
        const after = await dbOptimizations.calculateStatsOptimized();

        // offline_patterns must NOT have increased.
        expect(Number(after.offline_patterns)).toBe(Number(before.offline_patterns));

        await db.delete(spatialPoints).where(eq(spatialPoints.sessionId, sessionId));
      }
    );
  }
);

// ---------------------------------------------------------------------------
// Per-session branch tests
// ---------------------------------------------------------------------------

describe.skipIf(!DATABASE_URL)(
  "calculateStatsOptimized — per-session branch (with sessionId)",
  () => {
    const sessionId = RUN_TAG + "-per-session";
    const otherSessionId = RUN_TAG + "-other-session";

    // Clean up all seeded rows after the suite finishes.
    afterAll(async () => {
      // Child rows first to respect FK ordering.
      await db.delete(votes).where(inArray(votes.sessionId, [sessionId, otherSessionId]));

      // Find location ids for these sessions so we can delete pattern_suggestions.
      const locRows = await db
        .select({ id: locations.id })
        .from(locations)
        .where(inArray(locations.sessionId, [sessionId, otherSessionId]));
      if (locRows.length > 0) {
        const locIds = locRows.map((r) => r.id);
        await db
          .delete(patternSuggestions)
          .where(inArray(patternSuggestions.locationId, locIds));
      }

      await db.delete(spatialPoints).where(inArray(spatialPoints.sessionId, [sessionId, otherSessionId]));
      await db.delete(locations).where(inArray(locations.sessionId, [sessionId, otherSessionId]));
    });

    it(
      "returns zeros for a session that has no rows",
      { timeout: 30_000 },
      async () => {
        const stats = await dbOptimizations.calculateStatsOptimized(
          RUN_TAG + "-nonexistent"
        );

        expect(Number(stats.suggested_patterns)).toBe(0);
        expect(Number(stats.votes_contributed)).toBe(0);
        expect(Number(stats.locations_tracked)).toBe(0);
        expect(Number(stats.offline_patterns)).toBe(0);
      }
    );

    it(
      "locations_tracked and offline_patterns match exactly seeded data",
      { timeout: 30_000 },
      async () => {
        // Seed 3 locations for sessionId.
        await db.insert(locations).values([
          { latitude: "50.00000000", longitude: "60.00000000", sessionId },
          { latitude: "51.00000000", longitude: "61.00000000", sessionId },
          { latitude: "52.00000000", longitude: "62.00000000", sessionId },
        ]);

        // 2 offline + 1 non-offline spatial_points for sessionId.
        await db.insert(spatialPoints).values([
          {
            latitude: "50.00000000",
            longitude: "60.00000000",
            type: "offline",
            sessionId,
            metadata: "{}",
          },
          {
            latitude: "51.00000000",
            longitude: "61.00000000",
            type: "offline",
            sessionId,
            metadata: "{}",
          },
          {
            latitude: "52.00000000",
            longitude: "62.00000000",
            type: "tracking",
            sessionId,
            metadata: "{}",
          },
        ]);

        const stats = await dbOptimizations.calculateStatsOptimized(sessionId);

        expect(Number(stats.locations_tracked)).toBe(3);
        expect(Number(stats.offline_patterns)).toBe(2);
      }
    );

    it(
      "per-session stats do not include rows belonging to other sessions",
      { timeout: 30_000 },
      async () => {
        // Seed rows for a completely different session.
        await db.insert(locations).values([
          { latitude: "70.00000000", longitude: "80.00000000", sessionId: otherSessionId },
          { latitude: "71.00000000", longitude: "81.00000000", sessionId: otherSessionId },
        ]);
        await db.insert(spatialPoints).values([
          {
            latitude: "70.00000000",
            longitude: "80.00000000",
            type: "offline",
            sessionId: otherSessionId,
            metadata: "{}",
          },
        ]);

        // Stats for sessionId must be unchanged — no bleed-in from otherSessionId.
        const stats = await dbOptimizations.calculateStatsOptimized(sessionId);

        expect(Number(stats.locations_tracked)).toBe(3);
        expect(Number(stats.offline_patterns)).toBe(2);
      }
    );

    it(
      "votes_contributed and suggested_patterns count only rows for the target session",
      { timeout: 30_000 },
      async () => {
        // Find an existing pattern to satisfy the FK on pattern_suggestions.
        const patternRows = await db
          .select({ id: patterns.id })
          .from(patterns)
          .limit(1);

        if (patternRows.length === 0) {
          console.warn("Skipping votes assertion: no patterns in DB");
          return;
        }
        const patternId = patternRows[0].id;

        // Get a location already seeded for sessionId.
        const locRows = await db
          .select({ id: locations.id })
          .from(locations)
          .where(eq(locations.sessionId, sessionId))
          .limit(1);

        if (locRows.length === 0) {
          console.warn("Skipping votes assertion: no locations found for sessionId");
          return;
        }
        const locationId = locRows[0].id;

        // Insert a pattern_suggestion for that location.
        const [ps] = await db
          .insert(patternSuggestions)
          .values({ locationId, patternId, confidence: "high", mlAlgorithm: "test" })
          .returning({ id: patternSuggestions.id });

        if (!ps) {
          console.warn("Skipping votes assertion: pattern_suggestions insert returned nothing");
          return;
        }
        const suggestionId = ps.id;

        // 2 votes for sessionId, 1 vote for otherSessionId (same suggestion).
        await db.insert(votes).values([
          { suggestionId, sessionId, voteType: "up" },
          { suggestionId, sessionId, voteType: "down" },
        ]);
        await db.insert(votes).values([
          { suggestionId, sessionId: otherSessionId, voteType: "up" },
        ]);

        const stats = await dbOptimizations.calculateStatsOptimized(sessionId);

        expect(Number(stats.votes_contributed)).toBe(2);
        expect(Number(stats.suggested_patterns)).toBe(1);
      }
    );
  }
);
