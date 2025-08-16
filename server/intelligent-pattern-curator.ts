import { optimizedPatternAnalyzer } from './optimized-pattern-analyzer';
import { storage } from './storage';
import { infrastructureAnalyzer, type PatternImplementationRoadmap } from './infrastructure-analyzer';
import type { UserComment, IntelligentSuggestion, Pattern } from '@shared/schema';

/**
 * Intelligent Pattern Curator - Learns from user feedback to suggest 
 * Christopher Alexander patterns that address real urban problems
 */
export class IntelligentPatternCurator {
  private patternAnalyzer: any;
  
  // Problem-to-pattern mapping based on Christopher Alexander's Pattern Language
  private readonly problemPatternMap: Record<string, number[]> = {
    // Safety and Security
    'safety': [3, 12, 13, 14, 31, 35, 102, 103], // City Country Fingers, Community of 7000, Subculture Boundary, Identifiable Neighborhood, Promenade, Household Mix, Family of Entrances, Small Parking Lots
    'crime': [14, 31, 35, 102, 103, 110, 113], // Identifiable Neighborhood, Promenade, Household Mix, Family of Entrances, Small Parking Lots, Main Entrance, Car Connection
    'lighting': [102, 103, 110, 113, 114, 115, 116], // Family of Entrances, Small Parking Lots, Main Entrance, Car Connection, Hierarchy of Open Space, Courtyards Which Live, Cascade of Roofs
    
    // Accessibility and Movement
    'accessibility': [12, 23, 32, 33, 51, 52, 53], // Community of 7000, Parallel Roads, Shopping Street, Night Life, Green Streets, Network of Paths and Cars, Main Gateways
    'transportation': [23, 32, 33, 51, 52, 53, 97], // Parallel Roads, Shopping Street, Night Life, Green Streets, Network of Paths and Cars, Main Gateways, Shielded Parking
    'walkability': [51, 52, 53, 59, 60, 61, 88], // Green Streets, Network of Paths and Cars, Main Gateways, Quiet Backs, Accessible Green, Small Public Squares, Street Cafe
    'parking': [97, 103, 104, 113], // Shielded Parking, Small Parking Lots, Site Repair, Car Connection
    
    // Community and Social Connection
    'community': [7, 8, 10, 14, 18, 30, 31], // The Countryside, Mosaic of Subcultures, Magic of the City, Identifiable Neighborhood, Network of Learning, Activity Node, Promenade
    'isolation': [30, 31, 58, 59, 60, 61, 62], // Activity Node, Promenade, Carnival, Quiet Backs, Accessible Green, Small Public Squares, High Places
    'gathering': [30, 31, 58, 59, 60, 61, 88], // Activity Node, Promenade, Carnival, Quiet Backs, Accessible Green, Small Public Squares, Street Cafe
    'children': [15, 57, 73, 86, 147, 203], // Neighborhood Boundary, Children in the City, Adventure Playground, Children's Home, Communal Eating, Child Caves
    
    // Environment and Nature
    'environment': [4, 5, 6, 47, 48, 49, 104], // Agricultural Valleys, Lace of Country Streets, Country Towns, Health Center, Garden Growing Wild, Looped Local Roads, Site Repair
    'pollution': [4, 5, 6, 47, 48, 49, 104], // Agricultural Valleys, Lace of Country Streets, Country Towns, Health Center, Garden Growing Wild, Looped Local Roads, Site Repair
    'green_space': [47, 48, 49, 60, 67, 114, 171], // Health Center, Garden Growing Wild, Looped Local Roads, Accessible Green, Common Land, Hierarchy of Open Space, Tree Places
    'air_quality': [4, 5, 6, 47, 48, 171], // Agricultural Valleys, Lace of Country Streets, Country Towns, Health Center, Garden Growing Wild, Tree Places
    
    // Housing and Density
    'housing': [35, 36, 37, 38, 39, 40, 75], // Household Mix, Degrees of Publicness, House Cluster, Row Houses, Housing Hill, Old People Everywhere, The Family
    'density': [11, 12, 13, 14, 35, 36, 37], // Local Transport Areas, Community of 7000, Subculture Boundary, Identifiable Neighborhood, Household Mix, Degrees of Publicness, House Cluster
    'affordability': [35, 36, 40, 79, 83, 143], // Household Mix, Degrees of Publicness, Old People Everywhere, Your Own Home, Master and Apprentices, Bed Cluster
    
    // Economic and Commercial
    'business': [19, 32, 33, 87, 88, 89, 90], // Web of Shopping, Shopping Street, Night Life, Individually Owned Shops, Street Cafe, Corner Grocery, Beer Hall
    'employment': [9, 19, 41, 42, 43, 80, 83], // Scattered Work, Web of Shopping, Work Community, Industrial Ribbon, University as a Marketplace, Self-Governing Workshops and Offices, Master and Apprentices
    'tourism': [30, 31, 58, 62, 88, 94, 239], // Activity Node, Promenade, Carnival, High Places, Street Cafe, Sleeping in Public, Small Panes
    
    // Infrastructure and Services
    'utilities': [23, 25, 104, 105, 106, 107], // Parallel Roads, City of 25,000, Site Repair, South Facing Outdoors, Positive Outdoor Space, Wings of Light
    'internet': [82, 83, 84, 146, 147], // Office Connections, Master and Apprentices, Teenage Society, Flexible Office Space, Communal Eating
    'healthcare': [47, 74, 148, 149, 150], // Health Center, Animals, Small Work Groups, Reception Welcomes You, A Place to Wait
    'education': [18, 57, 73, 83, 86, 147], // Network of Learning, Children in the City, Adventure Playground, Master and Apprentices, Children's Home, Communal Eating
  };

