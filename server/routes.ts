import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { registerIntelligentPatternRoutes } from "./routes-intelligent-patterns";
import { db } from "./db";
import { votes } from "@shared/schema";
import { eq } from "drizzle-orm";
import CommunicationServer from "./websocket-communication";
import encryptionService from "./encryption-service";
import { insertLocationSchema, insertVoteSchema, insertActivitySchema, insertSpatialPointSchema, insertUserCommentSchema, insertUserMediaSchema } from "@shared/schema";
import { communityAgent } from "./community-agent";
import { locationAnalyzer } from "./location-pattern-analyzer";
import { dataTokenService } from "./data-token-service";
import { dataMarketplace } from "./data-marketplace";
import { optimizedPatternAnalyzer } from "./optimized-pattern-analyzer";
import { cacheMiddleware, cacheConfigs } from "./middleware/caching";
import { rateLimiters } from "./middleware/rate-limiting";
import { dbOptimizations } from "./database-optimizations";
import { performanceMonitor } from "./performance-monitor";
import { contextualPatternCurator } from "./contextual-pattern-curator";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Initialize optimizations
  console.log('Initializing performance optimizations...');
  await dbOptimizations.createOptimizedIndexes();
  await dbOptimizations.optimizeDatabase();
  await optimizedPatternAnalyzer.warmCache();
  console.log('Performance optimizations completed');

  // Apply rate limiting to all routes
  app.use('/api/', rateLimiters.general.middleware());

  // Performance monitoring middleware
  app.use('/api/', (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      performanceMonitor.trackRequest(duration);
      if (res.statusCode >= 400) {
        performanceMonitor.trackError();
      }
    });
    next();
  });
  
  // Get all patterns (cached)
  app.get("/api/patterns", cacheMiddleware(cacheConfigs.patterns), async (req, res) => {
    try {
      const patterns = await storage.getAllPatterns();
      res.json(patterns);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch patterns" });
    }
  });

  // Get pattern by ID (cached)
  app.get("/api/patterns/:id", cacheMiddleware(cacheConfigs.patternById), async (req, res) => {
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

  // Create location and get pattern suggestions (optimized)
  app.post("/api/locations", rateLimiters.locationCreation.middleware(), async (req, res) => {
    try {
      const locationData = insertLocationSchema.parse(req.body);
      const location = await storage.createLocation(locationData);

      // Use optimized pattern analyzer
      console.log(`Analyzing location using optimized analyzer: ${location.name}`);
      const suggestions = await optimizedPatternAnalyzer.generateOptimizedSuggestions(location);

      // Batch store the suggestions for better performance
      if (suggestions.length > 0) {
        for (const suggestion of suggestions) {
          await storage.createPatternSuggestion({
            locationId: suggestion.locationId,
            patternId: suggestion.patternId,
            confidence: suggestion.confidence.toString(),
            mlAlgorithm: suggestion.mlAlgorithm
          });
        }
      }

      console.log(`Generated ${suggestions.length} pattern suggestions for location ${location.id}`);
      
      // Log pattern suggestions activity
      if (suggestions.length > 0) {
        await storage.createActivity({
          type: "pattern_suggestion",
          description: `Found ${suggestions.length} pattern suggestions for location`,
          sessionId: locationData.sessionId,
          locationId: location.id,
          locationName: location.name
        });
      }

      // Log activity
      await storage.createActivity({
        type: "visit",
        description: `${location.name || "Current Location"}`,
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

  // Get patterns for a location (cached)
  app.get("/api/locations/:id/patterns", cacheMiddleware(cacheConfigs.locationPatterns), async (req, res) => {
    try {
      const locationId = parseInt(req.params.id);
      const sessionId = req.query.sessionId as string;
      
      if (!sessionId) {
        return res.status(400).json({ message: "Session ID is required" });
      }

      console.log(`Fetching patterns for location ${locationId}`);
      const patterns = await storage.getPatternsForLocation(locationId, sessionId);
      console.log(`Found ${patterns.length} patterns for location ${locationId}`);
      res.json(patterns);
    } catch (error) {
      console.error(`Error fetching patterns for location ${parseInt(req.params.id)}:`, error);
      res.status(500).json({ message: "Failed to fetch patterns for location", error: String(error) });
    }
  });

  // Vote on a pattern suggestion (allows switching votes) - rate limited
  app.post("/api/votes", rateLimiters.voting.middleware(), async (req, res) => {
    try {
      const voteData = insertVoteSchema.parse(req.body);
      
      // Check if user already voted
      const existingVote = await storage.getUserVoteForSuggestion(
        voteData.suggestionId, 
        voteData.sessionId
      );

      let vote;
      let actionDescription;
      let isUpdate = false;

      if (existingVote) {
        // User has already voted - check if they're switching their vote
        if (existingVote.voteType === voteData.voteType) {
          return res.status(400).json({ message: "You have already cast this vote" });
        }
        
        // User is switching their vote - delete old vote and create new one
        await db.delete(votes).where(eq(votes.id, existingVote.id));
        vote = await storage.createVote(voteData);
        isUpdate = true;
        
        actionDescription = `Vote switched from ${existingVote.voteType} to ${voteData.voteType} on pattern suggestion`;
      } else {
        // New vote - create it
        vote = await storage.createVote(voteData);
        actionDescription = `Vote cast: ${voteData.voteType} on pattern suggestion`;
      }

      // Log activity
      await storage.createActivity({
        type: "vote",
        description: actionDescription,
        sessionId: voteData.sessionId
      });

      // Return vote with update flag for client feedback
      res.json({ ...vote, isUpdate });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid vote data", errors: error.errors });
      }
      console.error("Error processing vote:", error);
      res.status(500).json({ message: "Failed to process vote" });
    }
  });

  // Get recent activity (cached)
  app.get("/api/activity", cacheMiddleware(cacheConfigs.activity), async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const sessionId = req.query.sessionId as string;
      const userId = req.query.userId as string;
      
      // Use userId if provided (persistent tracking), fallback to sessionId, then global
      const identifier = userId || sessionId;
      const activities = await storage.getRecentActivity(limit, identifier);
      res.json(activities);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch activities" });
    }
  });

  // Get saved locations (community activity)
  app.get("/api/saved-locations", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const sessionId = req.query.sessionId as string;
      const userId = req.query.userId as string;
      
      if (userId || sessionId) {
        // Get user-specific saved locations
        const identifier = userId || sessionId;
        const savedLocations = await storage.getSavedLocationsBySession(identifier);
        res.json(savedLocations);
      } else {
        // Get community saved locations
        const savedLocations = await storage.getSavedLocations(limit);
        res.json(savedLocations);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch saved locations" });
    }
  });

  // Get user statistics (cached)
  app.get("/api/stats", cacheMiddleware(cacheConfigs.stats), async (req, res) => {
    try {
      const sessionId = req.query.sessionId as string;
      const userId = req.query.userId as string;
      
      if (!sessionId && !userId) {
        return res.status(400).json({ message: "Session ID or User ID is required" });
      }

      // Use userId if provided (persistent tracking), fallback to sessionId
      const identifier = userId || sessionId;
      const stats = await storage.getStats(identifier);
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
      const trackingData = {
        ...req.body,
        type: 'tracking' // Always set type to 'tracking' for movement tracking
      };
      console.log('Creating tracking point with data:', trackingData);
      const trackingPoint = await storage.createTrackingPoint(trackingData);
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

  // Saved locations endpoints
  app.post('/api/saved-locations', async (req, res) => {
    try {
      const savedLocation = await storage.createSavedLocation(req.body);
      res.json(savedLocation);
    } catch (error) {
      console.error('Error saving location:', error);
      res.status(500).json({ error: 'Failed to save location' });
    }
  });

  // Get saved locations by session ID (path parameter)
  app.get('/api/saved-locations/:sessionId', async (req, res) => {
    try {
      const { sessionId } = req.params;
      const savedLocations = await storage.getSavedLocationsBySession(sessionId);
      res.json(savedLocations);
    } catch (error) {
      console.error('Error fetching saved locations:', error);
      res.status(500).json({ error: 'Failed to fetch saved locations' });
    }
  });

  // Get saved locations by user ID (query parameter) - for insights page  
  app.get('/api/saved-locations', async (req, res) => {
    try {
      const { userId, includeAll } = req.query;
      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
      }
      
      // If includeAll is true, show all saved locations for potential migration
      if (includeAll === 'true') {
        const allLocations = await storage.getAllSavedLocations();
        res.json(allLocations);
      } else {
        const savedLocations = await storage.getSavedLocationsBySession(userId as string);
        res.json(savedLocations);
      }
    } catch (error) {
      console.error('Error fetching saved locations:', error);
      res.status(500).json({ error: 'Failed to fetch saved locations' });
    }
  });

  // Migrate old saved locations to current user
  app.post('/api/saved-locations/migrate', async (req, res) => {
    try {
      const { currentUserId, locationIds } = req.body;
      
      if (!currentUserId || !locationIds || !Array.isArray(locationIds)) {
        return res.status(400).json({ error: 'Current user ID and location IDs array are required' });
      }
      
      const result = await storage.migrateSavedLocations(currentUserId, locationIds);
      res.json({ success: true, migratedCount: result });
    } catch (error) {
      console.error('Error migrating saved locations:', error);
      res.status(500).json({ error: 'Failed to migrate saved locations' });
    }
  });

  // Assign pattern to saved location
  app.post("/api/saved-locations/:locationId/patterns", async (req, res) => {
    try {
      const locationId = parseInt(req.params.locationId);
      const { patternId, sessionId } = req.body;
      
      if (!patternId || !sessionId) {
        return res.status(400).json({ message: "Pattern ID and session ID are required" });
      }

      const assignment = await storage.assignPatternToSavedLocation({
        savedLocationId: locationId,
        patternId,
        sessionId
      });
      res.json(assignment);
    } catch (error) {
      console.error("Error assigning pattern to saved location:", error);
      res.status(500).json({ message: "Failed to assign pattern" });
    }
  });

  // Get curated patterns for a specific location based on context
  app.get("/api/locations/:locationId/curated-patterns", cacheMiddleware(cacheConfigs.locationPatterns), async (req, res) => {
    try {
      const locationId = parseInt(req.params.locationId);
      const curatedPatterns = await contextualPatternCurator.getCuratedPatterns(locationId);
      res.json(curatedPatterns);
    } catch (error) {
      console.error("Error fetching curated patterns:", error);
      res.status(500).json({ message: "Failed to fetch curated patterns", error: String(error) });
    }
  });

  // Get patterns for saved location
  app.get("/api/saved-locations/:locationId/patterns", async (req, res) => {
    try {
      const locationId = parseInt(req.params.locationId);
      const patterns = await storage.getPatternsByLocationId(locationId);
      res.json(patterns);
    } catch (error) {
      console.error("Error fetching patterns for saved location:", error);
      res.status(500).json({ message: "Failed to fetch patterns" });
    }
  });

  // Remove pattern from saved location
  app.delete("/api/saved-locations/:locationId/patterns/:patternId", async (req, res) => {
    try {
      const locationId = parseInt(req.params.locationId);
      const patternId = parseInt(req.params.patternId);
      const sessionId = req.query.sessionId as string;
      
      if (!sessionId) {
        return res.status(400).json({ message: "Session ID is required" });
      }

      await storage.removePatternFromSavedLocation(locationId, patternId, sessionId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing pattern from saved location:", error);
      res.status(500).json({ message: "Failed to remove pattern" });
    }
  });

  app.delete('/api/saved-locations/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { sessionId } = req.body;
      await storage.deleteSavedLocation(parseInt(id), sessionId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting saved location:', error);
      res.status(500).json({ error: 'Failed to delete saved location' });
    }
  });

  // Token Economy API Routes
  
  // Get user's token balance
  app.get('/api/tokens/balance/:sessionId', async (req, res) => {
    try {
      const { sessionId } = req.params;
      const balance = await dataTokenService.getTokenBalance(sessionId);
      res.json(balance);
    } catch (error) {
      console.error('Error fetching token balance:', error);
      res.status(500).json({ error: 'Failed to fetch token balance' });
    }
  });

  // Upload media and earn tokens
  app.post('/api/tokens/upload-media', async (req, res) => {
    try {
      const { sessionId, locationId, mediaType, fileName, fileSize, mimeType, caption, isPremium } = req.body;
      
      if (!sessionId || !locationId || !mediaType || !fileName || !fileSize || !mimeType) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const result = await dataTokenService.uploadMedia(sessionId, locationId, {
        mediaType,
        fileName,
        fileSize,
        mimeType,
        caption,
        isPremium
      });

      res.json(result);
    } catch (error) {
      console.error('Error uploading media:', error);
      res.status(500).json({ error: 'Failed to upload media' });
    }
  });

  // Add comment and earn tokens
  app.post('/api/tokens/add-comment', async (req, res) => {
    try {
      const { sessionId, locationId, content, commentType, isPremium } = req.body;
      
      if (!sessionId || !locationId || !content || !commentType) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const result = await dataTokenService.addComment(sessionId, locationId, {
        content,
        commentType,
        isPremium
      });

      res.json(result);
    } catch (error) {
      console.error('Error adding comment:', error);
      res.status(500).json({ error: 'Failed to add comment' });
    }
  });

  // Get transaction history
  app.get('/api/tokens/transactions/:sessionId', async (req, res) => {
    try {
      const { sessionId } = req.params;
      const limit = parseInt(req.query.limit as string) || 20;
      
      const transactions = await dataTokenService.getTransactionHistory(sessionId, limit);
      res.json(transactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      res.status(500).json({ error: 'Failed to fetch transactions' });
    }
  });

  // Award tokens for location data contribution
  app.post('/api/tokens/award-location-data', async (req, res) => {
    try {
      const { sessionId, coordinatesCount = 1, accuracyMeters = 10, trackingMinutes = 1 } = req.body;
      
      if (!sessionId) {
        return res.status(400).json({ error: 'Missing session ID' });
      }

      const tokensAwarded = await dataTokenService.awardLocationData(
        sessionId,
        coordinatesCount,
        accuracyMeters,
        trackingMinutes
      );

      res.json({ tokensAwarded });
    } catch (error) {
      console.error('Error awarding location data tokens:', error);
      res.status(500).json({ error: 'Failed to award tokens' });
    }
  });

  // Get global token supply information
  app.get('/api/tokens/supply', async (req, res) => {
    try {
      const supply = await dataTokenService.getTokenSupplyInfo();
      const rewardMultiplier = await dataTokenService.getCurrentRewardMultiplier();
      
      res.json({
        ...supply,
        currentRewardMultiplier: rewardMultiplier,
        percentageMinted: (supply.totalSupply / 21000000) * 100,
        remainingTokens: 21000000 - supply.totalSupply
      });
    } catch (error) {
      console.error('Error fetching token supply:', error);
      res.status(500).json({ error: 'Failed to fetch token supply' });
    }
  });

  // Pattern library endpoints
  app.get('/api/patterns', async (req, res) => {
    try {
      const patterns = await storage.getAllPatterns();
      res.json(patterns);
    } catch (error) {
      console.error('Error fetching patterns:', error);
      res.status(500).json({ error: 'Failed to fetch patterns' });
    }
  });

  app.get('/api/patterns/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const pattern = await storage.getPattern(id);
      if (!pattern) {
        return res.status(404).json({ error: 'Pattern not found' });
      }
      res.json(pattern);
    } catch (error) {
      console.error('Error fetching pattern:', error);
      res.status(500).json({ error: 'Failed to fetch pattern' });
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

  // Community Pattern Analysis endpoint
  app.get('/api/community-analysis', async (req, res) => {
    try {
      const interpretations = await communityAgent.analyzeAllPatternMatches();
      res.json(interpretations);
    } catch (error) {
      console.error('Error in community analysis:', error);
      res.status(500).json({ error: 'Failed to analyze community patterns' });
    }
  });

  // Single pattern analysis endpoint
  app.get('/api/community-analysis/:patternNumber', async (req, res) => {
    try {
      const patternNumber = parseInt(req.params.patternNumber);
      const interpretation = await communityAgent.analyzePattern(patternNumber);
      
      if (!interpretation) {
        return res.status(404).json({ error: 'Pattern not found or no data available' });
      }
      
      res.json(interpretation);
    } catch (error) {
      console.error('Error in pattern analysis:', error);
      res.status(500).json({ error: 'Failed to analyze pattern' });
    }
  });

  // Real-world location pattern analysis
  app.post('/api/analyze-location', async (req, res) => {
    try {
      const { name, coordinates, population, area } = req.body;
      
      if (!name || !coordinates || !population || !area) {
        return res.status(400).json({ error: 'Missing required fields: name, coordinates, population, area' });
      }
      
      const analysis = await locationAnalyzer.analyzeRealWorldLocation(
        name,
        coordinates,
        population,
        area
      );
      
      res.json(analysis);
    } catch (error) {
      console.error('Error in location analysis:', error);
      res.status(500).json({ error: 'Failed to analyze location' });
    }
  });

  // Predefined real-world location analyses
  app.get('/api/real-world-examples', async (req, res) => {
    try {
      const examples = [
        {
          name: "Woodbury, MN",
          coordinates: [44.9239, -92.9594] as [number, number],
          population: 75273,
          area: 92.2 // km²
        },
        {
          name: "Brooklyn Park, MN", 
          coordinates: [45.0941, -93.3563] as [number, number],
          population: 86478,
          area: 68.9
        },
        {
          name: "Edina, MN",
          coordinates: [44.8897, -93.3499] as [number, number],
          population: 53494,
          area: 40.7
        },
        {
          name: "Minnetonka, MN",
          coordinates: [44.9211, -93.4687] as [number, number],
          population: 53760,
          area: 73.4
        }
      ];

      const analyses = await Promise.all(
        examples.map(location => 
          locationAnalyzer.analyzeRealWorldLocation(
            location.name,
            location.coordinates,
            location.population,
            location.area
          )
        )
      );

      res.json({
        totalLocations: examples.length,
        analyses: analyses.map((analysis, index) => ({
          ...analysis,
          summary: {
            majorDeviations: analysis.overallAssessment.criticalDeviations.length,
            averageAdherence: Math.round(analysis.overallAssessment.averageAdherence * 100),
            patternsAnalyzed: analysis.overallAssessment.totalPatternsAnalyzed
          }
        }))
      });
    } catch (error) {
      console.error('Error in real-world examples analysis:', error);
      res.status(500).json({ error: 'Failed to analyze real-world examples' });
    }
  });

  // Time tracking and voting eligibility endpoints
  app.get("/api/time-tracking/:locationId", async (req, res) => {
    try {
      const sessionId = req.query.sessionId as string || "demo_session";
      const locationId = parseInt(req.params.locationId);
      const { timeTrackingService } = await import("./time-tracking-service");
      
      const timeSpent = await timeTrackingService.calculateTimeAtLocation(sessionId, locationId);
      const eligibility = await timeTrackingService.calculateVotingEligibility(sessionId, locationId);
      
      res.json({
        timeTracking: timeSpent,
        votingEligibility: eligibility
      });
    } catch (error) {
      console.error("Error calculating time tracking:", error);
      res.status(500).json({ error: "Failed to calculate time tracking" });
    }
  });

  app.get("/api/voting-eligible-locations", async (req, res) => {
    try {
      const sessionId = req.query.sessionId as string || "demo_session";

      const { timeTrackingService } = await import("./time-tracking-service");
      const eligibleLocations = await timeTrackingService.getVotingEligibleLocations(sessionId);
      
      res.json(eligibleLocations);
    } catch (error) {
      console.error("Error fetching voting eligible locations:", error);
      res.status(500).json({ error: "Failed to fetch voting eligible locations" });
    }
  });

  app.post("/api/generate-demo-data", async (req, res) => {
    try {
      const sessionId = req.body.sessionId || "demo_session";
      const { generateTimeTrackingDemo } = await import("./demo-data-generator");
      
      const demoData = await generateTimeTrackingDemo(sessionId);
      res.json(demoData);
    } catch (error) {
      console.error("Error generating demo data:", error);
      res.status(500).json({ error: "Failed to generate demo data" });
    }
  });

  // Device registration endpoints for anonymous user identification
  app.post('/api/register-device', async (req, res) => {
    try {
      const { deviceId, userId, deviceFingerprint, username } = req.body;
      
      // Check if device is already registered
      const existingRegistration = await storage.getDeviceRegistration(deviceId);
      if (existingRegistration) {
        // Update last seen timestamp
        await storage.updateDeviceLastSeen(deviceId);
        res.json({ 
          registered: true, 
          userId: existingRegistration.userId,
          username: existingRegistration.username,
          message: 'Device already registered' 
        });
        return;
      }

      // Register new device
      const registration = await storage.createDeviceRegistration({
        deviceId,
        userId,
        username,
        deviceFingerprint,
        isActive: true
      });

      res.json({ 
        registered: true, 
        userId: registration.userId,
        username: registration.username,
        message: 'Device registered successfully' 
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Check if device exists
  app.get('/api/check-device/:deviceId', async (req, res) => {
    try {
      const { deviceId } = req.params;
      const registration = await storage.getDeviceRegistration(deviceId);
      
      res.json({ 
        exists: !!registration,
        userId: registration?.userId,
        username: registration?.username,
        isActive: registration?.isActive
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ==================== PEER-TO-PEER DATA MARKETPLACE ====================
  
  // Create a data package for sale
  app.post('/api/marketplace/create-package', async (req, res) => {
    try {
      const { sessionId, title, description, dataType, locationId, priceTokens } = req.body;
      
      if (!sessionId || !title || !description || !dataType || !priceTokens) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      const dataPackage = await dataMarketplace.createDataPackage(sessionId, {
        title,
        description,
        dataType,
        locationId,
        priceTokens: parseInt(priceTokens)
      });
      
      res.json(dataPackage);
    } catch (error) {
      console.error("Error creating data package:", error);
      res.status(500).json({ message: "Failed to create data package" });
    }
  });
  
  // Get available data packages for purchase
  app.get('/api/marketplace/packages', async (req, res) => {
    try {
      const { sessionId } = req.query;
      
      if (!sessionId) {
        return res.status(400).json({ message: "Session ID required" });
      }
      
      const packages = await dataMarketplace.getAvailableDataPackages(sessionId as string);
      res.json(packages);
    } catch (error) {
      console.error("Error fetching marketplace packages:", error);
      res.status(500).json({ message: "Failed to fetch data packages" });
    }
  });
  
  // Purchase a data package
  app.post('/api/marketplace/purchase', async (req, res) => {
    try {
      const { buyerSessionId, packageId } = req.body;
      
      if (!buyerSessionId || !packageId) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      const result = await dataMarketplace.purchaseDataPackage(buyerSessionId, parseInt(packageId));
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error("Error purchasing data package:", error);
      res.status(500).json({ message: "Purchase failed" });
    }
  });
  
  // Get user's purchased data packages
  app.get('/api/marketplace/purchased', async (req, res) => {
    try {
      const { sessionId } = req.query;
      
      if (!sessionId) {
        return res.status(400).json({ message: "Session ID required" });
      }
      
      const purchases = await dataMarketplace.getPurchasedDataPackages(sessionId as string);
      res.json(purchases);
    } catch (error) {
      console.error("Error fetching purchased packages:", error);
      res.status(500).json({ message: "Failed to fetch purchased packages" });
    }
  });
  
  // Direct token transfer between users
  app.post('/api/marketplace/transfer-tokens', async (req, res) => {
    try {
      const { fromSessionId, toSessionId, amount, transferType, message } = req.body;
      
      if (!fromSessionId || !toSessionId || !amount) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      const result = await dataMarketplace.transferTokens(
        fromSessionId,
        toSessionId,
        parseInt(amount),
        transferType || 'gift',
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
  
  // Get transfer history
  app.get('/api/marketplace/transfers', async (req, res) => {
    try {
      const { sessionId, limit } = req.query;
      
      if (!sessionId) {
        return res.status(400).json({ message: "Session ID required" });
      }
      
      const transfers = await dataMarketplace.getTransferHistory(
        sessionId as string,
        limit ? parseInt(limit as string) : 50
      );
      res.json(transfers);
    } catch (error) {
      console.error("Error fetching transfer history:", error);
      res.status(500).json({ message: "Failed to fetch transfer history" });
    }
  });

  // Communication API routes for Bitcoin-powered location sharing
  app.get('/api/communication/peers/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const peers = await storage.getPeerConnections(userId);
      res.json(peers);
    } catch (error) {
      console.error('Error fetching peers:', error);
      res.status(500).json({ error: 'Failed to fetch peers' });
    }
  });

  app.get('/api/communication/messages/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const { peerId } = req.query;
      const messages = await storage.getMessages(userId, peerId as string);
      res.json(messages);
    } catch (error) {
      console.error('Error fetching messages:', error);
      res.status(500).json({ error: 'Failed to fetch messages' });
    }
  });

  app.post('/api/communication/share-path', async (req, res) => {
    try {
      const { sharerId, pathName, pathData, accessType, tokenCost } = req.body;
      
      if (!sharerId || !pathName || !pathData) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Calculate token cost if not provided
      const finalTokenCost = tokenCost || encryptionService.calculateLocationShareCost(pathData);
      
      // Extract pattern insights
      const patternInsights = {
        patternsObserved: pathData.patterns || [],
        architecturalInsights: pathData.insights || [],
        qualityScore: calculatePathQualityForCommunication(pathData)
      };

      const sharedPath = await storage.createSharedPath({
        sharerId,
        pathName,
        pathData,
        accessType: accessType || 'token_gated',
        tokenCost: finalTokenCost,
        patternInsights
      });

      res.json({
        success: true,
        pathId: sharedPath.id,
        pathName,
        tokenCost: finalTokenCost
      });
    } catch (error) {
      console.error('Error sharing path:', error);
      res.status(500).json({ error: 'Failed to share path' });
    }
  });

  app.get('/api/communication/shared-paths', async (req, res) => {
    try {
      const { sharerId } = req.query;
      const paths = await storage.getSharedPaths(sharerId as string);
      res.json(paths);
    } catch (error) {
      console.error('Error fetching shared paths:', error);
      res.status(500).json({ error: 'Failed to fetch shared paths' });
    }
  });

  app.post('/api/communication/access-path/:pathId', async (req, res) => {
    try {
      const { pathId } = req.params;
      const { userId } = req.body;
      
      const sharedPath = await storage.getSharedPath(parseInt(pathId));
      if (!sharedPath) {
        return res.status(404).json({ error: 'Path not found' });
      }

      // Check user token balance
      const balance = await storage.getUserTokenBalance(userId);
      if (balance < sharedPath.tokenCost) {
        return res.status(400).json({ error: 'Insufficient tokens' });
      }

      // Process payment
      await storage.deductTokens(userId, sharedPath.tokenCost);
      await storage.awardTokens(sharedPath.sharerId, Math.floor(sharedPath.tokenCost * 0.8));

      // Record access
      await storage.recordPathAccess({
        pathId: parseInt(pathId),
        accessorId: userId,
        tokensPaid: sharedPath.tokenCost
      });

      res.json({
        success: true,
        pathData: sharedPath.pathData,
        patternInsights: sharedPath.patternInsights,
        tokensSpent: sharedPath.tokenCost
      });
    } catch (error) {
      console.error('Error accessing path:', error);
      res.status(500).json({ error: 'Failed to access path' });
    }
  });

  app.get('/api/communication/token-balance/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const balance = await storage.getUserTokenBalance(userId);
      res.json({ balance });
    } catch (error) {
      console.error('Error fetching token balance:', error);
      res.status(500).json({ error: 'Failed to fetch token balance' });
    }
  });

  // Performance monitoring endpoints
  app.get('/api/performance', rateLimiters.expensive.middleware(), async (req, res) => {
    try {
      const metrics = performanceMonitor.getMetrics();
      res.json(metrics);
    } catch (error) {
      console.error('Error fetching performance metrics:', error);
      res.status(500).json({ error: 'Failed to fetch performance metrics' });
    }
  });

  app.get('/api/cache/stats', async (req, res) => {
    try {
      const stats = cache.getStats();
      res.json(stats);
    } catch (error) {
      console.error('Error fetching cache stats:', error);
      res.status(500).json({ error: 'Failed to fetch cache stats' });
    }
  });

  // ==================== ADMIN DASHBOARD API ROUTES ====================
  
  // Admin authentication middleware
  const adminAuth = async (req: any, res: any, next: any) => {
    const adminId = req.headers['x-admin-id'] as string;
    
    if (!adminId) {
      return res.status(401).json({ message: "Admin authentication required" });
    }

    const { adminService } = await import("./admin-service");
    const isAuthenticated = await adminService.authenticateAdmin(adminId);
    
    if (!isAuthenticated) {
      return res.status(403).json({ message: "Invalid admin credentials" });
    }

    req.adminId = adminId;
    next();
  };

  // Create admin user (for initial setup)
  app.post('/api/admin/setup', async (req, res) => {
    try {
      const { adminId, username, setupKey } = req.body;
      
      // Simple setup key check (in production, use proper authentication)
      if (setupKey !== process.env.ADMIN_SETUP_KEY && setupKey !== "admin_setup_2025") {
        return res.status(403).json({ message: "Invalid setup key" });
      }

      const { adminService } = await import("./admin-service");
      const admin = await adminService.createAdminUser({
        adminId,
        username,
        role: "super_admin",
        permissions: { all: true }
      });

      res.json({ success: true, admin: { id: admin.id, username: admin.username } });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // System overview
  app.get('/api/admin/overview', adminAuth, async (req, res) => {
    try {
      const { adminService } = await import("./admin-service");
      const overview = await adminService.getSystemOverview();
      
      // Log admin action
      await adminService.logAction(req.adminId, 'view_overview', 'system');
      
      res.json(overview);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // User analytics
  app.get('/api/admin/users', adminAuth, async (req, res) => {
    try {
      const timeframe = req.query.timeframe as string || "7d";
      const { adminService } = await import("./admin-service");
      const analytics = await adminService.getUserAnalytics(timeframe);
      
      await adminService.logAction(req.adminId, 'view_user_analytics', 'users');
      
      res.json(analytics);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Pattern analytics
  app.get('/api/admin/patterns', adminAuth, async (req, res) => {
    try {
      const { adminService } = await import("./admin-service");
      const analytics = await adminService.getPatternAnalytics();
      
      await adminService.logAction(req.adminId, 'view_pattern_analytics', 'patterns');
      
      res.json(analytics);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Location analytics
  app.get('/api/admin/locations', adminAuth, async (req, res) => {
    try {
      const { adminService } = await import("./admin-service");
      const analytics = await adminService.getLocationAnalytics();
      
      await adminService.logAction(req.adminId, 'view_location_analytics', 'locations');
      
      res.json(analytics);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Communication analytics
  app.get('/api/admin/communication', adminAuth, async (req, res) => {
    try {
      const { adminService } = await import("./admin-service");
      const analytics = await adminService.getCommunicationAnalytics();
      
      await adminService.logAction(req.adminId, 'view_communication_analytics', 'communication');
      
      res.json(analytics);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // System health
  app.get('/api/admin/health', adminAuth, async (req, res) => {
    try {
      const { adminService } = await import("./admin-service");
      const health = await adminService.getSystemHealth();
      
      res.json(health);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Audit logs
  app.get('/api/admin/audit', adminAuth, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const { adminService } = await import("./admin-service");
      const logs = await adminService.getAuditLogs(limit);
      
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Content moderation
  app.post('/api/admin/moderate', adminAuth, async (req, res) => {
    try {
      const { contentType, contentId, reason } = req.body;
      const { adminService } = await import("./admin-service");
      
      const result = await adminService.flagContent(contentType, contentId, reason, req.adminId);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // System configuration
  app.post('/api/admin/config', adminAuth, async (req, res) => {
    try {
      const config = req.body;
      const { adminService } = await import("./admin-service");
      
      const result = await adminService.updateSystemConfig(config, req.adminId);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Register intelligent pattern suggestion routes
  registerIntelligentPatternRoutes(app);

  const httpServer = createServer(app);
  
  // Initialize WebSocket communication server for real-time messaging
  const communicationServer = new CommunicationServer(httpServer);
  console.log('Bitcoin-powered Location Sharing Protocol with WebSocket messaging activated');
  
  return httpServer;
}

// Enhanced pattern matching algorithm
function calculatePatternConfidence(pattern: any, location: any): number {
  let confidence = 0.25; // Base confidence
  const analysis = analyzeLocationArchitecturalFactors(location);

  // EXISTING FACTORS: Location name and urban context analysis
  const locationName = (location.name || '').toLowerCase();
  const patternKeywords = pattern.keywords.map((k: string) => k.toLowerCase());
  const patternName = pattern.name.toLowerCase();
  
  // Direct keyword matches in location name
  const nameKeywordMatch = patternKeywords.some((keyword: string) => 
    locationName.includes(keyword) || keyword.includes(locationName.split(' ')[0])
  );
  if (nameKeywordMatch) confidence += 0.4;

  // Urban context patterns
  const urbanIndicators = ['plaza', 'square', 'park', 'street', 'avenue', 'center', 'market', 'station'];
  const hasUrbanContext = urbanIndicators.some(indicator => locationName.includes(indicator));
  
  if (hasUrbanContext) {
    const urbanPatterns = ['pedestrian', 'public', 'community', 'activity', 'circulation', 'open'];
    const isUrbanPattern = urbanPatterns.some(urban => 
      patternKeywords.some((keyword: string) => keyword.includes(urban)) || patternName.includes(urban)
    );
    if (isUrbanPattern) confidence += 0.25;
  }

  // EXPANDED ARCHITECTURAL FACTORS

  // 1. MORPHOLOGICAL & SPATIAL ANALYSIS
  if (analysis.spatialCharacteristics.enclosure && ['courtyard', 'enclosed', 'boundary', 'cluster'].some(k => patternKeywords.includes(k))) {
    confidence += 0.3;
  }
  
  if (analysis.spatialCharacteristics.connectivity && ['network', 'path', 'connection', 'circulation'].some(k => patternKeywords.includes(k))) {
    confidence += 0.25;
  }

  if (analysis.spatialCharacteristics.hierarchy && ['main', 'primary', 'center', 'nucleus'].some(k => patternKeywords.includes(k))) {
    confidence += 0.2;
  }

  // 2. TEMPORAL PATTERNS & ACTIVITY RHYTHMS
  if (analysis.temporalPatterns.peakActivity && ['activity', 'life', 'energy', 'nodes'].some(k => patternKeywords.includes(k))) {
    confidence += 0.3;
  }

  if (analysis.temporalPatterns.multiUse && ['mixed', 'diverse', 'varied', 'multifunctional'].some(k => patternKeywords.includes(k))) {
    confidence += 0.25;
  }

  // 3. ENVIRONMENTAL & CLIMATIC FACTORS
  if (analysis.environmental.naturalLight && ['light', 'window', 'sun', 'brightness'].some(k => patternKeywords.includes(k))) {
    confidence += 0.2;
  }

  if (analysis.environmental.weatherProtection && ['shelter', 'covered', 'protected', 'canopy'].some(k => patternKeywords.includes(k))) {
    confidence += 0.15;
  }

  if (analysis.environmental.airQuality && ['ventilation', 'air', 'breeze', 'openness'].some(k => patternKeywords.includes(k))) {
    confidence += 0.15;
  }

  // 4. HUMAN SCALE & ERGONOMICS
  if (analysis.humanScale.walkability && ['pedestrian', 'walking', 'path', 'promenade'].some(k => patternKeywords.includes(k))) {
    confidence += 0.25;
  }

  if (analysis.humanScale.intimacy && ['intimate', 'human', 'scale', 'comfortable'].some(k => patternKeywords.includes(k))) {
    confidence += 0.2;
  }

  if (analysis.humanScale.accessibility && ['access', 'entrance', 'threshold', 'barrier'].some(k => patternKeywords.includes(k))) {
    confidence += 0.15;
  }

  // 5. SOCIO-CULTURAL DYNAMICS
  if (analysis.socialDynamics.communityGathering && ['community', 'gathering', 'meeting', 'social'].some(k => patternKeywords.includes(k))) {
    confidence += 0.3;
  }

  if (analysis.socialDynamics.privacy && ['privacy', 'retreat', 'quiet', 'solitude'].some(k => patternKeywords.includes(k))) {
    confidence += 0.15;
  }

  if (analysis.socialDynamics.territoriality && ['territory', 'boundary', 'ownership', 'control'].some(k => patternKeywords.includes(k))) {
    confidence += 0.15;
  }

  // 6. ECONOMIC & FUNCTIONAL PATTERNS
  if (analysis.economic.workIntegration && ['work', 'office', 'workshop', 'craft'].some(k => patternKeywords.includes(k))) {
    confidence += 0.2;
  }

  if (analysis.economic.marketActivity && ['market', 'commerce', 'trade', 'shop'].some(k => patternKeywords.includes(k))) {
    confidence += 0.2;
  }

  // 7. INFRASTRUCTURE & TECHNICAL SYSTEMS
  if (analysis.infrastructure.transportation && ['transport', 'transit', 'bus', 'station'].some(k => patternKeywords.includes(k))) {
    confidence += 0.2;
  }

  if (analysis.infrastructure.utilities && ['service', 'utility', 'infrastructure', 'system'].some(k => patternKeywords.includes(k))) {
    confidence += 0.1;
  }

  // 8. BIOPHILIC & ECOLOGICAL INTEGRATION
  if (analysis.ecological.greenIntegration && ['green', 'garden', 'tree', 'nature'].some(k => patternKeywords.includes(k))) {
    confidence += 0.25;
  }

  if (analysis.ecological.waterFeatures && ['water', 'fountain', 'stream', 'pond'].some(k => patternKeywords.includes(k))) {
    confidence += 0.2;
  }

  if (analysis.ecological.biodiversity && ['wildlife', 'habitat', 'ecosystem', 'natural'].some(k => patternKeywords.includes(k))) {
    confidence += 0.15;
  }

  // Popular Alexander patterns that apply to most locations
  const commonPatterns = [61, 106, 125, 171, 183];
  if (commonPatterns.includes(pattern.number)) {
    confidence += 0.1;
  }

  // Add slight variation for natural pattern distribution
  confidence += (Math.random() - 0.5) * 0.05;
  
  return Math.max(0.15, Math.min(0.95, confidence));
}

// Comprehensive architectural analysis function
function analyzeLocationArchitecturalFactors(location: any) {
  const lat = parseFloat(location.latitude);
  const lng = parseFloat(location.longitude);
  const locationName = (location.name || '').toLowerCase();

  return {
    // Spatial and morphological characteristics
    spatialCharacteristics: {
      enclosure: locationName.includes('court') || locationName.includes('plaza') || locationName.includes('square'),
      connectivity: locationName.includes('intersection') || locationName.includes('junction') || locationName.includes('hub'),
      hierarchy: locationName.includes('center') || locationName.includes('main') || locationName.includes('central'),
      permeability: locationName.includes('path') || locationName.includes('walk') || locationName.includes('passage')
    },

    // Temporal patterns and activity rhythms
    temporalPatterns: {
      peakActivity: locationName.includes('market') || locationName.includes('station') || locationName.includes('school'),
      multiUse: locationName.includes('mixed') || locationName.includes('complex') || locationName.includes('center'),
      seasonality: Math.abs(lat) > 40, // Higher latitudes have more seasonal variation
      nightActivity: locationName.includes('restaurant') || locationName.includes('bar') || locationName.includes('theater')
    },

    // Environmental and climatic considerations
    environmental: {
      naturalLight: true, // Assume natural light is important everywhere
      weatherProtection: Math.abs(lat) > 30 || locationName.includes('covered') || locationName.includes('shelter'),
      airQuality: !locationName.includes('highway') && !locationName.includes('industrial'),
      microclimate: locationName.includes('garden') || locationName.includes('park') || locationName.includes('courtyard')
    },

    // Human scale and ergonomic factors
    humanScale: {
      walkability: !locationName.includes('highway') && !locationName.includes('freeway'),
      intimacy: locationName.includes('garden') || locationName.includes('cafe') || locationName.includes('home'),
      accessibility: !locationName.includes('hill') && !locationName.includes('stairs'),
      wayfinding: locationName.includes('landmark') || locationName.includes('tower') || locationName.includes('monument')
    },

    // Social and cultural dynamics
    socialDynamics: {
      communityGathering: locationName.includes('community') || locationName.includes('public') || locationName.includes('common'),
      privacy: locationName.includes('residential') || locationName.includes('private') || locationName.includes('quiet'),
      territoriality: locationName.includes('neighborhood') || locationName.includes('district') || locationName.includes('zone'),
      culturalSignificance: locationName.includes('historic') || locationName.includes('cultural') || locationName.includes('heritage')
    },

    // Economic and functional patterns
    economic: {
      workIntegration: locationName.includes('office') || locationName.includes('business') || locationName.includes('industrial'),
      marketActivity: locationName.includes('market') || locationName.includes('shop') || locationName.includes('retail'),
      serviceAccess: locationName.includes('hospital') || locationName.includes('school') || locationName.includes('library'),
      resourceEfficiency: locationName.includes('sustainable') || locationName.includes('green') || locationName.includes('eco')
    },

    // Infrastructure and technical systems
    infrastructure: {
      transportation: locationName.includes('station') || locationName.includes('terminal') || locationName.includes('stop'),
      utilities: locationName.includes('service') || locationName.includes('utility') || locationName.includes('technical'),
      communication: locationName.includes('tower') || locationName.includes('antenna') || locationName.includes('digital'),
      waste: locationName.includes('recycling') || locationName.includes('waste') || locationName.includes('disposal')
    },

    // Biophilic and ecological integration
    ecological: {
      greenIntegration: locationName.includes('park') || locationName.includes('garden') || locationName.includes('green'),
      waterFeatures: locationName.includes('water') || locationName.includes('fountain') || locationName.includes('lake'),
      biodiversity: locationName.includes('wildlife') || locationName.includes('nature') || locationName.includes('preserve'),
      climateResilience: locationName.includes('flood') || locationName.includes('drought') || locationName.includes('storm')
    }
  };
}

// Helper function for path quality calculation in communication
function calculatePathQualityForCommunication(pathData: any): number {
  const baseScore = 0.5;
  const patternBonus = (pathData.patterns?.length || 0) * 0.1;
  const insightBonus = (pathData.insights?.length || 0) * 0.05;
  const distanceBonus = Math.min((pathData.totalDistance || 0) / 10, 0.2); // Cap at 0.2
  return Math.min(1.0, baseScore + patternBonus + insightBonus + distanceBonus);
}

// Helper function to get timezone from coordinates (approximate)
function getTimezoneFromCoordinates(lat: number, lng: number): string {
  // Simple timezone approximation based on longitude
  const offsetHours = Math.round(lng / 15);
  const utcOffset = offsetHours >= 0 ? `+${offsetHours}` : `${offsetHours}`;
  return `UTC${utcOffset}`;
}

// Analyze contextual data from OpenStreetMap with comprehensive architectural details
function analyzeContextualData(elements: any[]): any {
  const amenities = new Set<string>();
  const buildingTypes = new Set<string>();
  const architecturalStyles = new Set<string>();
  const buildingHeights = new Map<string, number>();
  const buildingLevels = new Map<string, number>();
  const buildingAges = new Map<string, number>();
  const buildingMaterials = new Set<string>();
  const roofShapes = new Set<string>();
  const commercialTypes = new Set<string>();
  const residentialTypes = new Set<string>();
  const transportNodes = new Set<string>();
  const naturalFeatures = new Set<string>();
  const historicalFeatures = new Set<string>();
  
  let roads = 0;
  let buildings = 0;
  let hasPublicTransport = false;
  let hasGreenSpace = false;
  let hasWaterFeature = false;
  let hasHistoricalSites = false;
  let totalBuildingHeight = 0;
  let totalBuildingLevels = 0;
  let buildingsWithHeightData = 0;
  let buildingsWithLevelData = 0;
  
  elements.forEach(element => {
    const tags = element.tags || {};
    
    // Enhanced road analysis with road types
    if (tags.highway) {
      roads++;
      if (tags.highway === 'motorway' || tags.highway === 'trunk') {
        transportNodes.add(`major_road: ${tags.highway}`);
      } else if (tags.highway === 'residential' || tags.highway === 'living_street') {
        transportNodes.add(`local_road: ${tags.highway}`);
      }
    }
    
    // Comprehensive building analysis
    if (tags.building) {
      buildings++;
      
      // Building type classification
      if (tags.building !== 'yes') {
        buildingTypes.add(tags.building);
        
        // Categorize by function
        if (['residential', 'apartments', 'house', 'detached', 'semidetached_house', 'terrace'].includes(tags.building)) {
          residentialTypes.add(tags.building);
        } else if (['commercial', 'retail', 'office', 'industrial', 'warehouse', 'supermarket'].includes(tags.building)) {
          commercialTypes.add(tags.building);
        }
      }
      
      // Extract building height information
      if (tags.height) {
        const height = parseFloat(tags.height.replace('m', ''));
        if (!isNaN(height)) {
          buildingHeights.set(element.id, height);
          totalBuildingHeight += height;
          buildingsWithHeightData++;
        }
      }
      
      // Extract building levels/stories
      if (tags['building:levels']) {
        const levels = parseInt(tags['building:levels']);
        if (!isNaN(levels)) {
          buildingLevels.set(element.id, levels);
          totalBuildingLevels += levels;
          buildingsWithLevelData++;
        }
      }
      
      // Building age analysis
      if (tags['start_date'] || tags['construction_date']) {
        const dateStr = tags['start_date'] || tags['construction_date'];
        const year = parseInt(dateStr.split('-')[0]);
        if (!isNaN(year)) {
          buildingAges.set(element.id, new Date().getFullYear() - year);
        }
      }
      
      // Architectural style
      if (tags['architectural_style'] || tags['building:architecture']) {
        const style = tags['architectural_style'] || tags['building:architecture'];
        architecturalStyles.add(style);
      }
      
      // Building materials
      if (tags['building:material']) {
        buildingMaterials.add(tags['building:material']);
      }
      
      // Roof information
      if (tags['roof:shape']) {
        roofShapes.add(tags['roof:shape']);
      }
    }
    
    // Enhanced amenity analysis
    if (tags.amenity) {
      amenities.add(tags.amenity);
      
      // Public transport detection
      if (['bus_station', 'subway_entrance', 'train_station', 'tram_stop', 'bus_stop'].includes(tags.amenity)) {
        hasPublicTransport = true;
        transportNodes.add(`transport: ${tags.amenity}`);
      }
      
      // Educational and cultural amenities
      if (['school', 'university', 'library', 'museum', 'theatre', 'cinema'].includes(tags.amenity)) {
        amenities.add(`cultural: ${tags.amenity}`);
      }
      
      // Healthcare amenities
      if (['hospital', 'clinic', 'pharmacy', 'dentist', 'veterinary'].includes(tags.amenity)) {
        amenities.add(`healthcare: ${tags.amenity}`);
      }
    }
    
    // Shop analysis
    if (tags.shop) {
      amenities.add(`shop: ${tags.shop}`);
      commercialTypes.add(`shop: ${tags.shop}`);
    }
    
    // Public transport infrastructure
    if (tags.public_transport) {
      hasPublicTransport = true;
      transportNodes.add(`transport: ${tags.public_transport}`);
    }
    
    // Enhanced green space analysis
    if (tags.leisure === 'park' || tags.landuse === 'forest' || tags.landuse === 'grass' || 
        tags.leisure === 'garden' || tags.landuse === 'recreation_ground') {
      hasGreenSpace = true;
      naturalFeatures.add(`green: ${tags.leisure || tags.landuse}`);
    }
    
    // Water features
    if (tags.water || tags.waterway || tags.natural === 'water') {
      hasWaterFeature = true;
      naturalFeatures.add(`water: ${tags.water || tags.waterway || tags.natural}`);
    }
    
    // Historical and cultural features
    if (tags.historic || tags.tourism === 'attraction') {
      hasHistoricalSites = true;
      historicalFeatures.add(`historic: ${tags.historic || tags.tourism}`);
    }
  });

  // Calculate comprehensive building statistics
  const averageBuildingHeight = buildingsWithHeightData > 0 ? totalBuildingHeight / buildingsWithHeightData : null;
  const averageBuildingLevels = buildingsWithLevelData > 0 ? totalBuildingLevels / buildingsWithLevelData : null;
  
  // Determine dominant building height category
  let buildingHeightCategory = 'mixed';
  if (averageBuildingLevels) {
    if (averageBuildingLevels <= 2) buildingHeightCategory = 'low-rise';
    else if (averageBuildingLevels <= 4) buildingHeightCategory = 'mid-rise';
    else if (averageBuildingLevels <= 8) buildingHeightCategory = 'high-rise';
    else buildingHeightCategory = 'skyscraper';
  }
  
  // Calculate urban density based on building count and types
  let urbanDensity: 'low' | 'medium' | 'high' = 'low';
  if (buildings > 50) urbanDensity = 'high';
  else if (buildings > 20) urbanDensity = 'medium';

  // Enhanced walkability calculation
  let walkabilityScore = 30; // Base score
  walkabilityScore += Math.min(amenities.size * 3, 30); // Amenity diversity
  walkabilityScore += hasPublicTransport ? 20 : 0;
  walkabilityScore += hasGreenSpace ? 15 : 0;
  walkabilityScore += hasWaterFeature ? 10 : 0;
  walkabilityScore += Array.from(commercialTypes).length > 5 ? 15 : 0; // Commercial diversity
  walkabilityScore += roads > 10 ? -10 : 0; // Too many roads reduce walkability
  
  // Determine primary land use
  let landUse = 'mixed';
  const residentialCount = residentialTypes.size;
  const commercialCount = commercialTypes.size;
  
  if (residentialCount > commercialCount * 2) {
    landUse = 'residential';
  } else if (commercialCount > residentialCount * 2) {
    landUse = 'commercial';
  } else if (Array.from(amenities).some(a => a.includes('industrial'))) {
    landUse = 'industrial';
  }

  // Traffic level based on road density and types
  let trafficLevel: 'low' | 'medium' | 'high' = 'low';
  const hasHighwayAccess = Array.from(transportNodes).some(t => t.includes('major_road'));
  if (roads > 15 || hasHighwayAccess) trafficLevel = 'high';
  else if (roads > 8) trafficLevel = 'medium';

  // Calculate Alexander pattern adherence indicators
  const alexanderPatternIndicators = {
    fourStoryLimit: averageBuildingLevels ? averageBuildingLevels <= 4 : null,
    humanScale: buildingHeightCategory === 'low-rise' || buildingHeightCategory === 'mid-rise',
    mixedUse: landUse === 'mixed',
    pedestrianFriendly: walkabilityScore > 60,
    greenSpaceAccess: hasGreenSpace,
    publicTransportAccess: hasPublicTransport,
    communitySpaces: Array.from(amenities).some(a => a.includes('community') || a.includes('park')),
    architecturalDiversity: buildingTypes.size > 3
  };

  return {
    // Basic characteristics
    landUse,
    urbanDensity,
    walkabilityScore: Math.min(walkabilityScore, 100),
    publicTransportAccess: hasPublicTransport,
    trafficLevel,
    
    // Building analysis
    buildingCount: buildings,
    buildingTypes: Array.from(buildingTypes).slice(0, 8),
    averageBuildingHeight: averageBuildingHeight ? Math.round(averageBuildingHeight * 10) / 10 : null,
    averageNumberOfStories: averageBuildingLevels ? Math.round(averageBuildingLevels * 10) / 10 : null,
    buildingHeightCategory,
    buildingsWithHeightData,
    buildingsWithLevelData,
    
    // Architectural details
    architecturalStyles: Array.from(architecturalStyles).slice(0, 5),
    buildingMaterials: Array.from(buildingMaterials).slice(0, 5),
    roofShapes: Array.from(roofShapes).slice(0, 5),
    
    // Land use breakdown
    residentialTypes: Array.from(residentialTypes).slice(0, 5),
    commercialTypes: Array.from(commercialTypes).slice(0, 8),
    
    // Infrastructure and amenities
    nearbyAmenities: Array.from(amenities).slice(0, 12),
    transportNodes: Array.from(transportNodes).slice(0, 8),
    naturalFeatures: Array.from(naturalFeatures).slice(0, 6),
    historicalFeatures: Array.from(historicalFeatures).slice(0, 4),
    
    // Environmental factors
    hasGreenSpace,
    hasWaterFeature,
    hasHistoricalSites,
    greenSpaceDistance: hasGreenSpace ? 100 : 500,
    
    // Derived metrics
    populationDensity: buildings * 25, // Rough estimate
    noiseLevel: trafficLevel === 'high' ? 'loud' : trafficLevel === 'medium' ? 'moderate' : 'quiet',
    
    // Alexander pattern adherence
    alexanderPatternIndicators,
    
    // Summary metrics
    diversityScore: Math.min((buildingTypes.size + amenities.size + naturalFeatures.size) * 2, 100),
    livabilityScore: Math.round((walkabilityScore + (hasGreenSpace ? 20 : 0) + (hasWaterFeature ? 10 : 0)) * 0.8)
  };
}
