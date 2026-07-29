/**
 * Unit tests: calculateStatsOptimized() caching and resilience behaviour
 *
 * These tests mock db.execute so they run without a real database and focus
 * on the four observable paths:
 *   1. Cache miss  — fresh DB read, result stored, returned.
 *   2. Cache hit   — cached value returned without hitting the DB.
 *   3. Slow query  — DB takes longer than the timeout; stale cache is served
 *                    and a warning is logged.
 *   4. DB failure  — db.execute rejects; stale cache is served with a warning
 *                    when available, or the error is re-thrown when the cache
 *                    is cold.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as dbModule from "../server/db";
import { DatabaseOptimizations } from "../server/database-optimizations";
import { sql } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Fake DB row returned by the mocked query. */
const FRESH_ROW = {
  suggested_patterns: "10",
  votes_contributed: "20",
  locations_tracked: "30",
  offline_patterns: "5",
};

/** A different row used to verify cache vs fresh data. */
const STALE_ROW = {
  suggested_patterns: "1",
  votes_contributed: "2",
  locations_tracked: "3",
  offline_patterns: "0",
};

/** Build a mock QueryResult in the shape drizzle-orm/neon-serverless returns. */
const mockQueryResult = (row: Record<string, string>) => ({ rows: [row] });

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

let dbExecuteSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  dbExecuteSpy = vi.spyOn(dbModule.db, "execute");
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("calculateStatsOptimized — caching and resilience", () => {

  it("cache miss: calls db.execute and returns fresh data", async () => {
    dbExecuteSpy.mockResolvedValueOnce(mockQueryResult(FRESH_ROW) as any);

    // Short TTL so we can control expiry; timeout long enough not to race.
    const opts = new DatabaseOptimizations(30, 5);

    const stats = await opts.calculateStatsOptimized();

    expect(dbExecuteSpy).toHaveBeenCalledTimes(1);
    expect(stats.suggested_patterns).toBe("10");
    expect(stats.votes_contributed).toBe("20");
  });

  it("cache hit: returns cached value without calling db.execute again", async () => {
    dbExecuteSpy.mockResolvedValue(mockQueryResult(FRESH_ROW) as any);

    const opts = new DatabaseOptimizations(30, 5);

    // First call populates the cache.
    await opts.calculateStatsOptimized();
    // Second call should use the cache.
    const stats = await opts.calculateStatsOptimized();

    expect(dbExecuteSpy).toHaveBeenCalledTimes(1); // only the first call
    expect(stats.suggested_patterns).toBe("10");
  });

  it("slow query: serves stale cache and logs a warning when the query exceeds the timeout", async () => {
    // First call: populate cache with STALE_ROW.
    dbExecuteSpy.mockResolvedValueOnce(mockQueryResult(STALE_ROW) as any);
    // Short TTL (0.05 s) so cache expires quickly; very short query timeout (0.05 s).
    const opts = new DatabaseOptimizations(0.05, 0.05);
    await opts.calculateStatsOptimized();

    // Wait for TTL to expire.
    await new Promise((r) => setTimeout(r, 80));

    // Second call: DB takes 200 ms — longer than the 50 ms timeout.
    dbExecuteSpy.mockImplementationOnce(
      () => new Promise((r) => setTimeout(() => r(mockQueryResult(FRESH_ROW) as any), 200))
    );

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const stats = await opts.calculateStatsOptimized();

    // Must return STALE_ROW, not FRESH_ROW, and must have warned.
    expect(stats.suggested_patterns).toBe("1");
    expect(warnSpy).toHaveBeenCalledOnce();
    expect(warnSpy.mock.calls[0][0]).toMatch(/timed out|failed/i);
  });

  it("DB error with stale cache: returns stale data and logs a warning", async () => {
    // First call: populate cache.
    dbExecuteSpy.mockResolvedValueOnce(mockQueryResult(STALE_ROW) as any);
    const opts = new DatabaseOptimizations(0.05, 5);
    await opts.calculateStatsOptimized();

    // Wait for TTL to expire.
    await new Promise((r) => setTimeout(r, 80));

    // Second call: DB rejects.
    dbExecuteSpy.mockRejectedValueOnce(new Error("connection refused"));

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const stats = await opts.calculateStatsOptimized();

    expect(stats.suggested_patterns).toBe("1"); // stale data served
    expect(warnSpy).toHaveBeenCalledOnce();
    expect(warnSpy.mock.calls[0][0]).toMatch(/stale/i);
  });

  it("cache-cold DB failure: throws the original error (does not return zeros)", async () => {
    dbExecuteSpy.mockRejectedValueOnce(new Error("no connection"));

    const opts = new DatabaseOptimizations(30, 5);

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(opts.calculateStatsOptimized()).rejects.toThrow("no connection");
    expect(errorSpy).toHaveBeenCalledOnce();
  });

  it("per-session path: always calls db.execute and is never cached", async () => {
    dbExecuteSpy.mockResolvedValue(mockQueryResult(FRESH_ROW) as any);

    const opts = new DatabaseOptimizations(30, 5);
    const sid = "session-abc";

    // Two calls with the same sessionId must each hit the DB.
    await opts.calculateStatsOptimized(sid);
    await opts.calculateStatsOptimized(sid);

    expect(dbExecuteSpy).toHaveBeenCalledTimes(2);
  });
});
