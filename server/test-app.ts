/**
 * Lightweight Express app factory used exclusively by integration tests.
 *
 * It configures the same pg-backed session store as the production server
 * (server/index.ts) but skips all heavy start-up work (DB index creation,
 * cache warming, etc.).  Only the three routes required for the cross-instance
 * session tests are registered.
 */

import express from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { randomUUID } from "crypto";
import { pool } from "./db";
import { dataMarketplace } from "./data-marketplace";
import { storage } from "./storage";
import encryptionService from "./encryption-service";

const PgSession = connectPgSimple(session);

/** Returns a fully-configured Express app backed by the shared pg session store. */
export function createTestApp() {
  const app = express();
  app.use(express.json());

  app.use(
    session({
      store: new PgSession({
        pool: pool as any,
        tableName: "session",
        createTableIfMissing: true,
        ttl: 30 * 24 * 60 * 60,
        pruneSessionInterval: false as any, // disable background timer in tests
      }),
      secret:
        process.env.SESSION_SECRET || "fallback-dev-secret-do-not-use-in-prod",
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: false, // supertest communicates over plain HTTP
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000,
      },
    })
  );

  // ── Route: GET /api/session/me ──────────────────────────────────────────────
  app.get("/api/session/me", (req, res) => {
    if (!(req.session as any).serverId) {
      (req.session as any).serverId = randomUUID();
    }
    res.json({ serverId: (req.session as any).serverId });
  });

  // ── Route: POST /api/marketplace/transfer-tokens ───────────────────────────
  app.post("/api/marketplace/transfer-tokens", async (req, res) => {
    try {
      const fromSessionId = (req.session as any).serverId as
        | string
        | undefined;
      if (!fromSessionId) {
        return res
          .status(401)
          .json({
            message:
              "No server session. Call GET /api/session/me first.",
          });
      }

      const { toSessionId, amount, transferType, message } = req.body;
      if (!toSessionId || !amount) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const result = await dataMarketplace.transferTokens(
        fromSessionId,
        toSessionId,
        parseInt(amount),
        transferType || "gift",
        message
      );

      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error("Error transferring tokens:", error);
      res.status(500).json({ message: "Transfer failed" });
    }
  });

  // ── Route: POST /api/communication/access-path/:pathId ─────────────────────
  app.post("/api/communication/access-path/:pathId", async (req, res) => {
    try {
      const { pathId } = req.params;

      const userId = (req.session as any).serverId as string | undefined;
      if (!userId) {
        return res
          .status(401)
          .json({
            error:
              "No server session. Call GET /api/session/me first.",
          });
      }

      const sharedPath = await storage.getSharedPath(parseInt(pathId));
      if (!sharedPath) {
        return res.status(404).json({ error: "Path not found" });
      }

      const balance = await storage.getUserTokenBalance(userId);
      if (balance < sharedPath.tokenCost) {
        return res.status(400).json({ error: "Insufficient tokens" });
      }

      await storage.deductTokens(userId, sharedPath.tokenCost);
      await storage.awardTokens(
        sharedPath.sharerId,
        Math.floor(sharedPath.tokenCost * 0.8)
      );

      await storage.recordPathAccess({
        pathId: parseInt(pathId),
        accessorId: userId,
        tokensPaid: sharedPath.tokenCost,
      });

      res.json({
        success: true,
        pathData: sharedPath.pathData,
        patternInsights: sharedPath.patternInsights,
        tokensSpent: sharedPath.tokenCost,
      });
    } catch (error) {
      console.error("Error accessing path:", error);
      res.status(500).json({ error: "Failed to access path" });
    }
  });

  return app;
}
