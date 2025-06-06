import { communityAgent } from "./community-agent";
import { alexanderPatterns, getPatternByNumber } from "./alexander-patterns";

export interface LocationAnalysis {
  location: {
    name: string;
    coordinates: [number, number];
    population: number;
    area: number; // km²
    density: number; // people per km²
  };
  patternConformances: {
    pattern: {
      number: number;
      name: string;
      description: string;
    };
    adherence: number; // 0-1 score
    deviations: string[];
    recommendations: string[];
  }[];
  overallAssessment: {
    totalPatternsAnalyzed: number;
    averageAdherence: number;
    criticalDeviations: string[];
    keyRecommendations: string[];
  };
}

export class LocationPatternAnalyzer {
  
  async analyzeRealWorldLocation(
    name: string, 
    coordinates: [number, number], 
    population: number, 
    area: number
  ): Promise<LocationAnalysis> {
    
    const density = population / area;
    
    console.log(`Analyzing ${name} (${population} people, ${area} km², ${density.toFixed(1)} people/km²) against Alexander's patterns`);
    
    const patternConformances = [];
    
    // Analyze against key patterns that apply to communities of this scale
    const relevantPatterns = this.getRelevantPatternsForLocation(population, density, area);
    
    for (const patternNumber of relevantPatterns) {
      const pattern = getPatternByNumber(patternNumber);
      if (!pattern) continue;
      
      const analysis = this.analyzeLocationAgainstPattern(
        { name, coordinates, population, area, density },
        pattern
      );
      
      patternConformances.push(analysis);
    }
    
    // Calculate overall assessment
    const averageAdherence = patternConformances.reduce((sum, p) => sum + p.adherence, 0) / patternConformances.length;
    
    const criticalDeviations = patternConformances
      .filter(p => p.adherence < 0.3)
      .flatMap(p => p.deviations)
      .slice(0, 5);
    
    const keyRecommendations = patternConformances
      .filter(p => p.adherence < 0.6)
      .flatMap(p => p.recommendations)
      .slice(0, 5);
    
    return {
      location: { name, coordinates, population, area, density },
      patternConformances: patternConformances.sort((a, b) => a.adherence - b.adherence),
      overallAssessment: {
        totalPatternsAnalyzed: patternConformances.length,
        averageAdherence,
        criticalDeviations,
        keyRecommendations
      }
    };
  }
  
  private getRelevantPatternsForLocation(population: number, density: number, area: number): number[] {
    const patterns = [];
    
    // Always analyze core community patterns
    patterns.push(12); // Community of 7,000
    patterns.push(14); // Identifiable Neighborhood
    patterns.push(15); // Neighborhood Boundary
    
    // Scale-dependent patterns
    if (population > 50000) {
      patterns.push(1, 2, 8, 11, 16); // Regional and city patterns
    }
    
    if (population > 10000) {
      patterns.push(9, 21); // Scattered Work, Four-Story Limit
    }
    
    if (population > 1000) {
      patterns.push(37, 41, 61, 88); // Community-scale patterns
    }
    
    // Density-dependent patterns
    if (density > 200) {
      patterns.push(21, 106); // High-density patterns
    }
    
    if (density > 500) {
      patterns.push(30, 31); // Urban activity patterns
    }
    
    // Area-dependent patterns
    if (area > 100) {
      patterns.push(1, 2, 11); // Large-scale patterns
    }
    
    return Array.from(new Set(patterns));
  }
  