  constructor() {
    this.patternAnalyzer = optimizedPatternAnalyzer;
  }

  /**
   * Generates implementation roadmap for actionable pattern implementation
   */
  async generateImplementationRoadmap(patternNumber: number, location: any): Promise<PatternImplementationRoadmap | null> {
    try {
      // High-priority actionable patterns that benefit from infrastructure analysis
      const actionablePatterns = [20, 30, 31, 88, 12, 51, 52, 53, 97]; // Mini-Buses, Activity Node, Promenade, Street Cafe, etc.
      
      if (!actionablePatterns.includes(patternNumber)) {
        return null; // Skip infrastructure analysis for non-actionable patterns
      }
      
      const infrastructure = await infrastructureAnalyzer.analyzeInfrastructure(location);
      const roadmap = await infrastructureAnalyzer.createPatternImplementationRoadmap(
        patternNumber, 
        location, 
        infrastructure
      );
      
      return roadmap;
    } catch (error) {
      console.error(`Failed to generate implementation roadmap for pattern ${patternNumber}:`, error);
      return null;
    }
  }

  /**
   * Generates comprehensive contextual analysis for any location based on coordinates and context
   */
  async generateContextualAnalysis(location: any): Promise<IntelligentSuggestion[]> {
    const suggestions: IntelligentSuggestion[] = [];
    const allPatterns = await storage.getAllPatterns();
    
    // Analyze location characteristics
    const lat = parseFloat(location.latitude);
    const lng = parseFloat(location.longitude);
    
    // Create synthetic contextual analysis based on location characteristics
    const contextualProblems = this.inferLocationProblems(lat, lng, location.name);
    
    for (const problemArea of contextualProblems) {
      const relevantPatterns = this.problemPatternMap[problemArea.category] || [];
      
      for (const patternNumber of relevantPatterns.slice(0, 3)) { // Top 3 patterns per problem
        const pattern = allPatterns.find(p => p.number === patternNumber);
        if (!pattern) continue;
        
        const relevanceScore = this.calculateContextualRelevance(problemArea, pattern, lat, lng);
        if (relevanceScore < 0.3) continue; // Filter low-relevance suggestions
        
        // Generate implementation roadmap for actionable patterns
        const implementationRoadmap = await this.generateImplementationRoadmap(pattern.number, location);
        
        const suggestion: IntelligentSuggestion = {
          locationId: location.id,
          commentId: null,
          patternId: pattern.id,
          reasoning: this.generateContextualReasoning(problemArea, pattern, location),
          relevanceScore: relevanceScore.toString(),
          problemsAddressed: [problemArea.category, ...problemArea.relatedProblems],
          implementationPriority: this.determineContextualPriority(problemArea.severity, relevanceScore),
          communitySupport: 0,
          isImplemented: false,
          implementationNotes: implementationRoadmap ? JSON.stringify(implementationRoadmap) : null,
          // pattern: pattern  // Remove this as it's not in the schema
        };
        
        suggestions.push(suggestion);
      }
    }
    
    return this.deduplicateAndRank(suggestions).slice(0, 8); // Return top 8 suggestions
  }

