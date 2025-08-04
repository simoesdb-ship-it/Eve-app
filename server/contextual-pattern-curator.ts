import { db } from "./db";
import { patterns, locations } from "../shared/schema";
import { eq } from "drizzle-orm";

export interface LocationContext {
  isIndoors: boolean;
  buildingType?: string;
  storyLevel?: number;
  placeType: string;
  urbanContext: string;
  naturalElements: string[];
  socialContext: string;
}

export interface CuratedPattern {
  id: number;
  number: number;
  name: string;
  description: string;
  relevanceScore: number;
  contextReason: string;
  category: string;
}

export class ContextualPatternCurator {
  
  async analyzeLocationContext(locationId: number): Promise<LocationContext> {
    // Get location data
    const [location] = await db.select().from(locations).where(eq(locations.id, locationId));
    if (!location) {
      throw new Error('Location not found');
    }

    const locationName = location.name?.toLowerCase() || '';
    const address = ''; // Location doesn't have address field, using name only
    
    // Analyze building context
    const isIndoors = this.detectIndoorLocation(locationName, address);
    const buildingType = this.detectBuildingType(locationName, address);
    const storyLevel = this.detectStoryLevel(locationName, address);
    const placeType = this.detectPlaceType(locationName, address);
    const urbanContext = this.detectUrbanContext(locationName, address);
    const naturalElements = this.detectNaturalElements(locationName, address);
    const socialContext = this.detectSocialContext(locationName, address);

    return {
      isIndoors,
      buildingType,
      storyLevel,
      placeType,
      urbanContext,
      naturalElements,
      socialContext
    };
  }

