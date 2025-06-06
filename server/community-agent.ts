import { db } from "./db";
import { spatialPoints, patternSuggestions, patterns, locations } from "@shared/schema";
import { eq, sql, and } from "drizzle-orm";
import { getPatternByNumber, alexanderPatterns } from "./alexander-patterns";

export interface CommunityCluster {
  id: string;
  centerLat: number;
  centerLng: number;
  population: number; // estimated based on activity density
  area: number; // square kilometers
  density: number; // people per square km
  activityPatterns: {
    peakHours: number[];
    weeklyDistribution: number[];
    movementIntensity: number;
  };
  confidence: number; // how well it matches Alexander's pattern
  patternAnalysis: {
    patternNumber: number;
    patternName: string;
    adherence: number; // 0-1 score
    recommendations: string[];
    deviations: string[];
  };
  trackedCoordinates?: Array<{
    lat: number;
    lng: number;
    sessionId: string;
    timestamp: Date;
  }>; // preserve original tracking coordinates
}

export interface PatternInterpretation {
  pattern: {
    number: number;
    name: string;
    description: string;
    idealParameters: {
      populationRange: [number, number];
      densityRange: [number, number];
      areaRange: [number, number];
    };
  };
  detectedCommunities: CommunityCluster[];
  overallAssessment: {
    totalCommunities: number;
    conformingCommunities: number;
    averageAdherence: number;
    systemRecommendations: string[];
  };
}

export class CommunityAnalysisAgent {
  private readonly DBSCAN_EPSILON = 0.5; // km radius for clustering
  private readonly DBSCAN_MIN_POINTS = 3; // minimum points to form cluster
  private readonly ACTIVITY_DECAY_HOURS = 24; // hours for activity relevance

  async analyzeAllPatternMatches(): Promise<PatternInterpretation[]> {
    // Get all spatial data for comprehensive analysis
    const spatialData = await this.getAllSpatialData();
    
    // Detect community clusters using spatial analysis
    const clusters = await this.detectCommunities(spatialData);
    
    // Get all existing pattern suggestions from the database
    const existingPatternMatches = await this.getExistingPatternMatches();
    
    // Only analyze patterns that have been suggested for tracked locations
    const suggestedPatternNumbers = Array.from(new Set(existingPatternMatches.map(match => match.patternNumber)));
    
    console.log(`Analyzing ${suggestedPatternNumbers.length} suggested patterns against ${clusters.length} detected communities`);
    
    const interpretations: PatternInterpretation[] = [];
    
    // Analyze only suggested patterns
    for (const patternNumber of suggestedPatternNumbers) {
      const pattern = getPatternByNumber(patternNumber);
      if (pattern) {
        const interpretation = await this.interpretAgainstPattern(pattern, clusters);
        
        // Enhance interpretation with coordinate-specific context
        interpretation.detectedCommunities = interpretation.detectedCommunities.map(community => ({
          ...community,
          confidence: community.confidence * this.calculatePatternRelevance(pattern, existingPatternMatches)
        }));
        
        // Add specific contextual analysis for key patterns
        if (patternNumber === 12) {
          interpretation.overallAssessment.systemRecommendations.unshift(
            `Pattern suggested for tracked locations shows community size violations`,
            `Democratic participation becomes impossible beyond 7,000 people per community`
          );
        }
        
        interpretations.push(interpretation);
      }
    }
    
    console.log(`Completed analysis of ${interpretations.length} suggested patterns with ${clusters.length} communities`);
    
    return interpretations.sort((a, b) => b.overallAssessment.averageAdherence - a.overallAssessment.averageAdherence);
  }

  async analyzePattern(patternNumber: number): Promise<PatternInterpretation | null> {
    const pattern = getPatternByNumber(patternNumber);
    if (!pattern) {
      throw new Error(`Pattern #${patternNumber} not found`);
    }

    // Get all spatial data for community analysis
    const spatialData = await this.getAllSpatialData();
    
    // Detect community clusters using spatial analysis
    const clusters = await this.detectCommunities(spatialData);
    
    // Interpret clusters against the specified Alexander pattern
    const interpretation = await this.interpretAgainstPattern(pattern, clusters);
    
    return interpretation;
  }

