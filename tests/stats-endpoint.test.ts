/**
 * Endpoint-level tests: GET /api/stats resilience
 *
 * These tests mount the real cacheMiddleware (with the updated stats config)
 * plus the stats route handler on a minimal Express app, with
 * calculateStatsOptimized stubbed out, so we can verify:
 *
 *   1. Normal global:      DB responds → 200 camelCase stats.
 *   2. Per-session cached: second identical request is served from HTTP cache
 *                          (calculateStatsOptimized called only once).
 *   3. Global not cached:  two identical global requests each hit
 *                          calculateStatsOptimized (HTTP cache bypassed).
 *   4. Stale fallback:     calculateStatsOptimized resolves from internal stale
 *                          cache → still 200, no server error emitted.
 *   5. Cold DB failure:    calculateStatsOptimized throws → 503 with retry hint.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import express from "express";
import request from "supertest";
import { cacheMiddleware, cacheConfigs, cache } from "../server/middleware/caching";

// ---------------------------------------------------------------------------
// Module mock
// ---------------------------------------------------------------------------

vi.mock("../server/database-optimizations", async (importOriginal) => {
  const original = await importOriginal<typeof import("../server/database-optimizations")>();
  return {
    ...original,
    dbOptimizations: {
      ...original.dbOptimizations,
      calculateStatsOptimized: vi.fn(),
    },
  };
});

import { dbOptimizations } from "../server/database-optimizations";
const calcMock = dbOptimizations.calculateStatsOptimized as ReturnType<typeof vi.fn>;

// ---------------------------------------------------------------------------
// Minimal app that mirrors routes.ts stats handler exactly (middleware included)
// ---------------------------------------------------------------------------

function buildStatsApp() {
  const app = express();
  app.use(express.json());

  app.get(
    "/api/stats",
    cacheMiddleware(cacheConfigs.stats),
    async (req, res) => {
      try {
        const sessionId = req.query.sessionId as string;
        const userId    = req.query.userId    as string;
        const identifier = userId || sessionId || undefined;
        const raw = await dbOptimizations.calculateStatsOptimized(identifier);

        res.json({
          suggestedPatterns: Number(raw.suggested_patterns),
          votesContributed:  Number(raw.votes_contributed),
          locationsTracked:  Number(raw.locations_tracked),
          offlinePatterns:   Number(raw.offline_patterns),
        });
      } catch (error) {
        console.error("Stats endpoint: DB unavailable and no cached data:", error);
        res.status(503).json({ message: "Statistics temporarily unavailable, please retry" });
      }
    }
  );

  return app;
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  calcMock.mockReset();
  // Clear HTTP-layer cache between tests so cache state doesn't bleed across.
  cache.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
  cache.clear();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("GET /api/stats — endpoint resilience (with real cacheMiddleware)", () => {

  it("global: returns 200 with camelCase stats when DB responds normally", async () => {
    calcMock.mockResolvedValueOnce({
      suggested_patterns: "42",
      votes_contributed:  "17",
      locations_tracked:  "8",
      offline_patterns:   "3",
    });

    const res = await request(buildStatsApp()).get("/api/stats");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      suggestedPatterns: 42,
      votesContributed:  17,
      locationsTracked:  8,
      offlinePatterns:   3,
    });
    // Called with undefined → global path
    expect(calcMock).toHaveBeenCalledWith(undefined);
  });

  it("global: two consecutive requests both hit calculateStatsOptimized (HTTP cache is bypassed for global path)", async () => {
    calcMock.mockResolvedValue({
      suggested_patterns: "10",
      votes_contributed:  "5",
      locations_tracked:  "2",
      offline_patterns:   "0",
    });

    const app = buildStatsApp();
    await request(app).get("/api/stats");
    await request(app).get("/api/stats");

    // Both calls must reach the handler — HTTP cache must NOT have stored the first response.
    expect(calcMock).toHaveBeenCalledTimes(2);
  });

  it("per-session: second identical request is served from HTTP cache (calculateStatsOptimized called once)", async () => {
    calcMock.mockResolvedValue({
      suggested_patterns: "5",
      votes_contributed:  "2",
      locations_tracked:  "1",
      offline_patterns:   "0",
    });

    const app = buildStatsApp();
    const first  = await request(app).get("/api/stats?sessionId=sess-xyz");
    const second = await request(app).get("/api/stats?sessionId=sess-xyz");

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    // HTTP cache should have served the second request without hitting calculateStatsOptimized again.
    expect(calcMock).toHaveBeenCalledTimes(1);
    expect(second.headers["x-cache"]).toBe("HIT");
  });

  it("stale fallback: calculateStatsOptimized resolves via internal stale cache → 200, no error logged", async () => {
    // Simulate the internal stale-cache path: the function resolves (not throws).
    calcMock.mockResolvedValueOnce({
      suggested_patterns: "7",
      votes_contributed:  "3",
      locations_tracked:  "2",
      offline_patterns:   "1",
    });

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await request(buildStatsApp()).get("/api/stats");

    expect(res.status).toBe(200);
    expect(res.body.suggestedPatterns).toBe(7);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("cold DB failure: calculateStatsOptimized throws → 503 with retry message", async () => {
    calcMock.mockRejectedValueOnce(new Error("connection refused"));

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await request(buildStatsApp()).get("/api/stats");

    expect(res.status).toBe(503);
    expect(res.body.message).toMatch(/temporarily unavailable/i);
    expect(errorSpy).toHaveBeenCalledOnce();
  });
});