  /**
   * Analyzes user comments and generates intelligent pattern suggestions
   */
  async generateIntelligentSuggestions(
    locationId: number, 
    userComments: UserComment[]
  ): Promise<IntelligentSuggestion[]> {
    const suggestions: IntelligentSuggestion[] = [];
    const allPatterns = await storage.getAllPatterns();
    
    for (const comment of userComments) {
      if (comment.commentType === 'problem') {
        const patternSuggestions = await this.analyzeProblemsAndSuggestPatterns(
          comment, 
          allPatterns,
          locationId
        );
        suggestions.push(...patternSuggestions);
      }
    }

    // Remove duplicates and sort by relevance
    const uniqueSuggestions = this.deduplicateAndRank(suggestions);
    
    // Store in database
    for (const suggestion of uniqueSuggestions.slice(0, 10)) { // Top 10 suggestions
      await storage.createIntelligentSuggestion(suggestion);
    }

    return uniqueSuggestions;
  }

  /**
   * Analyzes a problem comment and suggests relevant Christopher Alexander patterns
   */
  private async analyzeProblemsAndSuggestPatterns(
    comment: UserComment,
    allPatterns: Pattern[],
    locationId: number
  ): Promise<IntelligentSuggestion[]> {
    const suggestions: IntelligentSuggestion[] = [];
    const problemKeywords = this.extractProblemKeywords(comment.content);
    
    // Find relevant patterns based on problem categories and keywords
    const relevantPatternIds = new Set<number>();
    
    // Add patterns based on explicit problem categories
    for (const category of comment.problemCategories) {
      const patterns = this.problemPatternMap[category] || [];
      patterns.forEach(id => relevantPatternIds.add(id));
    }
    
    // Add patterns based on keyword analysis
    for (const keyword of problemKeywords) {
      const patterns = this.problemPatternMap[keyword] || [];
      patterns.forEach(id => relevantPatternIds.add(id));
    }

    // Generate suggestions for each relevant pattern
    for (const patternId of Array.from(relevantPatternIds)) {
      const pattern = allPatterns.find(p => p.id === patternId);
      if (!pattern) continue;

      const suggestion = await this.createIntelligentSuggestion(
        comment,
        pattern,
        locationId,
        problemKeywords
      );
      
      if (parseFloat(suggestion.relevanceScore) > 0.3) { // Only include high-relevance suggestions
        suggestions.push(suggestion);
      }
    }

    return suggestions;
  }

  /**
   * Creates an intelligent suggestion with reasoning and relevance scoring
   */
  private async createIntelligentSuggestion(
    comment: UserComment,
    pattern: Pattern,
    locationId: number,
    problemKeywords: string[]
  ): Promise<IntelligentSuggestion> {
    const relevanceScore = this.calculateRelevanceScore(comment, pattern, problemKeywords);
    const reasoning = this.generateReasoning(comment, pattern, problemKeywords);
    const problemsAddressed = this.identifyProblemsAddressed(comment, pattern);
    const priority = this.determinePriority(comment.severity, relevanceScore);

    return {
      locationId,
      commentId: comment.id,
      patternId: pattern.id,
      reasoning,
      relevanceScore: relevanceScore.toString(),
      problemsAddressed,
      implementationPriority: priority,
      communitySupport: 0,
      isImplemented: false,
      implementationNotes: null,
      createdAt: new Date(),
      updatedAt: new Date()
    } as IntelligentSuggestion;
  }