  private async getExistingPatternMatches() {
    try {
      // Get all pattern suggestions that have been made in the system
      const suggestions = await db.select({
        patternId: patternSuggestions.patternId,
        patternNumber: patterns.number,
        confidence: patternSuggestions.confidence,
        locationId: patternSuggestions.locationId,
        locationLat: locations.latitude,
        locationLng: locations.longitude,
        createdAt: patternSuggestions.createdAt
      })
      .from(patternSuggestions)
      .innerJoin(patterns, eq(patternSuggestions.patternId, patterns.id))
      .innerJoin(locations, eq(patternSuggestions.locationId, locations.id))
      .where(sql`${patternSuggestions.createdAt} > NOW() - INTERVAL '30 days'`); // Last 30 days
      
      return suggestions;
    } catch (error) {
      // If tables don't exist or have no data, return empty array
      console.log('No pattern suggestions found, using empty array for analysis');
      return [];
    }
  }

  private calculatePatternRelevance(pattern: any, existingMatches: any[]): number {
    // Calculate how relevant this pattern is based on existing system suggestions
    const patternMatches = existingMatches.filter(match => match.patternNumber === pattern.number);
    const totalMatches = existingMatches.length;
    
    if (totalMatches === 0) return 0.5; // Base relevance
    
    const frequency = patternMatches.length / totalMatches;
    const avgConfidence = patternMatches.reduce((sum, match) => sum + Number(match.confidence), 0) / patternMatches.length || 0;
    
    return Math.min(frequency * 2 + avgConfidence, 1.0);
  }

  private isPatternRelevantToSpatialData(pattern: any, spatialData: any[], clusters: CommunityCluster[]): boolean {
    // Determine if a pattern is relevant to analyze based on current spatial data characteristics
    const { keywords, category, number } = pattern;
    
    // Always include key community and urban patterns
    if (number <= 25) return true; // Major town/city patterns
    
    // Include patterns based on detected community characteristics
    if (clusters.length > 0) {
      const maxPopulation = Math.max(...clusters.map(c => c.population));
      const maxDensity = Math.max(...clusters.map(c => c.density));
      const totalArea = clusters.reduce((sum, c) => sum + c.area, 0);
      
      // Urban density patterns (21, 95-106)
      if (maxDensity > 100 && (number === 21 || (number >= 95 && number <= 106))) return true;
      
      // Community size patterns (8-16, 37, 41, 74, 75)
      if (maxPopulation > 50 && [8, 9, 10, 11, 12, 13, 14, 15, 16, 37, 41, 74, 75].includes(number)) return true;
      
      // Public space patterns (30-36, 60-67)
      if ((number >= 30 && number <= 36) || (number >= 60 && number <= 67)) return true;
    }
    
    // Include patterns based on keywords matching spatial context
    const spatialKeywords = ['community', 'neighborhood', 'street', 'public', 'space', 'transportation', 'density', 'population'];
    if (keywords.some((k: string) => spatialKeywords.includes(k.toLowerCase()))) return true;
    
    // Include category-based relevance
    const relevantCategories = ['Community', 'Urban Design', 'Transportation', 'Public Space', 'Built Form'];
    if (relevantCategories.includes(category)) return true;
    
    return false;
  }

  private async getAllSpatialData() {
    // Get all spatial points with activity metadata
    const points = await db.select().from(spatialPoints)
      .where(sql`${spatialPoints.createdAt} > NOW() - INTERVAL '7 days'`); // Last week's data
    
    console.log('Found', points.length, 'spatial points for analysis');
    
    return points.map(point => {
      let metadata = {};
      
      // Handle metadata safely - it might be a string, object, or null
      if (point.metadata) {
        if (typeof point.metadata === 'string') {
          try {
            metadata = JSON.parse(point.metadata);
          } catch (e) {
            console.log('Failed to parse metadata string:', point.metadata);
            metadata = {};
          }
        } else if (typeof point.metadata === 'object') {
          metadata = point.metadata;
        }
      }
      
      return {
        id: point.id,
        lat: Number(point.latitude),
        lng: Number(point.longitude),
        type: point.type,
        sessionId: point.sessionId,
        timestamp: point.createdAt,
        metadata
      };
    });
  }

  private async detectCommunities(spatialData: any[]): Promise<CommunityCluster[]> {
    // Group by session to understand individual movement patterns
    const sessionGroups = this.groupBySession(spatialData);
    
    // Apply DBSCAN clustering to identify spatial communities
    const clusters = this.performDBSCANClustering(spatialData);
    
    // Analyze each cluster for community characteristics
    const communities: CommunityCluster[] = [];
    
    for (let i = 0; i < clusters.length; i++) {
      const cluster = clusters[i];
      if (cluster.points.length < this.DBSCAN_MIN_POINTS) continue;
      
      const community = await this.analyzeCommunityCluster(cluster, sessionGroups);
      if (community) {
        communities.push(community);
      }
    }
    
    return communities;
  }

