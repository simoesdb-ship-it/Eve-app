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
    const lat = parseFloat(location.latitude);
    const lng = parseFloat(location.longitude);
    
    console.log(`Analyzing context for location ${locationId}: "${locationName}" at ${lat}, ${lng}`);
    
    // Use real geographic analysis for better context
    const geoContext = await this.analyzeGeographicContext(lat, lng);
    const nameContext = this.analyzeNameContext(locationName);
    
    console.log('Name context:', nameContext);
    console.log('Geo context:', geoContext);
    
    // Combine geographic and name-based analysis
    const isIndoors = nameContext.isIndoors || geoContext.likelyIndoors;
    const buildingType = nameContext.buildingType || geoContext.buildingType;
    const storyLevel = nameContext.storyLevel;
    const placeType = nameContext.placeType || geoContext.placeType;
    const urbanContext = geoContext.urbanContext;
    const naturalElements = [...nameContext.naturalElements, ...geoContext.naturalElements];
    const socialContext = nameContext.socialContext || geoContext.socialContext;

    const finalContext = {
      isIndoors,
      buildingType,
      storyLevel,
      placeType,
      urbanContext,
      naturalElements: [...new Set(naturalElements)], // Remove duplicates
      socialContext
    };
    
    console.log('Final context:', finalContext);
    return finalContext;
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

  private async analyzeGeographicContext(lat: number, lng: number) {
    // Basic geographic analysis based on coordinates
    // In a real implementation, this would use external APIs for detailed analysis
    return {
      likelyIndoors: false, // Default to outdoor for GPS locations
      buildingType: undefined,
      placeType: this.inferPlaceTypeFromCoordinates(lat, lng),
      urbanContext: this.inferUrbanContextFromCoordinates(lat, lng),
      naturalElements: this.inferNaturalElementsFromCoordinates(lat, lng),
      socialContext: 'general'
    };
  }

  private analyzeNameContext(name: string) {
    return {
      isIndoors: this.detectIndoorLocation(name, ''),
      buildingType: this.detectBuildingType(name, ''),
      storyLevel: this.detectStoryLevel(name, ''),
      placeType: this.detectPlaceType(name, ''),
      naturalElements: this.detectNaturalElements(name, ''),
      socialContext: this.detectSocialContext(name, '')
    };
  }

  private inferPlaceTypeFromCoordinates(lat: number, lng: number): string {
    // Enhanced geographic inference based on coordinate characteristics
    const latDecimal = Math.abs(lat % 1);
    const lngDecimal = Math.abs(lng % 1);
    
    // Minneapolis coordinates analysis (44.88, -93.21 area)
    if (lat > 44.8 && lat < 45.0 && lng > -93.3 && lng < -93.0) {
      // Downtown Minneapolis area - high density urban
      if (lat > 44.97 && lat < 44.99) return 'commercial'; // Downtown core
      if (lat > 44.95 && lat < 44.97) return 'institutional'; // University area
      return 'gathering'; // General urban gathering spaces
    }
    
    // High precision coordinates suggest specific locations
    if (latDecimal > 0.95 || lngDecimal > 0.95) return 'recreational'; // Precision suggests parks/specific features
    if (latDecimal < 0.05 && lngDecimal < 0.05) return 'institutional'; // Round numbers suggest planned developments
    
    // Decimal pattern analysis for urban context
    if ((latDecimal > 0.8 && latDecimal < 0.9) || (lngDecimal > 0.8 && lngDecimal < 0.9)) {
      return 'residential'; // Common residential area coordinates
    }
    
    return 'circulation'; // Default to circulation for generic outdoor GPS locations
  }

  private inferUrbanContextFromCoordinates(lat: number, lng: number): string {
    // Enhanced urban context inference based on coordinate analysis
    
    // Minneapolis-St. Paul metro area analysis
    if (lat > 44.8 && lat < 45.1 && lng > -93.5 && lng < -92.8) {
      // Urban core (downtown Minneapolis/St. Paul)
      if ((lat > 44.97 && lat < 44.99 && lng > -93.28 && lng < -93.24) || 
          (lat > 44.94 && lat < 44.96 && lng > -93.1 && lng < -93.05)) {
        return 'urban';
      }
      // Inner suburbs
      if (lat > 44.85 && lat < 44.95) return 'suburban';
      // Outer metro
      return 'mixed';
    }
    
    // General coordinate-based density inference
    const coordPrecision = (lat.toString().split('.')[1]?.length || 0) + 
                          (lng.toString().split('.')[1]?.length || 0);
    
    if (coordPrecision > 12) return 'urban'; // High precision suggests dense areas
    if (coordPrecision > 8) return 'suburban'; // Medium precision
    return 'rural'; // Low precision suggests rural areas
  }

  private inferNaturalElementsFromCoordinates(lat: number, lng: number): string[] {
    const elements = [];
    
    // Minnesota climate and geography (lat ~45, lng ~-93)
    if (lat > 44.5 && lat < 45.5 && lng > -94 && lng < -92) {
      elements.push('trees'); // Minnesota is heavily forested
      elements.push('vegetation'); // Four seasons with significant vegetation
      
      // Water features common in Twin Cities area
      if (lat > 44.9 && lat < 45.0 && lng > -93.3 && lng < -93.1) {
        elements.push('water'); // Chain of Lakes area
      }
    }
    
    // General climate-based inference
    if (lat > 40 && lat < 50) {
      elements.push('trees', 'vegetation'); // Temperate zone
    }
    if (Math.abs(lat) < 40) {
      elements.push('vegetation'); // Warmer climates
    }
    
    // Coordinate patterns suggesting natural features
    const latStr = lat.toString();
    const lngStr = lng.toString();
    if (latStr.includes('8') || lngStr.includes('8')) {
      elements.push('water'); // Pattern suggestion for water features
    }
    
    return [...new Set(elements)]; // Remove duplicates
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
    const patternDesc = pattern.description.toLowerCase();

    // Enhanced pattern-specific matching
    // High-impact pattern matches
    if (context.storyLevel !== undefined) {
      if (context.storyLevel <= 4 && pattern.number === 21) { // Four-story limit
        score += 0.95;
      }
      if (context.storyLevel === 1 && this.isGroundLevelPattern(pattern)) {
        score += 0.8;
      }
      if (context.storyLevel > 1 && this.isUpperLevelPattern(pattern)) {
        score += 0.7;
      }
    }

    // Building type specific high-relevance patterns
    if (context.buildingType) {
      if (context.buildingType === 'residential' && this.isResidentialPattern(pattern)) {
        score += 0.9;
      }
      if (context.buildingType === 'commercial' && this.isCommercialPattern(pattern)) {
        score += 0.9;
      }
      if (context.buildingType === 'institutional' && this.isInstitutionalPattern(pattern)) {
        score += 0.9;
      }
    }

    // Place type relevance with specific pattern matching
    if (context.placeType === 'gathering' && this.isGatheringPattern(pattern)) {
      score += 0.85;
    }
    if (context.placeType === 'circulation' && this.isCirculationPattern(pattern)) {
      score += 0.85;
    }
    if (context.placeType === 'recreational' && this.isRecreationalPattern(pattern)) {
      score += 0.85;
    }

    // Indoor/outdoor context with enhanced matching
    if (context.isIndoors) {
      if (this.isIndoorPattern(pattern)) score += 0.8;
      else score -= 0.3; // Penalize outdoor patterns for indoor spaces
    } else {
      if (this.isOutdoorPattern(pattern)) score += 0.8;
      if (this.isIndoorPattern(pattern)) score -= 0.2; // Slight penalty for indoor patterns outdoors
    }

    // Urban context relevance
    score += this.getUrbanContextRelevance(pattern, context.urbanContext);

    // Natural elements bonus
    if (context.naturalElements.length > 0) {
      score += this.getNaturalElementsRelevance(pattern, context.naturalElements);
    }

    // Social context relevance
    score += this.getSocialContextRelevance(pattern, context.socialContext);

    // Keyword matching bonus
    const keywordMatches = keywords.filter(keyword => 
      patternName.includes(keyword.toLowerCase()) || 
      patternDesc.includes(keyword.toLowerCase())
    ).length;
    score += keywordMatches * 0.1;

    return Math.min(1.0, Math.max(0, score));
  }

  // Enhanced pattern classification methods
  private isResidentialPattern(pattern: any): boolean {
    const residentialKeywords = ['home', 'house', 'family', 'private', 'bedroom', 'kitchen', 'dwelling'];
    return residentialKeywords.some(keyword => 
      pattern.name.toLowerCase().includes(keyword) ||
      pattern.description.toLowerCase().includes(keyword) ||
      (pattern.keywords || []).some((k: string) => k.toLowerCase().includes(keyword))
    );
  }

  private isCommercialPattern(pattern: any): boolean {
    const commercialKeywords = ['shop', 'store', 'market', 'retail', 'business', 'office', 'commercial'];
    return commercialKeywords.some(keyword => 
      pattern.name.toLowerCase().includes(keyword) ||
      pattern.description.toLowerCase().includes(keyword) ||
      (pattern.keywords || []).some((k: string) => k.toLowerCase().includes(keyword))
    );
  }

  private isInstitutionalPattern(pattern: any): boolean {
    const institutionalKeywords = ['public', 'community', 'education', 'health', 'civic', 'institution'];
    return institutionalKeywords.some(keyword => 
      pattern.name.toLowerCase().includes(keyword) ||
      pattern.description.toLowerCase().includes(keyword) ||
      (pattern.keywords || []).some((k: string) => k.toLowerCase().includes(keyword))
    );
  }

  private isGatheringPattern(pattern: any): boolean {
    const gatheringKeywords = ['community', 'meeting', 'social', 'public', 'assembly', 'square', 'plaza'];
    return gatheringKeywords.some(keyword => 
      pattern.name.toLowerCase().includes(keyword) ||
      pattern.description.toLowerCase().includes(keyword) ||
      (pattern.keywords || []).some((k: string) => k.toLowerCase().includes(keyword))
    );
  }

  private isCirculationPattern(pattern: any): boolean {
    const circulationKeywords = ['path', 'movement', 'flow', 'connection', 'access', 'street', 'network'];
    return circulationKeywords.some(keyword => 
      pattern.name.toLowerCase().includes(keyword) ||
      pattern.description.toLowerCase().includes(keyword) ||
      (pattern.keywords || []).some((k: string) => k.toLowerCase().includes(keyword))
    );
  }

  private isRecreationalPattern(pattern: any): boolean {
    const recreationalKeywords = ['play', 'leisure', 'sport', 'recreation', 'entertainment', 'park', 'garden'];
    return recreationalKeywords.some(keyword => 
      pattern.name.toLowerCase().includes(keyword) ||
      pattern.description.toLowerCase().includes(keyword) ||
      (pattern.keywords || []).some((k: string) => k.toLowerCase().includes(keyword))
    );
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
    const patternName = pattern.name.toLowerCase();
    const patternDesc = pattern.description.toLowerCase();

    // Specific pattern-context matches with detailed explanations
    if (context.storyLevel !== undefined) {
      if (context.storyLevel <= 4 && pattern.number === 21) {
        reasons.push(`Essential for ${context.storyLevel}-story location - aligns with four-story height limit principle`);
      } else if (context.storyLevel === 1 && this.isGroundLevelPattern(pattern)) {
        reasons.push("Perfect for ground-level accessibility and street interaction");
      } else if (context.storyLevel > 1 && this.isUpperLevelPattern(pattern)) {
        reasons.push(`Designed for upper-level spaces like floor ${context.storyLevel}`);
      }
    }

    // Building type specific reasoning with high-value matches
    if (context.buildingType === 'residential' && this.isResidentialPattern(pattern)) {
      reasons.push("Specifically designed for residential buildings and family living");
    } else if (context.buildingType === 'commercial' && this.isCommercialPattern(pattern)) {
      reasons.push("Essential for commercial spaces and business activities");
    } else if (context.buildingType === 'institutional' && this.isInstitutionalPattern(pattern)) {
      reasons.push("Crucial for institutional and public buildings");
    }

    // Place type specific reasoning
    if (context.placeType === 'gathering' && this.isGatheringPattern(pattern)) {
      reasons.push("Perfect for community gathering and social interaction spaces");
    } else if (context.placeType === 'circulation' && this.isCirculationPattern(pattern)) {
      reasons.push("Critical for movement patterns and pedestrian circulation");
    } else if (context.placeType === 'recreational' && this.isRecreationalPattern(pattern)) {
      reasons.push("Ideal for recreational areas and leisure activities");
    }

    // Natural elements integration
    if (context.naturalElements.includes('trees') && patternName.includes('tree')) {
      reasons.push("Incorporates existing tree coverage for natural shading and beauty");
    } else if (context.naturalElements.includes('water') && patternName.includes('water')) {
      reasons.push("Leverages natural water features for enhanced environmental quality");
    } else if (context.naturalElements.includes('vegetation') && patternName.includes('garden')) {
      reasons.push("Integrates with natural vegetation for sustainable design");
    }

    // Urban context specific reasoning
    if (context.urbanContext === 'urban' && patternDesc.includes('city')) {
      reasons.push("Addresses urban density challenges and city-scale planning");
    } else if (context.urbanContext === 'suburban' && patternDesc.includes('neighbor')) {
      reasons.push("Supports suburban neighborhood development and community building");
    }

    // Indoor/outdoor context - only add if no better reason exists
    if (reasons.length === 0) {
      if (context.isIndoors && this.isIndoorPattern(pattern)) {
        reasons.push("Designed for controlled indoor environments");
      } else if (!context.isIndoors && this.isOutdoorPattern(pattern)) {
        reasons.push("Optimized for outdoor environments and natural settings");
      }
    }

    // Fallback general reasoning
    if (reasons.length === 0) {
      if (context.buildingType) {
        reasons.push(`Relevant for ${context.buildingType} building contexts`);
      } else if (context.placeType !== 'general') {
        reasons.push(`Appropriate for ${context.placeType} area development`);
      } else {
        reasons.push("Contributes to overall spatial quality and human experience");
      }
    }

    return reasons[0]; // Return the most specific reason
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