  /**
   * Calculates relevance score based on keyword matching and semantic analysis
   */
  private calculateRelevanceScore(
    comment: UserComment, 
    pattern: Pattern, 
    problemKeywords: string[]
  ): number {
    let score = 0;
    
    // Keyword matching in pattern keywords
    const patternKeywords = pattern.keywords.map(k => k.toLowerCase());
    const matchingKeywords = problemKeywords.filter(k => 
      patternKeywords.some(pk => pk.includes(k) || k.includes(pk))
    );
    score += (matchingKeywords.length / problemKeywords.length) * 0.4;
    
    // Problem category relevance
    const categoryBonus = comment.problemCategories.reduce((bonus, category) => {
      return this.problemPatternMap[category]?.includes(pattern.number) ? bonus + 0.2 : bonus;
    }, 0);
    score += Math.min(categoryBonus, 0.4);
    
    // Severity weighting
    const severityNum = comment.severity ? (comment.severity === 'critical' ? 5 : comment.severity === 'high' ? 4 : comment.severity === 'medium' ? 3 : comment.severity === 'low' ? 2 : 1) : 3;
    score += (severityNum / 5) * 0.2;
    
    return Math.min(score, 1.0);
  }

  /**
   * Generates human-readable reasoning for pattern suggestion
   */
  private generateReasoning(
    comment: UserComment,
    pattern: Pattern,
    problemKeywords: string[]
  ): string {
    const problemDesc = comment.content.substring(0, 100) + '...';
    
    return `Pattern ${pattern.number} "${pattern.name}" addresses the described issue: "${problemDesc}". ` +
           `This pattern is specifically designed to ${pattern.description.toLowerCase()}. ` +
           `Implementation would directly address concerns about ${problemKeywords.slice(0, 3).join(', ')} ` +
           `by creating ${this.getPatternBenefits(pattern)}.`;
  }

  /**
   * Identifies specific problems this pattern would address
   */
  private identifyProblemsAddressed(comment: UserComment, pattern: Pattern): string[] {
    const problems = [...comment.problemCategories];
    
    // Add inferred problems based on pattern capabilities
    for (const [problem, patterns] of Object.entries(this.problemPatternMap)) {
      if (patterns.includes(pattern.number) && !problems.includes(problem)) {
        problems.push(problem);
      }
    }
    
    return problems.slice(0, 5); // Limit to top 5 problems
  }

  /**
   * Determines implementation priority based on severity and community impact
   */
  private determinePriority(severity: string | null, relevanceScore: number): string {
    const severityNum = severity ? (severity === 'critical' ? 5 : severity === 'high' ? 4 : severity === 'medium' ? 3 : severity === 'low' ? 2 : 1) : 3;
    const urgencyScore = severityNum * relevanceScore;
    
    if (urgencyScore >= 4.0) return 'immediate';
    if (urgencyScore >= 2.5) return 'short_term';
    return 'long_term';
  }

  /**
   * Extracts problem-related keywords from user comment
   */
  private extractProblemKeywords(content: string): string[] {
    const problemWords = [
      'unsafe', 'dangerous', 'dark', 'isolated', 'crowded', 'noisy', 'pollution',
      'traffic', 'parking', 'accessibility', 'wheelchair', 'stairs', 'hills',
      'community', 'lonely', 'antisocial', 'crime', 'vandalism', 'homeless',
      'children', 'elderly', 'families', 'students', 'workers', 'tourists',
      'environment', 'green', 'trees', 'nature', 'air', 'water', 'noise',
      'housing', 'expensive', 'affordable', 'density', 'overcrowded',
      'business', 'shops', 'restaurants', 'services', 'employment', 'jobs'
    ];
    
    const contentLower = content.toLowerCase();
    return problemWords.filter(word => contentLower.includes(word));
  }