  private groupBySession(spatialData: any[]) {
    const sessionMap = new Map();
    
    for (const point of spatialData) {
      if (!sessionMap.has(point.sessionId)) {
        sessionMap.set(point.sessionId, []);
      }
      sessionMap.get(point.sessionId).push(point);
    }
    
    return sessionMap;
  }

  private performDBSCANClustering(points: any[]) {
    const clusters: { points: any[], centroid: { lat: number, lng: number } }[] = [];
    const visited = new Set();
    const noise: any[] = [];
    
    for (const point of points) {
      if (visited.has(point.id)) continue;
      
      const neighbors = this.getNeighbors(point, points, this.DBSCAN_EPSILON);
      
      if (neighbors.length < this.DBSCAN_MIN_POINTS) {
        noise.push(point);
        continue;
      }
      
      // Create new cluster
      const cluster = { points: [point], centroid: { lat: 0, lng: 0 } };
      visited.add(point.id);
      
      // Expand cluster
      let i = 0;
      while (i < neighbors.length) {
        const neighbor = neighbors[i];
        
        if (!visited.has(neighbor.id)) {
          visited.add(neighbor.id);
          const neighborNeighbors = this.getNeighbors(neighbor, points, this.DBSCAN_EPSILON);
          
          if (neighborNeighbors.length >= this.DBSCAN_MIN_POINTS) {
            neighbors.push(...neighborNeighbors.filter(n => !neighbors.some(existing => existing.id === n.id)));
          }
        }
        
        if (!cluster.points.some(p => p.id === neighbor.id)) {
          cluster.points.push(neighbor);
        }
        
        i++;
      }
      
      // Calculate centroid
      cluster.centroid = this.calculateCentroid(cluster.points);
      clusters.push(cluster);
    }
    
    return clusters;
  }

  private getNeighbors(point: any, allPoints: any[], epsilon: number) {
    return allPoints.filter(other => {
      if (other.id === point.id) return false;
      const distance = this.calculateDistance(point.lat, point.lng, other.lat, other.lng);
      return distance <= epsilon;
    });
  }

  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private calculateCentroid(points: any[]) {
    const lat = points.reduce((sum, p) => sum + p.lat, 0) / points.length;
    const lng = points.reduce((sum, p) => sum + p.lng, 0) / points.length;
    return { lat, lng };
  }

  private async analyzeCommunityCluster(cluster: any, sessionGroups: Map<string, any[]>): Promise<CommunityCluster | null> {
    // Estimate population based on unique sessions and activity density
    const uniqueSessions = new Set(cluster.points.map((p: any) => p.sessionId));
    const estimatedPopulation = this.estimatePopulation(cluster, sessionGroups);
    
    // Calculate area (using convex hull approximation)
    const area = this.calculateClusterArea(cluster.points);
    const density = estimatedPopulation / area;
    
    // Analyze activity patterns
    const activityPatterns = this.analyzeActivityPatterns(cluster.points);
    
    // Generate unique cluster ID
    const clusterId = `cluster_${cluster.centroid.lat.toFixed(4)}_${cluster.centroid.lng.toFixed(4)}`;
    
    return {
      id: clusterId,
      centerLat: cluster.centroid.lat,
      centerLng: cluster.centroid.lng,
      population: estimatedPopulation,
      area: area,
      density: density,
      activityPatterns: activityPatterns,
      confidence: this.calculateClusterConfidence(cluster, estimatedPopulation, area),
      patternAnalysis: {
        patternNumber: 0, // Will be filled by interpretAgainstPattern
        patternName: '',
        adherence: 0,
        recommendations: [],
        deviations: []
      },
      trackedCoordinates: cluster.points.map((p: any) => ({
        lat: p.lat,
        lng: p.lng,
        sessionId: p.sessionId,
        timestamp: new Date(p.createdAt)
      }))
    };
  }