  async getCuratedPatterns(locationId: number): Promise<CuratedPattern[]> {
    const context = await this.analyzeLocationContext(locationId);
    const allPatterns = await db.select().from(patterns);
    
    const curatedPatterns: CuratedPattern[] = [];

    for (const pattern of allPatterns) {
      const relevanceScore = this.calculatePatternRelevance(pattern, context);
      if (relevanceScore > 0.3) { // Only include relevant patterns
        const contextReason = this.generateContextReason(pattern, context);
        curatedPatterns.push({
          id: pattern.id,
          number: pattern.number,
          name: pattern.name,
          description: pattern.description,
          relevanceScore,
          contextReason,
          category: this.categorizePattern(pattern, context)
        });
      }
    }

    // Sort by relevance and return top patterns
    return curatedPatterns
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 12); // Limit to most relevant patterns
  }

  private detectIndoorLocation(name: string, address: string): boolean {
    const indoorKeywords = [
      'room', 'floor', 'lobby', 'hall', 'office', 'store', 'shop',
      'restaurant', 'cafe', 'library', 'museum', 'theater', 'mall',
      'apartment', 'building', 'suite', 'unit', 'level'
    ];
    
    return indoorKeywords.some(keyword => 
      name.includes(keyword) || address.includes(keyword)
    );
  }

  private detectBuildingType(name: string, address: string): string | undefined {
    const buildingTypes = {
      'residential': ['apartment', 'home', 'house', 'residence', 'condo'],
      'commercial': ['store', 'shop', 'mall', 'market', 'office'],
      'institutional': ['school', 'hospital', 'library', 'museum', 'church'],
      'hospitality': ['hotel', 'restaurant', 'cafe', 'bar', 'inn'],
      'industrial': ['factory', 'warehouse', 'plant', 'facility']
    };

    for (const [type, keywords] of Object.entries(buildingTypes)) {
      if (keywords.some(keyword => name.includes(keyword) || address.includes(keyword))) {
        return type;
      }
    }
    return undefined;
  }

  private detectStoryLevel(name: string, address: string): number | undefined {
    const floorMatches = [
      /(\d+)(st|nd|rd|th)\s*floor/i,
      /floor\s*(\d+)/i,
      /level\s*(\d+)/i,
      /story\s*(\d+)/i
    ];

    for (const regex of floorMatches) {
      const match = (name + ' ' + address).match(regex);
      if (match) {
        return parseInt(match[1]);
      }
    }

    // Ground level indicators
    if (/(ground|main|first|lobby|entrance)/i.test(name + ' ' + address)) {
      return 1;
    }

    return undefined;
  }

  private detectPlaceType(name: string, address: string): string {
    const placeTypes = {
      'gathering': ['plaza', 'square', 'park', 'center', 'commons'],
      'circulation': ['street', 'avenue', 'path', 'walkway', 'corridor'],
      'commercial': ['market', 'shop', 'store', 'mall', 'district'],
      'residential': ['neighborhood', 'block', 'court', 'terrace'],
      'recreational': ['park', 'garden', 'playground', 'field', 'court'],
      'institutional': ['campus', 'complex', 'facility', 'center']
    };

    for (const [type, keywords] of Object.entries(placeTypes)) {
      if (keywords.some(keyword => name.includes(keyword) || address.includes(keyword))) {
        return type;
      }
    }
    return 'general';
  }

  private detectUrbanContext(name: string, address: string): string {
    if (/(downtown|urban|city|metro)/i.test(name + ' ' + address)) return 'urban';
    if (/(suburb|residential|neighborhood)/i.test(name + ' ' + address)) return 'suburban';
    if (/(rural|country|farm)/i.test(name + ' ' + address)) return 'rural';
    return 'mixed';
  }

  private detectNaturalElements(name: string, address: string): string[] {
    const elements = [];
    if (/(tree|forest|wood)/i.test(name + ' ' + address)) elements.push('trees');
    if (/(water|lake|river|stream)/i.test(name + ' ' + address)) elements.push('water');
    if (/(garden|green|plant)/i.test(name + ' ' + address)) elements.push('vegetation');
    if (/(hill|mountain|valley)/i.test(name + ' ' + address)) elements.push('topography');
    return elements;
  }

  private detectSocialContext(name: string, address: string): string {
    if (/(community|public|social)/i.test(name + ' ' + address)) return 'community';
    if (/(private|personal|intimate)/i.test(name + ' ' + address)) return 'private';
    if (/(work|office|business)/i.test(name + ' ' + address)) return 'professional';
    return 'general';
  }

  private calculatePatternRelevance(pattern: any, context: LocationContext): number {
    let score = 0;
    const keywords = pattern.keywords || [];
    const patternName = pattern.name.toLowerCase();

    // Story level relevance
    if (context.storyLevel !== undefined) {
      if (context.storyLevel <= 4 && pattern.number === 21) { // Four-story limit
        score += 0.9;
      }
      if (context.storyLevel === 1 && this.isGroundLevelPattern(pattern)) {
        score += 0.7;
      }
      if (context.storyLevel > 1 && this.isUpperLevelPattern(pattern)) {
        score += 0.6;
      }
    }

    // Indoor/outdoor relevance
    if (context.isIndoors) {
      if (this.isIndoorPattern(pattern)) score += 0.8;
    } else {
      if (this.isOutdoorPattern(pattern)) score += 0.8;
    }

    // Building type relevance
    if (context.buildingType) {
      score += this.getBuildingTypeRelevance(pattern, context.buildingType);
    }

    // Place type relevance
    score += this.getPlaceTypeRelevance(pattern, context.placeType);

    // Urban context relevance
    score += this.getUrbanContextRelevance(pattern, context.urbanContext);

    // Natural elements relevance
    if (context.naturalElements.length > 0) {
      score += this.getNaturalElementsRelevance(pattern, context.naturalElements);
    }

    // Social context relevance
    score += this.getSocialContextRelevance(pattern, context.socialContext);

    return Math.min(1.0, score);
  }

  private isGroundLevelPattern(pattern: any): boolean {
    const groundPatterns = [
      'entrance', 'threshold', 'main entrance', 'reception', 'lobby',
      'circulation', 'pedestrian', 'street', 'garden', 'courtyard'
    ];
    return groundPatterns.some(keyword => 
      pattern.name.toLowerCase().includes(keyword) ||
      (pattern.keywords || []).some((k: string) => k.toLowerCase().includes(keyword))
    );
  }

  private isUpperLevelPattern(pattern: any): boolean {
    const upperPatterns = [
      'balcony', 'terrace', 'view', 'window', 'light', 'ventilation',
      'office', 'workspace', 'bedroom', 'privacy'
    ];
    return upperPatterns.some(keyword => 
      pattern.name.toLowerCase().includes(keyword) ||
      (pattern.keywords || []).some((k: string) => k.toLowerCase().includes(keyword))
    );
  }

  private isIndoorPattern(pattern: any): boolean {
    const indoorKeywords = [
      'room', 'ceiling', 'wall', 'floor', 'lighting', 'ventilation',
      'furniture', 'workspace', 'kitchen', 'bathroom', 'bedroom'
    ];
    return indoorKeywords.some(keyword => 
      pattern.name.toLowerCase().includes(keyword) ||
      (pattern.keywords || []).some((k: string) => k.toLowerCase().includes(keyword))
    );
  }

  private isOutdoorPattern(pattern: any): boolean {
    const outdoorKeywords = [
      'street', 'plaza', 'garden', 'park', 'path', 'square',
      'courtyard', 'terrace', 'outdoor', 'landscape', 'tree'
    ];
    return outdoorKeywords.some(keyword => 
      pattern.name.toLowerCase().includes(keyword) ||
      (pattern.keywords || []).some((k: string) => k.toLowerCase().includes(keyword))
    );
  }

  private getBuildingTypeRelevance(pattern: any, buildingType: string): number {
    const relevanceMap: Record<string, string[]> = {
      'residential': ['home', 'house', 'family', 'private', 'bedroom', 'kitchen'],
      'commercial': ['shop', 'store', 'market', 'retail', 'business', 'office'],
      'institutional': ['public', 'community', 'education', 'health', 'civic'],
      'hospitality': ['reception', 'guest', 'dining', 'comfort', 'service'],
      'industrial': ['work', 'function', 'efficiency', 'service', 'utility']
    };

    const keywords = relevanceMap[buildingType] || [];
    const matches = keywords.filter(keyword => 
      pattern.name.toLowerCase().includes(keyword) ||
      (pattern.keywords || []).some((k: string) => k.toLowerCase().includes(keyword))
    );

    return matches.length * 0.2;
  }

  private getPlaceTypeRelevance(pattern: any, placeType: string): number {
    const relevanceMap: Record<string, string[]> = {
      'gathering': ['community', 'meeting', 'social', 'public', 'assembly'],
      'circulation': ['path', 'movement', 'flow', 'connection', 'access'],
      'commercial': ['market', 'trade', 'commerce', 'activity', 'business'],
      'residential': ['home', 'neighborhood', 'family', 'private', 'intimate'],
      'recreational': ['play', 'leisure', 'sport', 'recreation', 'entertainment'],
      'institutional': ['formal', 'civic', 'education', 'service', 'public']
    };

    const keywords = relevanceMap[placeType] || [];
    const matches = keywords.filter(keyword => 
      pattern.name.toLowerCase().includes(keyword) ||
      (pattern.keywords || []).some((k: string) => k.toLowerCase().includes(keyword))
    );

    return matches.length * 0.15;
  }

  private getUrbanContextRelevance(pattern: any, urbanContext: string): number {
    const relevanceMap: Record<string, string[]> = {
      'urban': ['density', 'urban', 'city', 'compact', 'vertical'],
      'suburban': ['neighborhood', 'residential', 'community', 'family'],
      'rural': ['natural', 'landscape', 'open', 'agricultural', 'countryside'],
      'mixed': ['transition', 'edge', 'boundary', 'connection']
    };

    const keywords = relevanceMap[urbanContext] || [];
    const matches = keywords.filter(keyword => 
      pattern.name.toLowerCase().includes(keyword) ||
      (pattern.keywords || []).some((k: string) => k.toLowerCase().includes(keyword))
    );

    return matches.length * 0.1;
  }

  private getNaturalElementsRelevance(pattern: any, naturalElements: string[]): number {
    const elementKeywords: Record<string, string[]> = {
      'trees': ['tree', 'shade', 'canopy', 'green', 'natural'],
      'water': ['water', 'fountain', 'stream', 'pond', 'rain'],
      'vegetation': ['garden', 'plant', 'green', 'landscape', 'nature'],
      'topography': ['hill', 'slope', 'level', 'terrain', 'elevation']
    };

    let score = 0;
    for (const element of naturalElements) {
      const keywords = elementKeywords[element] || [];
      const matches = keywords.filter(keyword => 
        pattern.name.toLowerCase().includes(keyword) ||
        (pattern.keywords || []).some((k: string) => k.toLowerCase().includes(keyword))
      );
      score += matches.length * 0.1;
    }

    return score;
  }

  private getSocialContextRelevance(pattern: any, socialContext: string): number {
    const relevanceMap: Record<string, string[]> = {
      'community': ['community', 'public', 'social', 'gathering', 'shared'],
      'private': ['private', 'personal', 'intimate', 'family', 'individual'],
      'professional': ['work', 'office', 'business', 'formal', 'professional'],
      'general': ['flexible', 'adaptable', 'general', 'universal']
    };

    const keywords = relevanceMap[socialContext] || [];
    const matches = keywords.filter(keyword => 
      pattern.name.toLowerCase().includes(keyword) ||
      (pattern.keywords || []).some((k: string) => k.toLowerCase().includes(keyword))
    );

    return matches.length * 0.1;
  }

  private generateContextReason(pattern: any, context: LocationContext): string {
    const reasons = [];

    if (context.storyLevel !== undefined) {
      if (context.storyLevel <= 4 && pattern.number === 21) {
        reasons.push("Perfect for buildings under 4 stories");
      } else if (context.storyLevel === 1) {
        reasons.push("Relevant for ground-level spaces");
      } else if (context.storyLevel > 1) {
        reasons.push(`Applicable to ${context.storyLevel}${this.getOrdinalSuffix(context.storyLevel)} floor`);
      }
    }

    if (context.isIndoors && this.isIndoorPattern(pattern)) {
      reasons.push("Designed for indoor environments");
    } else if (!context.isIndoors && this.isOutdoorPattern(pattern)) {
      reasons.push("Optimized for outdoor spaces");
    }

    if (context.buildingType) {
      reasons.push(`Suitable for ${context.buildingType} buildings`);
    }

    if (context.placeType !== 'general') {
      reasons.push(`Ideal for ${context.placeType} spaces`);
    }

    return reasons.length > 0 ? reasons.join('; ') : "Contextually relevant";
  }

  private categorizePattern(pattern: any, context: LocationContext): string {
    if (context.isIndoors) return "Indoor";
    if (!context.isIndoors) return "Outdoor";
    if (context.buildingType) return context.buildingType.charAt(0).toUpperCase() + context.buildingType.slice(1);
    if (context.placeType !== 'general') return context.placeType.charAt(0).toUpperCase() + context.placeType.slice(1);
    return "General";
  }

  private getOrdinalSuffix(num: number): string {
    const suffix = ['th', 'st', 'nd', 'rd'];
    const v = num % 100;
    return suffix[(v - 20) % 10] || suffix[v] || suffix[0];
  }
}

export const contextualPatternCurator = new ContextualPatternCurator();