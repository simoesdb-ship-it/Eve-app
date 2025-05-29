import type { Pattern } from "@shared/schema";

export interface LocationContext {
  latitude: number;
  longitude: number;
  urbanDensity?: 'low' | 'medium' | 'high';
  landUse?: 'residential' | 'commercial' | 'mixed' | 'industrial';
  walkability?: number; // 0-100 score
  publicTransport?: boolean;
}

export interface PatternMatch {
  pattern: Pattern;
  confidence: number;
  reasons: string[];
}

export class PatternMatcher {
  private patterns: Pattern[];

  constructor(patterns: Pattern[]) {
    this.patterns = patterns;
  }

  matchPatterns(context: LocationContext): PatternMatch[] {
    const matches: PatternMatch[] = [];

    for (const pattern of this.patterns) {
      const match = this.calculateMatch(pattern, context);
      if (match.confidence > 0.3) { // Only include matches above 30% confidence
        matches.push(match);
      }
    }

    return matches.sort((a, b) => b.confidence - a.confidence);
  }

  private calculateMatch(pattern: Pattern, context: LocationContext): PatternMatch {
    let confidence = 0.5; // Base confidence
    const reasons: string[] = [];

    // Urban density matching
    if (context.urbanDensity) {
      const urbanPatterns = ['street', 'plaza', 'square', 'pedestrian', 'public'];
      const hasUrbanKeywords = pattern.keywords.some(k => 
        urbanPatterns.some(up => k.toLowerCase().includes(up))
      );

      if (hasUrbanKeywords) {
        if (context.urbanDensity === 'high') {
          confidence += 0.3;
          reasons.push('High urban density matches pattern characteristics');
        } else if (context.urbanDensity === 'medium') {
          confidence += 0.2;
          reasons.push('Medium urban density supports pattern implementation');
        }
      }
    }

    // Land use matching
    if (context.landUse) {
      const commercialPatterns = ['cafe', 'shop', 'market', 'activity'];
      const residentialPatterns = ['community', 'neighborhood', 'local'];
      
      if (context.landUse === 'commercial' || context.landUse === 'mixed') {
        const hasCommercialKeywords = pattern.keywords.some(k =>
          commercialPatterns.some(cp => k.toLowerCase().includes(cp))
        );
        if (hasCommercialKeywords) {
          confidence += 0.25;
          reasons.push('Commercial area aligns with pattern requirements');
        }
      }

      if (context.landUse === 'residential' || context.landUse === 'mixed') {
        const hasResidentialKeywords = pattern.keywords.some(k =>
          residentialPatterns.some(rp => k.toLowerCase().includes(rp))
        );
        if (hasResidentialKeywords) {
          confidence += 0.2;
          reasons.push('Residential context supports community patterns');
        }
      }
    }

    // Walkability matching
    if (context.walkability !== undefined) {
      const walkabilityPatterns = ['pedestrian', 'walking', 'path', 'street'];
      const hasWalkabilityKeywords = pattern.keywords.some(k =>
        walkabilityPatterns.some(wp => k.toLowerCase().includes(wp))
      );

      if (hasWalkabilityKeywords) {
        const walkabilityBonus = (context.walkability / 100) * 0.2;
        confidence += walkabilityBonus;
        if (context.walkability > 70) {
          reasons.push('High walkability score supports pedestrian-friendly patterns');
        }
      }
    }

    // Public transport matching
    if (context.publicTransport) {
      const transitPatterns = ['node', 'center', 'hub', 'activity'];
      const hasTransitKeywords = pattern.keywords.some(k =>
        transitPatterns.some(tp => k.toLowerCase().includes(tp))
      );

      if (hasTransitKeywords) {
        confidence += 0.15;
        reasons.push('Public transport access enhances activity node potential');
      }
    }

    // Pattern-specific adjustments
    confidence += this.getPatternSpecificAdjustment(pattern, context);

    // Add some randomness to simulate ML algorithm variability
    confidence += (Math.random() - 0.5) * 0.1;

    return {
      pattern,
      confidence: Math.max(0, Math.min(1, confidence)),
      reasons
    };
  }

  private getPatternSpecificAdjustment(pattern: Pattern, context: LocationContext): number {
    switch (pattern.number) {
      case 88: // Street Café
        return (context.urbanDensity === 'high' && context.walkability && context.walkability > 60) ? 0.2 : 0;
      
      case 100: // Pedestrian Street
        return (context.walkability && context.walkability > 80) ? 0.25 : 0;
      
      case 61: // Small Public Squares
        return (context.landUse === 'mixed' || context.landUse === 'commercial') ? 0.15 : 0;
      
      case 30: // Activity Nodes
        return context.publicTransport ? 0.2 : 0;
      
      default:
        return 0;
    }
  }
}

export function createLocationContext(
  latitude: number,
  longitude: number,
  additionalData?: Partial<LocationContext>
): LocationContext {
  // This would typically use real geospatial data APIs
  // For now, we'll simulate based on location
  
  const baseContext: LocationContext = {
    latitude,
    longitude,
    ...additionalData
  };

  // Simulate urban density based on coordinates (simplified)
  if (!baseContext.urbanDensity) {
    // This is a very simplified heuristic - in practice you'd use real data
    const isUrban = Math.abs(latitude - 37.7749) < 0.1 && Math.abs(longitude + 122.4194) < 0.1;
    baseContext.urbanDensity = isUrban ? 'high' : 'medium';
  }

  // Simulate walkability score
  if (baseContext.walkability === undefined) {
    baseContext.walkability = Math.floor(Math.random() * 40) + 60; // 60-100 range
  }

  // Simulate land use
  if (!baseContext.landUse) {
    const landUseOptions: Array<'residential' | 'commercial' | 'mixed' | 'industrial'> = 
      ['residential', 'commercial', 'mixed'];
    baseContext.landUse = landUseOptions[Math.floor(Math.random() * landUseOptions.length)];
  }

  // Simulate public transport
  if (baseContext.publicTransport === undefined) {
    baseContext.publicTransport = Math.random() > 0.4; // 60% chance of public transport
  }

  return baseContext;
}