  private estimatePopulation(cluster: any, sessionGroups: Map<string, any[]>): number {
    // Base population on unique sessions with activity weighting
    const uniqueSessions = new Set(cluster.points.map((p: any) => p.sessionId));
    
    // Weight by activity intensity (more activity = higher confidence in population)
    let activityWeight = 0;
    for (const sessionId of uniqueSessions) {
      const sessionPoints = sessionGroups.get(sessionId) || [];
      const clusterActivity = sessionPoints.filter(p => 
        cluster.points.some((cp: any) => cp.id === p.id)
      ).length;
      activityWeight += Math.log(clusterActivity + 1); // Logarithmic scaling
    }
    
    // Conservative population estimate: base sessions * activity multiplier
    const basePopulation = uniqueSessions.size;
    const activityMultiplier = Math.min(activityWeight / uniqueSessions.size, 10); // Cap at 10x
    
    return Math.round(basePopulation * (1 + activityMultiplier));
  }

  private calculateClusterArea(points: any[]): number {
    if (points.length < 3) return 0.1; // Minimum area for small clusters
    
    // Simple bounding box area calculation
    const lats = points.map(p => p.lat);
    const lngs = points.map(p => p.lng);
    
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    
    // Convert to approximate km²
    const latDiff = maxLat - minLat;
    const lngDiff = maxLng - minLng;
    
    const latKm = latDiff * 111; // Rough km per degree latitude
    const lngKm = lngDiff * 111 * Math.cos((minLat + maxLat) / 2 * Math.PI / 180); // Adjust for longitude
    
    return Math.max(latKm * lngKm, 0.1); // Minimum 0.1 km²
  }

