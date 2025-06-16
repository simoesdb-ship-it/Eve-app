import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage-clean";
import { insertLocationSchema, insertVoteSchema, insertActivitySchema, insertSpatialPointSchema, insertUserCommentSchema, insertUserMediaSchema } from "@shared/schema";
import { communityAgent } from "./community-agent";
import { locationAnalyzer } from "./location-pattern-analyzer";
import { tokenEconomy } from "./token-economy";
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

      // Generate pattern suggestions using enhanced algorithm
      const patterns = await storage.getAllPatterns();
      const suggestions = [];

      console.log(`Analyzing ${patterns.length} patterns for location: ${location.name}`);

      for (const pattern of patterns) {
        const confidence = calculatePatternConfidence(pattern, location);
        console.log(`Pattern ${pattern.number} "${pattern.name}": confidence ${confidence.toFixed(3)}`);
        
        if (confidence > 0.5) {
          const suggestion = await storage.createPatternSuggestion({
            locationId: location.id,
            patternId: pattern.id,
            confidence: confidence.toString(),
            mlAlgorithm: "enhanced_keyword_spatial_matching"
          });
          suggestions.push(suggestion);
          console.log(`Created suggestion for pattern ${pattern.number} with confidence ${confidence.toFixed(3)}`);
        }
      }

      console.log(`Generated ${suggestions.length} pattern suggestions for location ${location.id}`);

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

      console.log(`Fetching patterns for location ${locationId}`);
      const patterns = await storage.getPatternsForLocation(locationId, sessionId);
      console.log(`Found ${patterns.length} patterns for location ${locationId}`);
      res.json(patterns);
    } catch (error) {
      console.error(`Error fetching patterns for location ${parseInt(req.params.id)}:`, error);
      res.status(500).json({ message: "Failed to fetch patterns for location", error: String(error) });
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

  // Get saved locations (community activity)
  app.get("/api/saved-locations", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const savedLocations = await storage.getSavedLocations(limit);
      res.json(savedLocations);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch saved locations" });
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
      const balance = await tokenEconomy.getTokenBalance(sessionId);
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

      const result = await tokenEconomy.uploadMedia(sessionId, locationId, {
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

      const result = await tokenEconomy.addComment(sessionId, locationId, {
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
      
      const transactions = await tokenEconomy.getTransactionHistory(sessionId, limit);
      res.json(transactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      res.status(500).json({ error: 'Failed to fetch transactions' });
    }
  });

  // Award tokens for saving location
  app.post('/api/tokens/award-location', async (req, res) => {
    try {
      const { sessionId, locationId } = req.body;
      
      if (!sessionId || !locationId) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const tokensAwarded = await tokenEconomy.awardTokens(
        sessionId,
        'location',
        locationId,
        'Saved new location'
      );

      res.json({ tokensAwarded });
    } catch (error) {
      console.error('Error awarding location tokens:', error);
      res.status(500).json({ error: 'Failed to award tokens' });
    }
  });

  // Get global token supply information
  app.get('/api/tokens/supply', async (req, res) => {
    try {
      const supply = await tokenEconomy.getTokenSupplyInfo();
      const rewardMultiplier = await tokenEconomy.getCurrentRewardMultiplier();
      
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

  const httpServer = createServer(app);
  return httpServer;
}

// Enhanced pattern matching algorithm
function calculatePatternConfidence(pattern: any, location: any): number {
  let confidence = 0.3; // Lower base confidence

  // Location name analysis
  const locationName = (location.name || '').toLowerCase();
  const patternKeywords = pattern.keywords.map((k: string) => k.toLowerCase());
  const patternName = pattern.name.toLowerCase();
  
  // Direct keyword matches in location name
  const nameKeywordMatch = patternKeywords.some(keyword => 
    locationName.includes(keyword) || keyword.includes(locationName.split(' ')[0])
  );
  
  if (nameKeywordMatch) {
    confidence += 0.4;
  }

  // Urban context patterns
  const urbanIndicators = ['plaza', 'square', 'park', 'street', 'avenue', 'center', 'market', 'station'];
  const hasUrbanContext = urbanIndicators.some(indicator => locationName.includes(indicator));
  
  if (hasUrbanContext) {
    // Boost patterns related to urban design
    const urbanPatterns = ['pedestrian', 'public', 'community', 'activity', 'circulation', 'open'];
    const isUrbanPattern = urbanPatterns.some(urban => 
      patternKeywords.some(keyword => keyword.includes(urban)) || patternName.includes(urban)
    );
    
    if (isUrbanPattern) {
      confidence += 0.3;
    }
  }

  // Community and social patterns get higher confidence
  const socialKeywords = ['community', 'gathering', 'meeting', 'social', 'public', 'common'];
  const isSocialPattern = socialKeywords.some(social => 
    patternKeywords.some(keyword => keyword.includes(social)) || patternName.includes(social)
  );
  
  if (isSocialPattern) {
    confidence += 0.2;
  }

  // Popular Alexander patterns that apply to most locations
  const commonPatterns = [61, 106, 125, 171, 183]; // Common patterns that often apply
  if (commonPatterns.includes(pattern.number)) {
    confidence += 0.15;
  }

  // Add slight randomization for variety
  confidence += Math.random() * 0.1;
  
  return Math.max(0.1, Math.min(0.95, confidence));
}

// Helper function to get timezone from coordinates (approximate)
function getTimezoneFromCoordinates(lat: number, lng: number): string {
  // Simple timezone approximation based on longitude
  const offsetHours = Math.round(lng / 15);
  const utcOffset = offsetHours >= 0 ? `+${offsetHours}` : `${offsetHours}`;
  return `UTC${utcOffset}`;
}

// Analyze contextual data from OpenStreetMap
function analyzeContextualData(elements: any[]): any {
  const amenities = new Set<string>();
  const buildingTypes = new Set<string>();
  let roads = 0;
  let buildings = 0;
  let hasPublicTransport = false;
  let hasGreenSpace = false;
  
  elements.forEach(element => {
    const tags = element.tags || {};
    
    // Count roads for traffic analysis
    if (tags.highway) {
      roads++;
    }
    
    // Count buildings for density
    if (tags.building) {
      buildings++;
      if (tags.building !== 'yes') {
        buildingTypes.add(tags.building);
      }
    }
    
    // Collect amenities
    if (tags.amenity) {
      amenities.add(tags.amenity);
      if (tags.amenity === 'bus_station' || tags.amenity === 'subway_entrance') {
        hasPublicTransport = true;
      }
    }
    
    // Check for shops
    if (tags.shop) {
      amenities.add(`shop: ${tags.shop}`);
    }
    
    // Check for public transport
    if (tags.public_transport) {
      hasPublicTransport = true;
    }
    
    // Check for green spaces
    if (tags.leisure === 'park' || tags.landuse === 'forest' || tags.landuse === 'grass') {
      hasGreenSpace = true;
    }
  });

  // Calculate urban density based on building count
  let urbanDensity: 'low' | 'medium' | 'high' = 'low';
  if (buildings > 50) urbanDensity = 'high';
  else if (buildings > 20) urbanDensity = 'medium';

  // Calculate walkability score based on amenities and infrastructure
  let walkabilityScore = 30; // Base score
  walkabilityScore += Math.min(amenities.size * 5, 40); // More amenities = better walkability
  walkabilityScore += hasPublicTransport ? 20 : 0;
  walkabilityScore += hasGreenSpace ? 10 : 0;
  
  // Determine land use
  let landUse = 'mixed';
  if (amenities.has('shop: residential') || buildingTypes.has('residential')) {
    landUse = 'residential';
  } else if (Array.from(amenities).some(a => a.startsWith('shop:')) || amenities.has('restaurant')) {
    landUse = 'commercial';
  }

  // Traffic level based on road density
  let trafficLevel: 'low' | 'medium' | 'high' = 'low';
  if (roads > 15) trafficLevel = 'high';
  else if (roads > 8) trafficLevel = 'medium';

  return {
    landUse,
    urbanDensity,
    walkabilityScore: Math.min(walkabilityScore, 100),
    publicTransportAccess: hasPublicTransport,
    nearbyAmenities: Array.from(amenities).slice(0, 10), // Limit to first 10
    buildingTypes: Array.from(buildingTypes).slice(0, 5),
    greenSpaceDistance: hasGreenSpace ? 100 : 500, // Approximate distance in meters
    trafficLevel,
    populationDensity: buildings * 25, // Rough estimate
    noiseLevel: trafficLevel === 'high' ? 'loud' : trafficLevel === 'medium' ? 'moderate' : 'quiet'
  };
}
