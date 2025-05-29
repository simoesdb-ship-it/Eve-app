import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertLocationSchema, insertVoteSchema, insertActivitySchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Get all patterns
  app.get("/api/patterns", async (req, res) => {
    try {
      const patterns = await storage.getAllPatterns();
      res.json(patterns);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch patterns" });
    }
  });

  // Get pattern by ID
  app.get("/api/patterns/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const pattern = await storage.getPattern(id);
      if (!pattern) {
        return res.status(404).json({ message: "Pattern not found" });
      }
      res.json(pattern);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch pattern" });
    }
  });

  // Create location and get pattern suggestions
  app.post("/api/locations", async (req, res) => {
    try {
      const locationData = insertLocationSchema.parse(req.body);
      const location = await storage.createLocation(locationData);

      // Generate pattern suggestions using ML algorithm
      const patterns = await storage.getAllPatterns();
      const suggestions = [];

      for (const pattern of patterns) {
        // Simple pattern matching algorithm based on keywords and location characteristics
        const confidence = calculatePatternConfidence(pattern, location);
        if (confidence > 0.5) {
          const suggestion = await storage.createPatternSuggestion({
            locationId: location.id,
            patternId: pattern.id,
            confidence: confidence.toString(),
            mlAlgorithm: "keyword_spatial_matching"
          });
          suggestions.push(suggestion);
        }
      }

      // Log activity
      await storage.createActivity({
        type: "visit",
        description: `New location visited: ${location.name || "Unknown"}`,
        locationId: location.id,
        sessionId: location.sessionId
      });

      res.json(location);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid location data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create location" });
    }
  });

  // Get patterns for a location
  app.get("/api/locations/:id/patterns", async (req, res) => {
    try {
      const locationId = parseInt(req.params.id);
      const sessionId = req.query.sessionId as string;
      
      if (!sessionId) {
        return res.status(400).json({ message: "Session ID is required" });
      }

      const patterns = await storage.getPatternsForLocation(locationId, sessionId);
      res.json(patterns);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch patterns for location" });
    }
  });

  // Vote on a pattern suggestion
  app.post("/api/votes", async (req, res) => {
    try {
      const voteData = insertVoteSchema.parse(req.body);
      
      // Check if user already voted
      const existingVote = await storage.getUserVoteForSuggestion(
        voteData.suggestionId, 
        voteData.sessionId
      );

      if (existingVote) {
        return res.status(400).json({ message: "Already voted on this suggestion" });
      }

      const vote = await storage.createVote(voteData);

      // Log activity
      await storage.createActivity({
        type: "vote",
        description: `Vote cast: ${voteData.voteType} on pattern suggestion`,
        sessionId: voteData.sessionId
      });

      res.json(vote);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid vote data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create vote" });
    }
  });

  // Get recent activity
  app.get("/api/activity", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const activities = await storage.getRecentActivity(limit);
      res.json(activities);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch activities" });
    }
  });

  // Get user statistics
  app.get("/api/stats", async (req, res) => {
    try {
      const sessionId = req.query.sessionId as string;
      
      if (!sessionId) {
        return res.status(400).json({ message: "Session ID is required" });
      }

      const stats = await storage.getStats(sessionId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch statistics" });
    }
  });

  // Search patterns
  app.get("/api/patterns/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.status(400).json({ message: "Search query is required" });
      }

      const keywords = query.toLowerCase().split(' ');
      const patterns = await storage.searchPatterns(keywords);
      res.json(patterns);
    } catch (error) {
      res.status(500).json({ message: "Failed to search patterns" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Simple pattern matching algorithm
function calculatePatternConfidence(pattern: any, location: any): number {
  let confidence = 0.5; // Base confidence

  // Urban area indicators
  const urbanKeywords = ['street', 'plaza', 'public', 'pedestrian', 'cafe'];
  const patternKeywords = pattern.keywords.map((k: string) => k.toLowerCase());
  
  const urbanMatch = urbanKeywords.some(uk => 
    patternKeywords.some((pk: string) => pk.includes(uk))
  );
  
  if (urbanMatch) {
    confidence += 0.3;
  }

  // Random variation to simulate ML algorithm
  confidence += (Math.random() - 0.5) * 0.2;
  
  return Math.max(0, Math.min(1, confidence));
}