  private analyzeActivityPatterns(points: any[]) {
    const hourlyActivity = new Array(24).fill(0);
    const weeklyActivity = new Array(7).fill(0);
    let totalMovement = 0;
    
    for (const point of points) {
      const date = new Date(point.timestamp);
      const hour = date.getHours();
      const day = date.getDay();
      
      hourlyActivity[hour]++;
      weeklyActivity[day]++;
      
      // Calculate movement intensity based on point density and timing
      totalMovement += 1;
    }
    
    // Find peak hours (top 3)
    const peakHours = hourlyActivity
      .map((count, hour) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map(item => item.hour);
    
    return {
      peakHours,
      weeklyDistribution: weeklyActivity,
      movementIntensity: totalMovement / points.length
    };
  }

  private calculateClusterConfidence(cluster: any, population: number, area: number): number {
    // Confidence based on cluster cohesion and data quality
    let confidence = 0.5; // Base confidence
    
    // Spatial cohesion (tighter clusters = higher confidence)
    const distances = cluster.points.map((p: any) => 
      this.calculateDistance(p.lat, p.lng, cluster.centroid.lat, cluster.centroid.lng)
    );
    const avgDistance = distances.reduce((a: number, b: number) => a + b, 0) / distances.length;
    const spatialCohesion = Math.max(0, 1 - avgDistance / this.DBSCAN_EPSILON);
    
    // Data richness (more points = higher confidence)
    const dataRichness = Math.min(cluster.points.length / 50, 1); // Max at 50 points
    
    // Population reasonableness (not too sparse or dense)
    const density = population / area;
    const densityScore = density > 10 && density < 10000 ? 1 : 0.5; // Reasonable urban density
    
    confidence = (spatialCohesion * 0.4) + (dataRichness * 0.4) + (densityScore * 0.2);
    
    return Math.min(Math.max(confidence, 0), 1);
  }

  private async interpretAgainstPattern(pattern: any, communities: CommunityCluster[]): Promise<PatternInterpretation> {
    // Define ideal parameters for Pattern #18 (Community of 7,000)
    const idealParams = this.getIdealParametersForPattern(pattern.number);
    
    // Analyze each community against the pattern
    const analyzedCommunities = communities.map(community => {
      const analysis = this.analyzePatternAdherence(community, idealParams);
      return {
        ...community,
        patternAnalysis: {
          patternNumber: pattern.number,
          patternName: pattern.name,
          adherence: analysis.adherence,
          recommendations: analysis.recommendations,
          deviations: analysis.deviations
        }
      };
    });
    
    // Calculate overall assessment
    const conformingCommunities = analyzedCommunities.filter(c => c.patternAnalysis.adherence > 0.6).length;
    const averageAdherence = analyzedCommunities.reduce((sum, c) => sum + c.patternAnalysis.adherence, 0) / analyzedCommunities.length || 0;
    
    const systemRecommendations = this.generateSystemRecommendations(analyzedCommunities, idealParams);
    
    return {
      pattern: {
        number: pattern.number,
        name: pattern.name,
        description: pattern.description,
        idealParameters: idealParams
      },
      detectedCommunities: analyzedCommunities,
      overallAssessment: {
        totalCommunities: analyzedCommunities.length,
        conformingCommunities,
        averageAdherence,
        systemRecommendations
      }
    };
  }

  private getIdealParametersForPattern(patternNumber: number) {
    switch (patternNumber) {
      // TOWN PATTERNS (1-25)
      case 1: // Independent Regions
        return {
          populationRange: [2000000, 10000000] as [number, number],
          densityRange: [10, 100] as [number, number],
          areaRange: [20000, 100000] as [number, number]
        };
      case 2: // Distribution of Towns
        return {
          populationRange: [5000, 50000] as [number, number],
          densityRange: [20, 150] as [number, number],
          areaRange: [25, 2500] as [number, number]
        };
      case 8: // Mosaic of Subcultures
        return {
          populationRange: [100000, 500000] as [number, number],
          densityRange: [50, 200] as [number, number],
          areaRange: [500, 10000] as [number, number]
        };
      case 9: // Scattered Work
        return {
          populationRange: [10000, 100000] as [number, number],
          densityRange: [30, 150] as [number, number],
          areaRange: [50, 3333] as [number, number]
        };
      case 11: // Local Transport Areas
        return {
          populationRange: [50000, 300000] as [number, number],
          densityRange: [100, 500] as [number, number],
          areaRange: [100, 3000] as [number, number]
        };
      case 12: // Community of 7,000
        return {
          populationRange: [500, 7000] as [number, number],
          densityRange: [50, 300] as [number, number],
          areaRange: [2, 140] as [number, number]
        };
      case 14: // Identifiable Neighborhood
        return {
          populationRange: [300, 500] as [number, number],
          densityRange: [100, 400] as [number, number],
          areaRange: [1, 5] as [number, number]
        };
      case 15: // Neighborhood Boundary
        return {
          populationRange: [200, 600] as [number, number],
          densityRange: [50, 300] as [number, number],
          areaRange: [0.5, 12] as [number, number]
        };
      case 16: // Web of Public Transportation
        return {
          populationRange: [100000, 1000000] as [number, number],
          densityRange: [200, 1000] as [number, number],
          areaRange: [100, 5000] as [number, number]
        };
      case 21: // Four-Story Limit
        return {
          populationRange: [1000, 50000] as [number, number],
          densityRange: [200, 800] as [number, number],
          areaRange: [1, 250] as [number, number]
        };
      
      // COMMUNITY PATTERNS (26-94)
      case 37: // House Cluster
        return {
          populationRange: [30, 500] as [number, number],
          densityRange: [60, 250] as [number, number],
          areaRange: [0.1, 8] as [number, number]
        };
      case 41: // Work Community
        return {
          populationRange: [500, 10000] as [number, number],
          densityRange: [100, 400] as [number, number],
          areaRange: [1, 100] as [number, number]
        };
      case 61: // Small Public Squares
        return {
          populationRange: [100, 2000] as [number, number],
          densityRange: [200, 800] as [number, number],
          areaRange: [0.1, 10] as [number, number]
        };
      case 74: // Animals
        return {
          populationRange: [50, 5000] as [number, number],
          densityRange: [20, 200] as [number, number],
          areaRange: [0.25, 250] as [number, number]
        };
      
      // BUILDING PATTERNS (95-253)
      case 88: // Street Cafe
        return {
          populationRange: [500, 10000] as [number, number],
          densityRange: [300, 1000] as [number, number],
          areaRange: [0.5, 33] as [number, number]
        };
      case 106: // Positive Outdoor Space
        return {
          populationRange: [100, 5000] as [number, number],
          densityRange: [100, 500] as [number, number],
          areaRange: [0.2, 50] as [number, number]
        };
      
      // Patterns with specific spatial requirements
      case 18: // Network of Learning
        return {
          populationRange: [100, 2000] as [number, number],
          densityRange: [20, 200] as [number, number],
          areaRange: [0.5, 100] as [number, number]
        };
      case 30: // Activity Nodes
        return {
          populationRange: [300, 3000] as [number, number],
          densityRange: [150, 600] as [number, number],
          areaRange: [0.5, 20] as [number, number]
        };
      case 31: // Promenade
        return {
          populationRange: [1000, 20000] as [number, number],
          densityRange: [200, 500] as [number, number],
          areaRange: [2, 100] as [number, number]
        };
      
      default:
        // Dynamic parameters based on pattern number ranges
        if (patternNumber <= 25) { // Town patterns
          return {
            populationRange: [10000, 500000] as [number, number],
            densityRange: [20, 300] as [number, number],
            areaRange: [50, 2500] as [number, number]
          };
        } else if (patternNumber <= 94) { // Community patterns
          return {
            populationRange: [100, 10000] as [number, number],
            densityRange: [50, 400] as [number, number],
            areaRange: [0.5, 200] as [number, number]
          };
        } else { // Building patterns
          return {
            populationRange: [50, 2000] as [number, number],
            densityRange: [100, 800] as [number, number],
            areaRange: [0.1, 40] as [number, number]
          };
        }
    }
  }

  private analyzePatternAdherence(community: CommunityCluster, idealParams: any) {
    let adherence = 1.0;
    const recommendations: string[] = [];
    const deviations: string[] = [];
    
    // Population adherence
    if (community.population < idealParams.populationRange[0]) {
      const deficit = idealParams.populationRange[0] - community.population;
      adherence -= 0.3;
      deviations.push(`Population ${deficit} below minimum (${community.population}/${idealParams.populationRange[0]})`);
      recommendations.push(`Increase community density or expand boundaries to reach target population`);
    } else if (community.population > idealParams.populationRange[1]) {
      const excess = community.population - idealParams.populationRange[1];
      adherence -= 0.2;
      deviations.push(`Population ${excess} above maximum (${community.population}/${idealParams.populationRange[1]})`);
      recommendations.push(`Consider subdividing into smaller communities or reducing density`);
    }
    
    // Density adherence
    if (community.density < idealParams.densityRange[0] || community.density > idealParams.densityRange[1]) {
      adherence -= 0.3;
      deviations.push(`Density ${community.density.toFixed(1)} outside ideal range (${idealParams.densityRange[0]}-${idealParams.densityRange[1]})`);
      if (community.density < idealParams.densityRange[0]) {
        recommendations.push(`Increase residential density through infill development`);
      } else {
        recommendations.push(`Reduce density through green space or mixed-use zoning`);
      }
    }
    
    // Area adherence
    if (community.area < idealParams.areaRange[0] || community.area > idealParams.areaRange[1]) {
      adherence -= 0.2;
      deviations.push(`Area ${community.area.toFixed(1)}km² outside ideal range (${idealParams.areaRange[0]}-${idealParams.areaRange[1]}km²)`);
      if (community.area < idealParams.areaRange[0]) {
        recommendations.push(`Expand community boundaries to include more services and amenities`);
      } else {
        recommendations.push(`Focus development in core areas to improve walkability`);
      }
    }
    
    // Activity pattern analysis
    const peakVariation = Math.max(...community.activityPatterns.weeklyDistribution) - 
                         Math.min(...community.activityPatterns.weeklyDistribution);
    if (peakVariation > community.activityPatterns.weeklyDistribution.reduce((a, b) => a + b) / 7 * 2) {
      adherence -= 0.1;
      deviations.push(`Uneven activity distribution suggests imbalanced community use`);
      recommendations.push(`Encourage more distributed activities and mixed-use development`);
    }
    
    return {
      adherence: Math.max(adherence, 0),
      recommendations,
      deviations
    };
  }

  private generateSystemRecommendations(communities: CommunityCluster[], idealParams: any): string[] {
    const recommendations: string[] = [];
    
    if (communities.length === 0) {
      recommendations.push("No communities detected. Increase tracking coverage or data collection period.");
      return recommendations;
    }
    
    const avgPopulation = communities.reduce((sum, c) => sum + c.population, 0) / communities.length;
    const avgDensity = communities.reduce((sum, c) => sum + c.density, 0) / communities.length;
    
    if (avgPopulation < idealParams.populationRange[0] * 0.8) {
      recommendations.push("Most communities are underpopulated. Consider consolidation or targeted growth policies.");
    }
    
    if (avgDensity < idealParams.densityRange[0]) {
      recommendations.push("Low overall density detected. Promote transit-oriented development and infill housing.");
    }
    
    const highAdherenceCommunities = communities.filter(c => c.patternAnalysis.adherence > 0.8);
    if (highAdherenceCommunities.length > 0) {
      recommendations.push(`${highAdherenceCommunities.length} communities show strong pattern adherence. Use as models for development.`);
    }
    
    return recommendations;
  }
}

export const communityAgent = new CommunityAnalysisAgent();