  private analyzeLocationAgainstPattern(location: any, pattern: any) {
    const idealParams = this.getIdealParametersForPattern(pattern.number);
    let adherence = 1.0;
    const deviations: string[] = [];
    const recommendations: string[] = [];
    
    // Population analysis
    if (location.population < idealParams.populationRange[0]) {
      const deficit = idealParams.populationRange[0] - location.population;
      adherence -= 0.4;
      deviations.push(`Population ${deficit.toLocaleString()} below minimum (${location.population.toLocaleString()}/${idealParams.populationRange[0].toLocaleString()})`);
      recommendations.push(`Increase population through targeted development or boundary expansion`);
    } else if (location.population > idealParams.populationRange[1]) {
      const excess = location.population - idealParams.populationRange[1];
      const severity = Math.min(excess / idealParams.populationRange[1], 2);
      adherence -= 0.3 * severity;
      deviations.push(`Population ${excess.toLocaleString()} above maximum (${location.population.toLocaleString()}/${idealParams.populationRange[1].toLocaleString()})`);
      
      if (pattern.number === 12) {
        recommendations.push(`Alexander: "Individuals have no effective voice in any community of more than 7000 people" - consider subdividing into smaller democratic units`);
      } else {
        recommendations.push(`Consider subdividing into smaller communities or reducing density`);
      }
    }
    
    // Density analysis
    if (location.density < idealParams.densityRange[0] || location.density > idealParams.densityRange[1]) {
      adherence -= 0.3;
      deviations.push(`Density ${location.density.toFixed(1)} outside ideal range (${idealParams.densityRange[0]}-${idealParams.densityRange[1]} people/km²)`);
      
      if (location.density < idealParams.densityRange[0]) {
        recommendations.push(`Increase density through infill development and mixed-use zoning`);
      } else {
        recommendations.push(`Reduce density through green space integration and height restrictions`);
      }
    }
    
    // Area analysis
    if (location.area < idealParams.areaRange[0] || location.area > idealParams.areaRange[1]) {
      adherence -= 0.2;
      deviations.push(`Area ${location.area.toFixed(1)}km² outside ideal range (${idealParams.areaRange[0]}-${idealParams.areaRange[1]}km²)`);
      
      if (location.area < idealParams.areaRange[0]) {
        recommendations.push(`Expand boundaries to include essential services and amenities`);
      } else {
        recommendations.push(`Focus development in core areas to improve walkability and cohesion`);
      }
    }
    
    // Pattern-specific analysis
    if (pattern.number === 21 && location.density > 1000) { // Four-Story Limit
      adherence -= 0.4;
      deviations.push(`High density suggests buildings exceed Alexander's four-story human scale limit`);
      recommendations.push(`Enforce four-story maximum building height to maintain human scale`);
    }
    
    return {
      pattern: {
        number: pattern.number,
        name: pattern.name,
        description: pattern.description
      },
      adherence: Math.max(adherence, 0),
      deviations,
      recommendations
    };
  }
  
  private getIdealParametersForPattern(patternNumber: number) {
    // Use the same logic as the community agent
    switch (patternNumber) {
      case 1: return { populationRange: [2000000, 10000000], densityRange: [10, 100], areaRange: [20000, 100000] };
      case 2: return { populationRange: [5000, 50000], densityRange: [20, 150], areaRange: [25, 2500] };
      case 8: return { populationRange: [100000, 500000], densityRange: [50, 200], areaRange: [500, 10000] };
      case 9: return { populationRange: [10000, 100000], densityRange: [30, 150], areaRange: [50, 3333] };
      case 11: return { populationRange: [50000, 300000], densityRange: [100, 500], areaRange: [100, 3000] };
      case 12: return { populationRange: [500, 7000], densityRange: [50, 300], areaRange: [2, 140] };
      case 14: return { populationRange: [300, 500], densityRange: [100, 400], areaRange: [1, 5] };
      case 15: return { populationRange: [200, 600], densityRange: [50, 300], areaRange: [0.5, 12] };
      case 16: return { populationRange: [100000, 1000000], densityRange: [200, 1000], areaRange: [100, 5000] };
      case 21: return { populationRange: [1000, 50000], densityRange: [200, 800], areaRange: [1, 250] };
      case 30: return { populationRange: [300, 3000], densityRange: [150, 600], areaRange: [0.5, 20] };
      case 31: return { populationRange: [1000, 20000], densityRange: [200, 500], areaRange: [2, 100] };
      case 37: return { populationRange: [30, 500], densityRange: [60, 250], areaRange: [0.1, 8] };
      case 41: return { populationRange: [500, 10000], densityRange: [100, 400], areaRange: [1, 100] };
      case 61: return { populationRange: [100, 2000], densityRange: [200, 800], areaRange: [0.1, 10] };
      case 88: return { populationRange: [500, 10000], densityRange: [300, 1000], areaRange: [0.5, 33] };
      case 106: return { populationRange: [100, 5000], densityRange: [100, 500], areaRange: [0.2, 50] };
      default:
        if (patternNumber <= 25) {
          return { populationRange: [10000, 500000], densityRange: [20, 300], areaRange: [50, 2500] };
        } else if (patternNumber <= 94) {
          return { populationRange: [100, 10000], densityRange: [50, 400], areaRange: [0.5, 200] };
        } else {
          return { populationRange: [50, 2000], densityRange: [100, 800], areaRange: [0.1, 40] };
        }
    }
  }
}

export const locationAnalyzer = new LocationPatternAnalyzer();