  /**
   * Gets specific benefits this pattern would provide
   */
  private getPatternBenefits(pattern: Pattern): string {
    // Simplified benefit mapping - in practice, this would be more sophisticated
    const benefitMap: Record<string, string> = {
      'street': 'safer, more walkable streets with natural surveillance',
      'public': 'vibrant public spaces that encourage community interaction',
      'green': 'accessible green spaces for health and environmental benefits',
      'housing': 'diverse, affordable housing options for all demographics',
      'transport': 'efficient, human-scale transportation networks',
      'community': 'strong social connections and local identity'
    };
    
    for (const [key, benefit] of Object.entries(benefitMap)) {
      if (pattern.description.toLowerCase().includes(key)) {
        return benefit;
      }
    }
    
    return 'improved urban environment aligned with human needs';
  }

  /**
   * Infers likely problems at a location based on coordinates and context
   */
  private inferLocationProblems(lat: number, lng: number, name: string): Array<{
    category: string;
    severity: string;
    description: string;
    relatedProblems: string[];
  }> {
    const problems = [];
    
    // Analyze based on coordinates (Minneapolis area analysis)
    const isUrban = lat > 44.9 && lat < 45.1 && lng > -93.4 && lng < -93.1;
    const isSuburban = !isUrban && lat > 44.7 && lat < 45.2 && lng > -93.6 && lng < -92.9;
    
    if (isUrban) {
      problems.push(
        {
          category: 'transportation',
          severity: 'high',
          description: 'Urban area likely faces traffic congestion and parking challenges',
          relatedProblems: ['parking', 'walkability', 'accessibility']
        },
        {
          category: 'community',
          severity: 'medium',
          description: 'Dense urban environment may lack community gathering spaces',
          relatedProblems: ['gathering', 'isolation', 'children']
        },
        {
          category: 'environment',
          severity: 'high',
          description: 'Urban setting typically needs more green space and air quality improvements',
          relatedProblems: ['green_space', 'air_quality', 'pollution']
        }
      );
    }
    
    if (isSuburban) {
      problems.push(
        {
          category: 'accessibility',
          severity: 'medium',
          description: 'Suburban area may have limited walkability and transit access',
          relatedProblems: ['transportation', 'walkability', 'elderly']
        },
        {
          category: 'community',
          severity: 'medium',
          description: 'Suburban sprawl can create social isolation',
          relatedProblems: ['isolation', 'gathering', 'children']
        }
      );
    }
    
    // Analyze based on location name
    const nameLower = name?.toLowerCase() || '';
    if (nameLower.includes('river') || nameLower.includes('water')) {
      problems.push({
        category: 'accessibility',
        severity: 'high',
        description: 'Waterfront location needs safe pedestrian access and recreational opportunities',
        relatedProblems: ['safety', 'walkability', 'environment']
      });
    }
    
    if (nameLower.includes('parking') || nameLower.includes('lot')) {
      problems.push({
        category: 'environment',
        severity: 'high',
        description: 'Large parking areas create heat islands and reduce green space',
        relatedProblems: ['green_space', 'air_quality', 'walkability']
      });
    }
    
    if (nameLower.includes('school') || nameLower.includes('university')) {
      problems.push({
        category: 'safety',
        severity: 'high',
        description: 'Educational areas need enhanced safety and child-friendly design',
        relatedProblems: ['children', 'accessibility', 'community']
      });
    }
    
    return problems.length > 0 ? problems : [
      {
        category: 'community',
        severity: 'medium',
        description: 'General location could benefit from enhanced community spaces',
        relatedProblems: ['gathering', 'accessibility', 'environment']
      }
    ];
  }

  /**
   * Calculates relevance score for contextual patterns
   */
  private calculateContextualRelevance(problemArea: any, pattern: Pattern, lat: number, lng: number): number {
    let score = 0.5; // Base score
    
    // Pattern category alignment
    if (problemArea.relatedProblems.some((problem: string) => 
      this.problemPatternMap[problem]?.includes(pattern.number)
    )) {
      score += 0.3;
    }
    
    // Geographic context boost
    const isUrban = lat > 44.9 && lat < 45.1;
    if (isUrban && pattern.category === 'Urban') score += 0.2;
    if (!isUrban && pattern.category === 'Outdoor') score += 0.2;
    
    // Severity weighting
    const severityBoost = problemArea.severity === 'high' ? 0.2 : problemArea.severity === 'medium' ? 0.1 : 0;
    score += severityBoost;
    
    return Math.min(score, 1.0);
  }

