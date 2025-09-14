import { cache } from './middleware/caching';
import { storage } from './storage';

interface OptimizedPattern {
  id: number;
  number: number;
  name: string;
  keywords: string[];
  category: string;
  compiled_keywords?: Set<string>; // Pre-compiled for faster matching
}

interface LocationAnalysisContext {
  latitude: number;
  longitude: number;
  name: string;
  address?: string;
  neighborhood?: string;
  city?: string;
  compiled_name?: Set<string>; // Pre-compiled location tokens
}

class OptimizedPatternAnalyzer {
  private patterns: OptimizedPattern[] = [];
  private isInitialized = false;
  private initPromise?: Promise<void>;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this.loadAndCompilePatterns();
    await this.initPromise;
    this.isInitialized = true;
  }

  private async loadAndCompilePatterns(): Promise<void> {
    console.log('Loading and compiling patterns for optimized analysis...');
    const rawPatterns = await storage.getAllPatterns();
    
    this.patterns = rawPatterns.map(pattern => ({
      ...pattern,
      compiled_keywords: new Set(pattern.keywords.map(k => k.toLowerCase()))
    }));

    console.log(`Compiled ${this.patterns.length} patterns for fast matching`);
  }

  private compileLocationContext(location: any): LocationAnalysisContext {
    const locationName = (location.name || '').toLowerCase();
    const tokens = new Set([
      ...locationName.split(/[\s\-_,\.]+/),
      ...(location.address || '').toLowerCase().split(/[\s\-_,\.]+/),
      ...(location.neighborhood || '').toLowerCase().split(/[\s\-_,\.]+/),
      ...(location.city || '').toLowerCase().split(/[\s\-_,\.]+/)
    ].filter(token => token.length > 2));

    return {
      latitude: parseFloat(location.latitude),
      longitude: parseFloat(location.longitude),
      name: location.name,
      address: location.address,
      neighborhood: location.neighborhood,
      city: location.city,
      compiled_name: tokens
    };
  }

  async generateOptimizedSuggestions(location: any): Promise<any[]> {
    await this.initialize();

    const cacheKey = `pattern_suggestions:${location.latitude}:${location.longitude}:${location.name}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      console.log(`Using cached pattern suggestions for location ${location.id}`);
      return cached;
    }

    const context = this.compileLocationContext(location);
    const suggestions = [];
    
    // Use optimized matching algorithm
    for (const pattern of this.patterns) {
      const confidence = this.calculateOptimizedConfidence(pattern, context);
      
      if (confidence > 0.5) {
        suggestions.push({
          patternId: pattern.id,
          patternNumber: pattern.number,
          patternName: pattern.name,
          confidence,
          locationId: location.id,
          mlAlgorithm: "optimized_keyword_spatial_matching"
        });
      }
    }

    // Sort by confidence descending
    suggestions.sort((a, b) => b.confidence - a.confidence);

    // Cache results for 5 minutes
    cache.set(cacheKey, suggestions, 300);
    
    console.log(`Generated ${suggestions.length} optimized pattern suggestions for location ${location.id}`);
    return suggestions;
  }

  private calculateOptimizedConfidence(pattern: OptimizedPattern, context: LocationAnalysisContext): number {
    let confidence = 0.25; // Base confidence

    // Fast keyword intersection using Sets
    const keywordMatches = this.getIntersectionSize(pattern.compiled_keywords!, context.compiled_name!);
    if (keywordMatches > 0) {
      confidence += keywordMatches * 0.2; // Boost per matching keyword
    }

    // Geographic context boosts
    const geoBoosts = this.calculateGeographicBoosts(pattern, context);
    confidence += geoBoosts;

    // Category-specific boosts
    const categoryBoosts = this.calculateCategoryBoosts(pattern, context);
    confidence += categoryBoosts;

    return Math.min(confidence, 1.0);
  }

  private getIntersectionSize(set1: Set<string>, set2: Set<string>): number {
    let count = 0;
    Array.from(set1).forEach(item => {
      if (set2.has(item)) count++;
    });
    return count;
  }

  private calculateGeographicBoosts(pattern: OptimizedPattern, context: LocationAnalysisContext): number {
    let boost = 0;

    // Urban vs rural patterns based on coordinate density
    const isUrban = this.isUrbanLocation(context.latitude, context.longitude);
    
    if (isUrban && pattern.category === 'Urban') {
      boost += 0.15;
    } else if (!isUrban && pattern.category === 'Rural') {
      boost += 0.15;
    }

    // Climate zone considerations
    const climateBoost = this.getClimateBoost(pattern, context.latitude);
    boost += climateBoost;

    return boost;
  }

  private calculateCategoryBoosts(pattern: OptimizedPattern, context: LocationAnalysisContext): number {
    let boost = 0;

    // Transportation patterns
    if (pattern.category === 'Transportation' && 
        (context.compiled_name!.has('street') || context.compiled_name!.has('road') || 
         context.compiled_name!.has('avenue') || context.compiled_name!.has('highway'))) {
      boost += 0.2;
    }

    // Building patterns
    if (pattern.category === 'Buildings' && 
        (context.compiled_name!.has('building') || context.compiled_name!.has('house') || 
         context.compiled_name!.has('center') || context.compiled_name!.has('complex'))) {
      boost += 0.2;
    }

    // Community patterns
    if (pattern.category === 'Community' && 
        (context.compiled_name!.has('community') || context.compiled_name!.has('public') || 
         context.compiled_name!.has('park') || context.compiled_name!.has('square'))) {
      boost += 0.2;
    }

    return boost;
  }

  private isUrbanLocation(lat: number, lng: number): boolean {
    // Simple heuristic: areas with more precise coordinates tend to be urban
    const precision = Math.abs(lat % 0.001) + Math.abs(lng % 0.001);
    return precision > 0.0005;
  }

  private getClimateBoost(pattern: OptimizedPattern, latitude: number): number {
    const absLat = Math.abs(latitude);
    
    // Northern climate patterns
    if (absLat > 45 && pattern.keywords.some(k => 
        ['heating', 'insulation', 'wind', 'snow', 'cold'].includes(k.toLowerCase()))) {
      return 0.1;
    }
    
    // Tropical climate patterns  
    if (absLat < 25 && pattern.keywords.some(k => 
        ['shade', 'cooling', 'ventilation', 'rain', 'heat'].includes(k.toLowerCase()))) {
      return 0.1;
    }

    return 0;
  }

  // Batch processing for multiple locations
  async batchGenerateSuggestions(locations: any[]): Promise<Map<number, any[]>> {
    await this.initialize();
    
    const results = new Map<number, any[]>();
    
    // Process in chunks to avoid memory issues
    const chunkSize = 10;
    for (let i = 0; i < locations.length; i += chunkSize) {
      const chunk = locations.slice(i, i + chunkSize);
      
      const chunkPromises = chunk.map(async location => {
        const suggestions = await this.generateOptimizedSuggestions(location);
        results.set(location.id, suggestions);
      });
      
      await Promise.all(chunkPromises);
    }
    
    return results;
  }

  // Cache warming for frequently accessed patterns
  async warmCache(): Promise<void> {
    console.log('Warming pattern analysis cache...');
    
    // Pre-cache common location types
    const commonLocations = [
      { latitude: 44.9537, longitude: -93.0900, name: 'Downtown Area' },
      { latitude: 44.9778, longitude: -93.2650, name: 'University District' },
      { latitude: 44.9133, longitude: -93.2287, name: 'Residential Neighborhood' }
    ];
    
    for (const location of commonLocations) {
      await this.generateOptimizedSuggestions(location);
    }
    
    console.log('Cache warming completed');
  }

  getAnalysisStats() {
    return {
      patternsLoaded: this.patterns.length,
      isInitialized: this.isInitialized,
      cacheStats: cache.getStats()
    };
  }
}

export const optimizedPatternAnalyzer = new OptimizedPatternAnalyzer();