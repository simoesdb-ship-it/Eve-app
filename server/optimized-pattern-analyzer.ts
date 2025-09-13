import { cache } from './middleware/caching';
import { storage } from './storage';
import { IntelligentPatternCurator } from './intelligent-pattern-curator';
import { ContextualPatternCurator } from './contextual-pattern-curator';

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
  private intelligentCurator?: IntelligentPatternCurator;
  private contextualCurator?: ContextualPatternCurator;

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

    console.log(`Analyzing location using sophisticated analysis systems: ${location.name}`);
    const suggestions = [];
    
    try {
      // Lazy initialization of curators to avoid circular imports
      if (!this.intelligentCurator) {
        this.intelligentCurator = new IntelligentPatternCurator();
      }
      if (!this.contextualCurator) {
        this.contextualCurator = new ContextualPatternCurator();
      }

      // Use Intelligent Pattern Curator for problem-to-pattern mapping
      const intelligentSuggestions = await this.intelligentCurator.generateContextualAnalysis(location);
      
      // Convert intelligent suggestions to optimized format
      for (const suggestion of intelligentSuggestions) {
        const pattern = await storage.getPattern(suggestion.patternId);
        if (pattern) {
          suggestions.push({
            patternId: pattern.id,
            patternNumber: pattern.number,
            patternName: pattern.name,
            confidence: parseFloat(suggestion.relevanceScore),
            locationId: location.id,
            reasoning: suggestion.reasoning,
            problemsAddressed: suggestion.problemsAddressed,
            implementationPriority: suggestion.implementationPriority,
            implementationNotes: suggestion.implementationNotes,
            mlAlgorithm: "intelligent_contextual_analysis"
          });
        }
      }

      // If we have location ID, also use Contextual Pattern Curator for geographic analysis
      if (location.id) {
        try {
          const curatedPatterns = await this.contextualCurator.getCuratedPatterns(location.id);
          
          // Add curated patterns not already included
          for (const curated of curatedPatterns) {
            const alreadyIncluded = suggestions.find(s => s.patternNumber === curated.number);
            if (!alreadyIncluded) {
              suggestions.push({
                patternId: curated.id,
                patternNumber: curated.number,
                patternName: curated.name,
                confidence: curated.relevanceScore,
                locationId: location.id,
                reasoning: curated.contextReason,
                category: curated.category,
                mlAlgorithm: "geographic_contextual_analysis"
              });
            }
          }
        } catch (error) {
          console.log(`Contextual curator analysis not available for location ${location.id}, using intelligent analysis only`);
        }
      }

      // Fallback to basic matching if no sophisticated suggestions found
      if (suggestions.length === 0) {
        console.log(`No sophisticated suggestions found, using basic pattern matching as fallback`);
        const basicSuggestions = await this.generateBasicSuggestions(location);
        suggestions.push(...basicSuggestions);
      }

    } catch (error) {
      console.error('Error in sophisticated pattern analysis:', error);
      // Fallback to basic matching on error
      const basicSuggestions = await this.generateBasicSuggestions(location);
      suggestions.push(...basicSuggestions);
    }

    // Sort by confidence descending
    suggestions.sort((a, b) => b.confidence - a.confidence);

    // Cache results for 5 minutes
    cache.set(cacheKey, suggestions, 300);
    
    console.log(`Generated ${suggestions.length} pattern suggestions for location ${location.id} using sophisticated analysis`);
    return suggestions;
  }

  private async generateBasicSuggestions(location: any): Promise<any[]> {
    const context = this.compileLocationContext(location);
    const suggestions = [];
    
    // Use basic matching algorithm as fallback
    for (const pattern of this.patterns) {
      const confidence = this.calculateOptimizedConfidence(pattern, context);
      
      if (confidence > 0.3) {
        suggestions.push({
          patternId: pattern.id,
          patternNumber: pattern.number,
          patternName: pattern.name,
          confidence,
          locationId: location.id,
          mlAlgorithm: "basic_keyword_matching_fallback"
        });
      }
    }

    return suggestions;
  }

  private calculateOptimizedConfidence(pattern: OptimizedPattern, context: LocationAnalysisContext): number {
    let confidence = 0.3; // Base confidence - increased for better pattern detection

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

    // Handle generic location names by providing base community patterns
    if (!context.name || context.name === 'Current Location' || context.name.trim() === '') {
      // For generic locations, boost common community patterns
      if (pattern.category === 'Community' || pattern.category === 'Buildings') {
        boost += 0.15;
      }
    }

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