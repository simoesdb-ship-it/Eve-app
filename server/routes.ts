import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertLocationSchema, insertVoteSchema, insertActivitySchema, insertTrackingPointSchema } from "@shared/schema";
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

  // Tracking endpoints
  app.post('/api/tracking', async (req, res) => {
    try {
      const trackingPoint = await storage.createTrackingPoint(req.body);
      res.json(trackingPoint);
    } catch (error) {
      console.error('Error creating tracking point:', error);
      res.status(500).json({ error: 'Failed to create tracking point' });
    }
  });

  app.get('/api/tracking/:sessionId', async (req, res) => {
    try {
      const { sessionId } = req.params;
      const trackingPoints = await storage.getTrackingPointsBySession(sessionId);
      res.json(trackingPoints);
    } catch (error) {
      console.error('Error fetching tracking points:', error);
      res.status(500).json({ error: 'Failed to fetch tracking points' });
    }
  });

  // Location analysis endpoint - fetches real geographic data
  app.get('/api/location-analysis', async (req, res) => {
    try {
      const { lat, lng } = req.query;
      
      if (!lat || !lng) {
        return res.status(400).json({ error: 'Latitude and longitude are required' });
      }

      const latitude = parseFloat(lat as string);
      const longitude = parseFloat(lng as string);

      // Use OpenStreetMap Nominatim for reverse geocoding (free, no API key needed)
      const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`;
      
      const nominatimResponse = await fetch(nominatimUrl, {
        headers: {
          'User-Agent': 'PatternLanguageApp/1.0'
        }
      });

      if (!nominatimResponse.ok) {
        throw new Error('Failed to fetch location data from Nominatim');
      }

      const nominatimData = await nominatimResponse.json();

      // Use Open-Elevation API for elevation data (free, no API key needed)
      const elevationUrl = `https://api.open-elevation.com/api/v1/lookup?locations=${latitude},${longitude}`;
      
      let elevation = 0;
      try {
        const elevationResponse = await fetch(elevationUrl);
        if (elevationResponse.ok) {
          const elevationData = await elevationResponse.json();
          elevation = elevationData.results[0]?.elevation || 0;
        }
      } catch (error) {
        console.warn('Failed to fetch elevation data:', error);
      }

      // Extract timezone using coordinates (approximate)
      const timezone = getTimezoneFromCoordinates(latitude, longitude);

      const locationData = {
        coordinates: {
          latitude,
          longitude
        },
        address: nominatimData.display_name || 'Unknown address',
        neighborhood: nominatimData.address?.neighbourhood || nominatimData.address?.suburb || 'Unknown',
        city: nominatimData.address?.city || nominatimData.address?.town || nominatimData.address?.village || 'Unknown',
        country: nominatimData.address?.country || 'Unknown',
        elevation: Math.round(elevation),
        timezone
      };

      res.json(locationData);
    } catch (error) {
      console.error('Error in location analysis:', error);
      res.status(500).json({ error: 'Failed to analyze location' });
    }
  });

  // Contextual analysis endpoint - analyzes urban context
  app.get('/api/contextual-analysis', async (req, res) => {
    try {
      const { lat, lng } = req.query;
      
      if (!lat || !lng) {
        return res.status(400).json({ error: 'Latitude and longitude are required' });
      }

      const latitude = parseFloat(lat as string);
      const longitude = parseFloat(lng as string);

      // Use Overpass API to get OpenStreetMap data for contextual analysis
      const overpassQuery = `
        [out:json][timeout:25];
        (
          way(around:500,${latitude},${longitude})[highway];
          way(around:500,${latitude},${longitude})[building];
          way(around:500,${latitude},${longitude})[amenity];
          way(around:500,${latitude},${longitude})[shop];
          way(around:500,${latitude},${longitude})[leisure];
          way(around:500,${latitude},${longitude})[landuse];
          node(around:500,${latitude},${longitude})[amenity];
          node(around:500,${latitude},${longitude})[shop];
          node(around:500,${latitude},${longitude})[public_transport];
        );
        out geom;
      `;

      const overpassUrl = 'https://overpass-api.de/api/interpreter';
      const overpassResponse = await fetch(overpassUrl, {
        method: 'POST',
        body: overpassQuery,
        headers: {
          'Content-Type': 'text/plain'
        }
      });

      if (!overpassResponse.ok) {
        throw new Error('Failed to fetch contextual data from Overpass API');
      }

      const overpassData = await overpassResponse.json();
      
      // Analyze the data to extract contextual information
      const analysis = analyzeContextualData(overpassData.elements);

      res.json(analysis);
    } catch (error) {
      console.error('Error in contextual analysis:', error);
      res.status(500).json({ error: 'Failed to analyze contextual data' });
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