  /**
   * Generates reasoning for contextual pattern suggestions
   */
  private generateContextualReasoning(problemArea: any, pattern: Pattern, location: any): string {
    const coordinates = `${parseFloat(location.latitude).toFixed(6)}, ${parseFloat(location.longitude).toFixed(6)}`;
    
    return `AI Analysis for ${location.name || 'this location'} (${coordinates}): ${problemArea.description}. ` +
           `Pattern ${pattern.number} "${pattern.name}" directly addresses this by ${pattern.description.toLowerCase()}. ` +
           `This contextual analysis identified ${problemArea.relatedProblems.join(', ')} as key areas for improvement. ` +
           `Implementation would create ${this.getPatternBenefits(pattern)} specifically suited to this location's characteristics.`;
  }

  /**
   * Determines implementation priority for contextual suggestions
   */
  private determineContextualPriority(severity: string, relevanceScore: number): string {
    const urgencyScore = (severity === 'high' ? 3 : severity === 'medium' ? 2 : 1) * relevanceScore;
    
    if (urgencyScore >= 2.4) return 'short_term';
    if (urgencyScore >= 1.5) return 'medium_term';
    return 'long_term';
  }

  /**
   * Removes duplicate suggestions and ranks by relevance
   */
  private deduplicateAndRank(suggestions: IntelligentSuggestion[]): IntelligentSuggestion[] {
    const uniqueMap = new Map<string, IntelligentSuggestion>();
    
    for (const suggestion of suggestions) {
      const key = `${suggestion.locationId}-${suggestion.patternId}`;
      const existing = uniqueMap.get(key);
      
      if (!existing || parseFloat(suggestion.relevanceScore) > parseFloat(existing.relevanceScore)) {
        uniqueMap.set(key, suggestion);
      }
    }
    
    return Array.from(uniqueMap.values())
      .sort((a, b) => parseFloat(b.relevanceScore) - parseFloat(a.relevanceScore));
  }

  /**
   * Generates community consensus summary for pattern implementation
   */
  async generateConsensusReport(suggestionId: number): Promise<{
    overallSupport: number;
    supportBreakdown: Record<string, number>;
    localResidentSupport: number;
    implementationReadiness: string;
  }> {
    const consensusData = await storage.getConsensusForSuggestion(suggestionId);
    
    const supportLevels = ['strongly_oppose', 'oppose', 'neutral', 'support', 'strongly_support'];
    const supportBreakdown = supportLevels.reduce((acc, level) => {
      acc[level] = consensusData.filter(c => c.supportLevel === level).length;
      return acc;
    }, {} as Record<string, number>);
    
    const totalVotes = consensusData.length;
    const positiveVotes = supportBreakdown['support'] + supportBreakdown['strongly_support'];
    const overallSupport = totalVotes > 0 ? positiveVotes / totalVotes : 0;
    
    const localResidents = consensusData.filter(c => c.isLocalResident);
    const localPositiveVotes = localResidents.filter(c => 
      c.supportLevel === 'support' || c.supportLevel === 'strongly_support'
    ).length;
    const localResidentSupport = localResidents.length > 0 ? 
      localPositiveVotes / localResidents.length : 0;
    
    let implementationReadiness = 'not_ready';
    if (overallSupport >= 0.7 && localResidentSupport >= 0.6 && totalVotes >= 10) {
      implementationReadiness = 'ready';
    } else if (overallSupport >= 0.5 && totalVotes >= 5) {
      implementationReadiness = 'needs_more_support';
    }
    
    return {
      overallSupport,
      supportBreakdown,
      localResidentSupport,
      implementationReadiness
    };
  }
}

export const intelligentPatternCurator = new IntelligentPatternCurator();