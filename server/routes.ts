import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage-clean";
import { insertLocationSchema, insertVoteSchema, insertActivitySchema, insertSpatialPointSchema, insertUserCommentSchema, insertUserMediaSchema } from "@shared/schema";
import { communityAgent } from "./community-agent";
import { locationAnalyzer } from "./location-pattern-analyzer";
import { dataTokenService } from "./data-token-service";
import { dataMarketplace } from "./data-marketplace";
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

  // Vote on a pattern suggestion with weighted voting based on movement patterns
  app.post("/api/votes", async (req, res) => {
    try {
      const { suggestionId, sessionId, voteType, locationId } = req.body;
      
      // Check if user already voted on this suggestion
      const existingVote = await storage.getUserVoteForSuggestion(suggestionId, sessionId);
      if (existingVote) {
        return res.status(400).json({ message: "Already voted on this suggestion" });
      }

      // Use weighted voting service for comprehensive movement-based analysis
      const { weightedVotingService } = await import("./weighted-voting-service");
      
      // Get weighted voting eligibility
      const eligibility = await weightedVotingService.calculateWeightedVotingEligibility(sessionId, locationId);
      
      if (!eligibility.canVote) {
        return res.status(403).json({ 
          message: "Not eligible to vote on this location", 
          reason: eligibility.eligibilityReason,
          timeSpent: eligibility.baseTimeMinutes,
          movementBreakdown: eligibility.movementBreakdown
        });
      }

      // Cast weighted vote
      await weightedVotingService.castWeightedVote({
        suggestionId,
        sessionId,
        voteType,
        weight: eligibility.totalWeight,
        locationId,
        movementData: eligibility.movementBreakdown,
        timeSpentBreakdown: eligibility.movementBreakdown.reduce((acc, m) => {
          acc[m.movementType] = m.timeSpentMinutes;
          return acc;
        }, {} as Record<string, number>)
      });

      // Create activity record with movement details
      const movementSummary = eligibility.movementBreakdown
        .filter(m => m.timeSpentMinutes > 0)
        .map(m => `${m.timeSpentMinutes.toFixed(1)}min ${m.movementType}`)
        .join(', ');

      await storage.createActivity({
        type: "vote",
        description: `Voted ${voteType} with ${eligibility.totalWeight.toFixed(2)}x weight from: ${movementSummary}`,
        locationId,
        sessionId
      });

      res.json({ 
        success: true,
        weight: eligibility.totalWeight,
        timeSpent: eligibility.baseTimeMinutes,
        movementBreakdown: eligibility.movementBreakdown,
        weightComponents: eligibility.weightComponents,
        eligibilityReason: eligibility.eligibilityReason
      });
    } catch (error: any) {
      console.error("Weighted voting error:", error);
      res.status(500).json({ message: error.message });
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

  // Live pattern suggestions endpoint for real-time updates
  app.get('/api/patterns/live', async (req: any, res) => {
    try {
      const { lat, lng, sessionId, accuracy, movement } = req.query;
      
      if (!lat || !lng || !sessionId) {
        return res.status(400).json({ message: 'Missing required parameters: lat, lng, sessionId' });
      }

      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);
      const gpsAccuracy = parseFloat(accuracy) || 100;
      const movementType = movement || 'unknown';
      
      console.log(`Live pattern analysis for ${latitude}, ${longitude} (±${gpsAccuracy}m, ${movementType})`);
      
      // Enhanced pattern analysis using the enhanced pattern analyzer
      const { enhancedPatternAnalyzer } = await import('./enhanced-pattern-analyzer');
      
      // Create architectural context for enhanced analysis
      const architecturalContext = {
        latitude,
        longitude,
        populationDensity: 2000, // Default urban density
        areaSize: 1.0, // 1 km² analysis area
        buildingHeights: {
          averageStories: 3,
          maxStories: 6,
          predominantHeight: 'mid-rise' as const,
          heightVariation: 0.7
        },
        spatialConfiguration: {
          blockSize: 100,
          streetWidth: 12,
          openSpaceRatio: 0.2,
          connectivity: 0.8,
          permeability: 0.7
        },
        buildingTypology: {
          predominantType: 'mixed' as const,
          buildingFootprint: 400,
          lotCoverage: 0.6,
          setbackVariation: 0.5
        },
        humanScale: {
          eyeLevelActivity: 0.7,
          pedestrianComfort: 0.6,
          socialSpaces: 3,
          transitionalSpaces: 5
        },
        accessibilityMetrics: {
          transitAccess: true,
          bikeInfrastructure: 0.6,
          walkability: 75,
          carDependency: 0.4
        },
        landUsePattern: {
          mixedUse: 0.8,
          primaryUse: 'mixed' as const,
          useDiversity: 0.7,
          groundFloorUses: ['retail', 'cafe', 'residential']
        },
        naturalElements: {
          treeCanopyCover: 0.3,
          waterAccess: false,
          topographyVariation: 0.2,
          viewCorridors: 2
        },
        socialInfrastructure: {
          communitySpaces: 2,
          educationalFacilities: 1,
          healthcareFacilities: 1,
          culturalFacilities: 1,
          religiousSpaces: 1
        }
      };

      // Get enhanced pattern matches
      const enhancedMatches = enhancedPatternAnalyzer.analyzePatterns(architecturalContext);
      
      // Convert to our pattern format and filter by confidence
      const livePatterns = enhancedMatches
        .filter(match => match.confidence > 0.4) // Lower threshold for live updates
        .slice(0, 8) // Limit to top 8 patterns for performance
        .map(match => ({
          id: Date.now() + match.pattern.number, // Temporary ID for live patterns
          number: match.pattern.number,
          name: match.pattern.name,
          description: match.pattern.description,
          fullDescription: match.pattern.fullDescription,
          category: match.pattern.category,
          keywords: match.pattern.keywords,
          iconName: match.pattern.iconName,
          moodColor: match.pattern.moodColor,
          confidence: match.confidence,
          votes: 0,
          userVote: null,
          isLive: true, // Mark as live pattern
          locationId: null,
          contextualAnalysis: JSON.stringify({
            architecturalFit: match.architecturalFit,
            keyMetrics: match.keyMetrics,
            implementationGuidance: match.implementationGuidance,
            reasons: match.reasons,
            movementContext: {
              type: movementType,
              accuracy: gpsAccuracy,
              timestamp: new Date().toISOString()
            }
          }),
          sessionId
        }));

      // Store live tracking data for pattern analysis
      try {
        await storage.createTrackingPoint({
          sessionId,
          latitude: latitude.toString(),
          longitude: longitude.toString(),
          movementType,
          speed: '0',
          accuracy: gpsAccuracy.toString(),
          metadata: JSON.stringify({
            patternsGenerated: livePatterns.length,
            topPatternConfidence: livePatterns[0]?.confidence || 0,
            analysisType: 'live_enhanced',
            timestamp: new Date().toISOString()
          }),
          type: 'live_pattern_analysis'
        });
      } catch (error) {
        console.error('Failed to store live tracking data:', error);
      }

      console.log(`Generated ${livePatterns.length} live patterns with enhanced analysis`);
      res.json(livePatterns);
    } catch (error) {
      console.error('Error generating live patterns:', error);
      res.status(500).json({ message: 'Failed to generate live patterns' });
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

  // Live Community Voting Endpoints

  // Get voting eligibility for a location
  app.get('/api/voting/eligibility', async (req: any, res) => {
    try {
      const { sessionId, locationId } = req.query;
      
      if (!sessionId || !locationId) {
        return res.status(400).json({ message: 'Missing required parameters: sessionId, locationId' });
      }

      const { weightedVotingService } = await import("./weighted-voting-service");
      const eligibility = await weightedVotingService.calculateWeightedVotingEligibility(sessionId, parseInt(locationId));
      
      res.json(eligibility);
    } catch (error) {
      console.error('Error checking voting eligibility:', error);
      res.status(500).json({ message: 'Failed to check voting eligibility' });
    }
  });

  // Get active voting patterns for a location with live data
  app.get('/api/voting/active-patterns', async (req: any, res) => {
    try {
      const { locationId } = req.query;
      
      if (!locationId) {
        return res.status(400).json({ message: 'Missing required parameter: locationId' });
      }

      // Get patterns for the location
      const patterns = await storage.getPatternsForLocation(parseInt(locationId), 'system');
      
      // Enhance with live voting data
      const activePatterns = await Promise.all(patterns.map(async (pattern) => {
        // Get recent vote activity
        const recentVotes = await storage.getRecentVotesForPattern(pattern.suggestionId, 10);
        
        // Calculate voting trend and engagement
        const recentActivity = recentVotes.map((vote: any) => ({
          voteType: vote.voteType,
          weight: vote.weight || 1,
          timeAgo: formatTimeAgo(vote.createdAt),
          movementType: vote.movementData?.dominantMovement || 'walking'
        }));

        // Calculate voting trend
        const recentUpvotes = recentVotes.filter((v: any) => v.voteType === 'up').length;
        const recentDownvotes = recentVotes.filter((v: any) => v.voteType === 'down').length;
        let votingTrend = 'stable';
        
        if (recentUpvotes > recentDownvotes * 1.5) votingTrend = 'rising';
        else if (recentDownvotes > recentUpvotes * 1.5) votingTrend = 'falling';

        // Calculate community engagement (0-1 based on recent activity)
        const communityEngagement = Math.min(1, recentVotes.length / 20);

        return {
          ...pattern,
          currentVotes: pattern.votes || 0,
          recentVoteActivity: recentActivity,
          votingTrend,
          communityEngagement
        };
      }));

      // Sort by engagement and recent activity
      activePatterns.sort((a, b) => {
        const aScore = a.communityEngagement + (a.recentVoteActivity.length / 10);
        const bScore = b.communityEngagement + (b.recentVoteActivity.length / 10);
        return bScore - aScore;
      });

      res.json(activePatterns);
    } catch (error) {
      console.error('Error fetching active patterns:', error);
      res.status(500).json({ message: 'Failed to fetch active patterns' });
    }
  });

  // Get recent voting activity for a location
  app.get('/api/voting/recent-activity', async (req: any, res) => {
    try {
      const { locationId, limit = 10 } = req.query;
      
      if (!locationId) {
        return res.status(400).json({ message: 'Missing required parameter: locationId' });
      }

      const recentActivity = await storage.getRecentVotingActivity(parseInt(locationId), parseInt(limit));
      
      // Format for display
      const formattedActivity = recentActivity.map((activity: any) => ({
        type: activity.voteType === 'up' ? 'vote_up' : 'vote_down',
        patternNumber: activity.patternNumber,
        patternName: activity.patternName,
        weight: activity.weight,
        movementType: activity.movementData?.dominantMovement || 'walking',
        timestamp: activity.createdAt,
        locationId: activity.locationId
      }));

      res.json(formattedActivity);
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      res.status(500).json({ message: 'Failed to fetch recent activity' });
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

  // Time tracking and weighted voting eligibility endpoints
  app.get("/api/time-tracking/:locationId", async (req, res) => {
    try {
      const sessionId = req.query.sessionId as string || "demo_session";
      const locationId = parseInt(req.params.locationId);
      
      // Use both old and new systems for comparison
      const { timeTrackingService } = await import("./time-tracking-service");
      const { weightedVotingService } = await import("./weighted-voting-service");
      
      const timeSpent = await timeTrackingService.calculateTimeAtLocation(sessionId, locationId);
      const basicEligibility = await timeTrackingService.calculateVotingEligibility(sessionId, locationId);
      const weightedEligibility = await weightedVotingService.calculateWeightedVotingEligibility(sessionId, locationId);
      
      res.json({
        timeTracking: timeSpent,
        basicVotingEligibility: basicEligibility,
        weightedVotingEligibility: weightedEligibility
      });
    } catch (error) {
      console.error("Error calculating time tracking:", error);
      res.status(500).json({ error: "Failed to calculate time tracking" });
    }
  });

  // Get weighted voting eligibility for a location
  app.get("/api/voting-eligibility/:locationId", async (req, res) => {
    try {
      const sessionId = req.query.sessionId as string || "demo_session";
      const locationId = parseInt(req.params.locationId);
      const { weightedVotingService } = await import("./weighted-voting-service");
      
      const eligibility = await weightedVotingService.calculateWeightedVotingEligibility(sessionId, locationId);
      
      res.json(eligibility);
    } catch (error) {
      console.error("Error calculating voting eligibility:", error);
      res.status(500).json({ error: "Failed to calculate voting eligibility" });
    }
  });

  // Get voting statistics for a pattern suggestion
  app.get("/api/voting-stats/:suggestionId", async (req, res) => {
    try {
      const suggestionId = parseInt(req.params.suggestionId);
      const { weightedVotingService } = await import("./weighted-voting-service");
      
      const stats = await weightedVotingService.getVotingStats(suggestionId);
      
      res.json(stats);
    } catch (error) {
      console.error("Error getting voting stats:", error);
      res.status(500).json({ error: "Failed to get voting stats" });
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
      const { deviceId, userId, deviceFingerprint, lat, lng } = req.body;
      
      // Check if device is already registered
      const existingRegistration = await storage.getDeviceRegistration(deviceId);
      if (existingRegistration) {
        // Update last seen timestamp
        await storage.updateDeviceLastSeen(deviceId);
        res.json({ 
          registered: true, 
          userId: existingRegistration.userId,
          username: existingRegistration.username,
          languageRegion: existingRegistration.languageRegion,
          message: 'Device already registered' 
        });
        return;
      }

      // Generate username based on GPS location using global language pools
      const { generateUsernameServer, getRegionNameServer } = await import("./username-generator-server");
      const username = generateUsernameServer(userId, lat, lng);
      const languageRegion = lat && lng ? getRegionNameServer(lat, lng) : "Global";

      // Register new device with GPS-based username
      const registration = await storage.createDeviceRegistration({
        deviceId,
        userId,
        username,
        deviceFingerprint,
        creationLatitude: lat,
        creationLongitude: lng,
        languageRegion,
        isActive: true
      });

      res.json({ 
        registered: true, 
        userId: registration.userId,
        username: registration.username,
        languageRegion: registration.languageRegion,
        message: 'Device registered successfully with GPS-based username' 
      });
    } catch (error: any) {
      console.error("Device registration error:", error);
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

  const httpServer = createServer(app);
  return httpServer;
}

function formatTimeAgo(timestamp: number | string | Date): string {
  const time = timestamp instanceof Date ? timestamp.getTime() : 
               typeof timestamp === 'string' ? new Date(timestamp).getTime() : 
               timestamp;
  const now = Date.now();
  const diffMinutes = Math.floor((now - time) / (1000 * 60));
  
  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
  return `${Math.floor(diffMinutes / 1440)}d ago`;
}

// Enhanced pattern matching algorithm
function calculatePatternConfidence(pattern: any, location: any): number {
  let confidence = 0.3; // Base confidence

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

  // Enhanced architectural context analysis
  const contextualData = analyzeContextualData([location]);
  
  // Building height and scale analysis (Alexander's key metric)
  if (pattern.number === 21) { // Four-Story Limit
    const estimatedStories = Math.min(6, Math.max(1, Math.floor(Math.random() * 4) + 1)); // Simulated building height data
    if (estimatedStories <= 4) {
      confidence += 0.4;
    } else {
      confidence -= 0.2;
    }
  }

  // Number of stories pattern analysis
  if (pattern.number === 96) { // Number of Stories
    const densityFactor = contextualData.populationDensity || 200;
    const idealStories = densityFactor > 300 ? 3 : 2;
    const estimatedStories = Math.min(8, Math.max(1, Math.floor(densityFactor / 150)));
    const deviation = Math.abs(estimatedStories - idealStories);
    if (deviation < 1) {
      confidence += 0.35;
    }
  }

  // Urban spatial configuration patterns
  const urbanIndicators = ['plaza', 'square', 'park', 'street', 'avenue', 'center', 'market', 'station'];
  const hasUrbanContext = urbanIndicators.some(indicator => locationName.includes(indicator));
  
  if (hasUrbanContext) {
    // Spatial relationship patterns
    if (pattern.number === 61) { // Small Public Squares
      confidence += 0.35; // Squares are ideal for this pattern
    }
    if (pattern.number === 100) { // Pedestrian Street
      if (locationName.includes('street') || locationName.includes('avenue')) {
        confidence += 0.4;
      }
    }
    if (pattern.number === 106) { // Positive Outdoor Space
      if (locationName.includes('plaza') || locationName.includes('square') || locationName.includes('park')) {
        confidence += 0.35;
      }
    }
    
    // General urban patterns
    const urbanPatterns = ['pedestrian', 'public', 'community', 'activity', 'circulation', 'open'];
    const isUrbanPattern = urbanPatterns.some(urban => 
      patternKeywords.some(keyword => keyword.includes(urban)) || patternName.includes(urban)
    );
    
    if (isUrbanPattern) {
      confidence += 0.25;
    }
  }

  // Building typology and land use patterns
  if (pattern.number === 95) { // Building Complex
    const mixedUseIndicators = ['center', 'complex', 'plaza', 'mall'];
    if (mixedUseIndicators.some(indicator => locationName.includes(indicator))) {
      confidence += 0.3;
    }
  }

  if (pattern.number === 88) { // Street Café
    const commercialIndicators = ['restaurant', 'cafe', 'shop', 'market', 'commercial'];
    if (commercialIndicators.some(indicator => locationName.includes(indicator))) {
      confidence += 0.4;
    }
  }

  // Accessibility and movement patterns
  if (pattern.number === 30) { // Activity Nodes
    const nodeIndicators = ['station', 'terminal', 'center', 'hub', 'interchange'];
    if (nodeIndicators.some(indicator => locationName.includes(indicator))) {
      confidence += 0.4;
    }
  }

  // Natural and environmental patterns
  if (pattern.number === 171) { // Tree Places
    const naturalIndicators = ['park', 'garden', 'grove', 'green', 'forest'];
    if (naturalIndicators.some(indicator => locationName.includes(indicator))) {
      confidence += 0.35;
    }
  }

  // Human scale and social patterns
  const socialKeywords = ['community', 'gathering', 'meeting', 'social', 'public', 'common'];
  const isSocialPattern = socialKeywords.some(social => 
    patternKeywords.some(keyword => keyword.includes(social)) || patternName.includes(social)
  );
  
  if (isSocialPattern) {
    confidence += 0.2;
  }

  // Density-based pattern matching
  const densityLevel = contextualData.populationDensity || 200;
  if (densityLevel > 500) { // High density
    const highDensityPatterns = [21, 30, 88, 100]; // Patterns that work well in dense areas
    if (highDensityPatterns.includes(pattern.number)) {
      confidence += 0.15;
    }
  } else if (densityLevel < 100) { // Low density
    const lowDensityPatterns = [37, 106, 171]; // Patterns for lower density areas
    if (lowDensityPatterns.includes(pattern.number)) {
      confidence += 0.15;
    }
  }

  // Transportation and accessibility context
  const transitIndicators = ['station', 'stop', 'terminal', 'transit'];
  const hasTransitAccess = transitIndicators.some(indicator => locationName.includes(indicator));
  if (hasTransitAccess) {
    const transitPatterns = [16, 30, 52]; // Patterns enhanced by transit access
    if (transitPatterns.includes(pattern.number)) {
      confidence += 0.2;
    }
  }

  // Frequently applicable Alexander patterns
  const commonPatterns = [61, 106, 125, 171, 183];
  if (commonPatterns.includes(pattern.number)) {
    confidence += 0.1;
  }

  // Add controlled variation for realistic analysis
  confidence += (Math.random() - 0.5) * 0.08;
  
  return Math.max(0.1, Math.min(0.95, confidence));
}

// Helper function to get timezone from coordinates (approximate)
function getTimezoneFromCoordinates(lat: number, lng: number): string {
  // Simple timezone approximation based on longitude
  const offsetHours = Math.round(lng / 15);
  const utcOffset = offsetHours >= 0 ? `+${offsetHours}` : `${offsetHours}`;
  return `UTC${utcOffset}`;
}

// Enhanced contextual analysis with architectural metrics from Alexander's patterns
function analyzeContextualData(elements: any[]): any {
  const amenities = new Set<string>();
  const buildingTypes = new Set<string>();
  let roads = 0;
  let buildings = 0;
  let hasPublicTransport = false;
  let hasGreenSpace = false;
  
  // Process OpenStreetMap data
  elements.forEach(element => {
    const tags = element.tags || {};
    
    if (tags.highway) roads++;
    if (tags.building) {
      buildings++;
      if (tags.building !== 'yes') buildingTypes.add(tags.building);
    }
    if (tags.amenity) {
      amenities.add(tags.amenity);
      if (tags.amenity === 'bus_station' || tags.amenity === 'subway_entrance') {
        hasPublicTransport = true;
      }
    }
    if (tags.shop) amenities.add(`shop: ${tags.shop}`);
    if (tags.public_transport) hasPublicTransport = true;
    if (tags.leisure === 'park' || tags.landuse === 'forest' || tags.landuse === 'grass') {
      hasGreenSpace = true;
    }
  });

  // Enhanced analysis with Alexander's architectural metrics
  const analysis = {
    // Basic demographic and land use
    populationDensity: buildings * 25 + Math.floor(Math.random() * 200), // Enhanced estimate
    landUse: 'mixed' as any,
    
    // Enhanced building metrics (Alexander's key focus)
    buildingHeights: {
      averageStories: Math.min(6, Math.max(1, Math.floor(buildings / 20) + 1)), // Stories based on building density
      maxStories: Math.min(12, Math.max(2, Math.floor(buildings / 10) + 2)),
      predominantHeight: 'low-rise' as any,
      heightVariation: Math.min(1, buildings / 100) // Height diversity based on building count
    },
    
    // Spatial configuration metrics
    spatialConfiguration: {
      blockSize: Math.max(60, Math.min(200, 120 - (roads * 5))), // Smaller blocks with more roads
      streetWidth: Math.min(15, Math.max(4, 6 + (roads / 10))), // Wider streets with more roads
      openSpaceRatio: hasGreenSpace ? Math.random() * 0.4 + 0.3 : Math.random() * 0.2 + 0.1,
      connectivity: Math.min(1, roads / 15), // Road density affects connectivity
      permeability: Math.min(1, (amenities.size + roads) / 20) // Amenities and roads improve permeability
    },
    
    // Building typology
    buildingTypology: {
      predominantType: buildings > 30 ? 'attached' : 'detached' as any,
      buildingFootprint: Math.max(200, Math.min(2000, buildings * 15)),
      lotCoverage: Math.min(0.8, Math.max(0.2, buildings / 100)),
      setbackVariation: Math.random() * 0.8 + 0.1
    },
    
    // Human scale metrics (crucial for Alexander's patterns)
    humanScale: {
      eyeLevelActivity: Math.min(1, amenities.size / 10), // More amenities = more street activity
      pedestrianComfort: hasGreenSpace ? Math.random() * 0.4 + 0.5 : Math.random() * 0.6,
      socialSpaces: hasGreenSpace ? Math.floor(Math.random() * 4) + 2 : Math.floor(Math.random() * 3),
      transitionalSpaces: Math.floor(amenities.size / 5)
    },
    
    // Accessibility and movement
    accessibilityScore: Math.min(100, 30 + (amenities.size * 5) + (hasPublicTransport ? 20 : 0) + (hasGreenSpace ? 10 : 0)),
    transitAccess: hasPublicTransport,
    walkabilityScore: Math.min(100, 30 + (amenities.size * 5) + (hasPublicTransport ? 20 : 0) + (hasGreenSpace ? 10 : 0)),
    bikeInfrastructure: hasGreenSpace ? Math.random() * 0.6 + 0.2 : Math.random() * 0.4,
    carDependency: roads > 10 ? Math.random() * 0.4 + 0.4 : Math.random() * 0.6,
    
    // Land use diversity
    landUsePattern: {
      mixedUse: Math.min(1, amenities.size / 15), // More amenities = more mixed use
      useDiversity: Math.min(1, buildingTypes.size / 8),
      groundFloorUses: Array.from(amenities).slice(0, 3).map(a => a.includes('shop') ? 'commercial' : 'institutional')
    },
    
    // Natural elements
    naturalElements: {
      treeCanopyCover: hasGreenSpace ? Math.random() * 0.5 + 0.3 : Math.random() * 0.3,
      waterAccess: Math.random() > 0.8, // 20% chance
      topographyVariation: Math.random() * 0.8,
      viewCorridors: hasGreenSpace ? Math.floor(Math.random() * 4) + 1 : Math.floor(Math.random() * 2)
    },
    
    // Social infrastructure
    socialInfrastructure: {
      communitySpaces: hasGreenSpace ? Math.floor(Math.random() * 3) + 1 : Math.floor(Math.random() * 2),
      educationalFacilities: amenities.has('school') ? 1 : 0,
      healthcareFacilities: amenities.has('hospital') || amenities.has('clinic') ? 1 : 0,
      culturalFacilities: amenities.has('library') || amenities.has('theatre') ? 1 : 0,
      religiousSpaces: amenities.has('place_of_worship') ? 1 : 0
    },
    
    // Legacy metrics for compatibility
    urbanDensity: buildings > 50 ? 'high' : buildings > 20 ? 'medium' : 'low',
    publicTransportAccess: hasPublicTransport,
    nearbyAmenities: Array.from(amenities).slice(0, 10),
    buildingTypes: Array.from(buildingTypes).slice(0, 5),
    greenSpaceDistance: hasGreenSpace ? 100 : 500,
    trafficLevel: roads > 15 ? 'high' : roads > 8 ? 'medium' : 'low',
    noiseLevel: roads > 15 ? 'loud' : roads > 8 ? 'moderate' : 'quiet'
  };

  // Determine land use based on amenities
  if (amenities.has('shop: residential') || buildingTypes.has('residential')) {
    analysis.landUse = 'residential';
    analysis.buildingHeights.averageStories = Math.min(3, analysis.buildingHeights.averageStories);
    analysis.buildingHeights.predominantHeight = 'low-rise';
  } else if (Array.from(amenities).some(a => a.startsWith('shop:')) || amenities.has('restaurant')) {
    analysis.landUse = 'commercial';
    analysis.humanScale.eyeLevelActivity = Math.min(1, analysis.humanScale.eyeLevelActivity + 0.3);
  }

  // Adjust building heights based on density
  if (analysis.populationDensity > 500) {
    analysis.buildingHeights.averageStories = Math.max(4, analysis.buildingHeights.averageStories);
    analysis.buildingHeights.predominantHeight = analysis.buildingHeights.averageStories > 6 ? 'high-rise' : 'mid-rise';
  }

  return analysis;
}
