/**
 * Integration tests: cross-instance session coherence
 *
 * These tests verify that the pg-backed session store correctly bridges two
 * independent Express app instances.  The flow under test mirrors production:
 *
 *   1. Client hits GET /api/session/me on Instance A  → server mints serverId,
 *      saves it in the pg session table, returns a signed cookie.
 *   2. Client sends that cookie to Instance B          → Instance B reads the
 *      session row from pg, finds the same serverId, and authorises the request.
 *
 * Without a shared persistent store (e.g. if the default in-memory store were
 * used) step 2 would return HTTP 401 because Instance B has no knowledge of the
 * session created by Instance A.
 */

import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { createTestApp } from "../server/test-app";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract the raw Set-Cookie header value(s) from a supertest response. */
function extractCookies(res: request.Response): string[] {
  const raw = res.headers["set-cookie"];
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

/** Strip "Max-Age", "Expires", "Path", etc. so the cookie can be re-sent. */
function cookieHeader(cookies: string[]): string {
  return cookies
    .map((c) => c.split(";")[0].trim())
    .join("; ");
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("Cross-instance session: /api/session/me", () => {
  let instanceA: Express;
  let instanceB: Express;

  beforeAll(() => {
    // Two independent Express apps — same pg session store, different Node objects.
    instanceA = createTestApp();
    instanceB = createTestApp();
  });

  it("GET /api/session/me returns a stable serverId", async () => {
    const agent = request.agent(instanceA);

    const res1 = await agent.get("/api/session/me");
    expect(res1.status).toBe(200);
    expect(typeof res1.body.serverId).toBe("string");
    expect(res1.body.serverId.length).toBeGreaterThan(0);

    // Second call on the same agent must return the same serverId (idempotent).
    const res2 = await agent.get("/api/session/me");
    expect(res2.status).toBe(200);
    expect(res2.body.serverId).toBe(res1.body.serverId);
  });
});

// ---------------------------------------------------------------------------

describe("Cross-instance session: POST /api/marketplace/transfer-tokens", () => {
  let instanceA: Express;
  let instanceB: Express;

  beforeAll(() => {
    instanceA = createTestApp();
    instanceB = createTestApp();
  });

  it("returns 401 when no session cookie is supplied", async () => {
    const res = await request(instanceB)
      .post("/api/marketplace/transfer-tokens")
      .send({ toSessionId: "target-session", amount: 10 });

    expect(res.status).toBe(401);
  });

  it("session established on Instance A is honoured by Instance B", async () => {
    // ── Step 1: establish a session on Instance A ──────────────────────────
    const resA = await request(instanceA).get("/api/session/me");
    expect(resA.status).toBe(200);
    expect(resA.body.serverId).toBeTruthy();

    const cookies = extractCookies(resA);
    expect(cookies.length).toBeGreaterThan(0);

    const sessionCookie = cookieHeader(cookies);

    // ── Step 2: hit Instance B using the cookie minted by Instance A ───────
    // We expect anything OTHER than 401 — the session is recognised.
    // A 400 ("missing fields" / "insufficient tokens") or 500 are acceptable
    // because we haven't set up real balances; the important assertion is that
    // the session guard (401) is passed.
    const resB = await request(instanceB)
      .post("/api/marketplace/transfer-tokens")
      .set("Cookie", sessionCookie)
      .send({ toSessionId: "any-other-session", amount: 1 });

    expect(resB.status).not.toBe(401);
  });

  it("a fabricated cookie (no matching pg session) still returns 401", async () => {
    // Send a well-formed but non-existent session cookie.
    // express-session will find no matching row → session.serverId is undefined → 401.
    const res = await request(instanceB)
      .post("/api/marketplace/transfer-tokens")
      .set("Cookie", "connect.sid=s%3Afake-session-id-that-does-not-exist.invalidsignature")
      .send({ toSessionId: "target", amount: 5 });

    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------

describe("Cross-instance session: POST /api/communication/access-path/:pathId", () => {
  let instanceA: Express;
  let instanceB: Express;

  beforeAll(() => {
    instanceA = createTestApp();
    instanceB = createTestApp();
  });

  it("returns 401 when no session cookie is supplied", async () => {
    const res = await request(instanceB)
      .post("/api/communication/access-path/999");

    expect(res.status).toBe(401);
  });

  it("session established on Instance A is honoured by Instance B", async () => {
    // ── Step 1: establish a session on Instance A ──────────────────────────
    const resA = await request(instanceA).get("/api/session/me");
    expect(resA.status).toBe(200);
    expect(resA.body.serverId).toBeTruthy();

    const sessionCookie = cookieHeader(extractCookies(resA));

    // ── Step 2: hit Instance B — session guard must pass ───────────────────
    // pathId 999999 almost certainly doesn't exist → 404 is fine.
    // Any status except 401 proves the session was loaded from pg.
    const resB = await request(instanceB)
      .post("/api/communication/access-path/999999")
      .set("Cookie", sessionCookie);

    expect(resB.status).not.toBe(401);
  });

  it("a fabricated cookie (no matching pg session) still returns 401", async () => {
    const res = await request(instanceB)
      .post("/api/communication/access-path/1")
      .set("Cookie", "connect.sid=s%3Afake-session-id-that-does-not-exist.invalidsignature");

    expect(res.status).toBe(401);
  });
});
