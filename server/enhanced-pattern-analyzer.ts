// Enhanced Pattern Recognition Engine with Alexander's Key Architectural Metrics
// Expands beyond basic contextual analysis to include building scale, stories, and spatial relationships

import { alexanderPatterns, getPatternByNumber, type AlexanderPattern } from "./alexander-patterns";

export interface ArchitecturalContext {
  // Basic location data
  latitude: number;
  longitude: number;
  populationDensity: number;
  areaSize: number; // km²
  
  // Enhanced architectural metrics from Alexander's patterns
  buildingHeights: {
    averageStories: number;
    maxStories: number;
    predominantHeight: 'low-rise' | 'mid-rise' | 'high-rise'; // 1-3, 4-8, 9+ stories
    heightVariation: number; // 0-1 score for height diversity
  };
  
  spatialConfiguration: {
    blockSize: number; // meters, average block dimension
    streetWidth: number; // meters
    openSpaceRatio: number; // 0-1, public space vs built area
    connectivity: number; // 0-1 score for street network connectivity
    permeability: number; // 0-1 score for pedestrian access
  };
  
  buildingTypology: {
    predominantType: 'detached' | 'attached' | 'courtyard' | 'tower' | 'mixed';
    buildingFootprint: number; // average building footprint in m²
    lotCoverage: number; // 0-1 ratio of building to lot area
    setbackVariation: number; // 0-1 score for setback diversity
  };
  
  humanScale: {
    eyeLevelActivity: number; // 0-1 score for ground floor engagement
    pedestrianComfort: number; // 0-1 score based on scale and enclosure
    socialSpaces: number; // count of gathering spaces per area
    transitionalSpaces: number; // semi-private/public spaces
  };
  
  accessibilityMetrics: {
    transitAccess: boolean;
    bikeInfrastructure: number; // 0-1 score
    walkability: number; // 0-100 Walk Score equivalent
    carDependency: number; // 0-1 score, higher = more car dependent
  };
  
  landUsePattern: {
    mixedUse: number; // 0-1 score for mixed-use intensity
    primaryUse: 'residential' | 'commercial' | 'office' | 'industrial' | 'institutional' | 'mixed';
    useDiversity: number; // entropy score for use diversity
    groundFloorUses: string[]; // specific ground floor activities
  };
  
  naturalElements: {
    treeCanopyCover: number; // 0-1 ratio
    waterAccess: boolean;
    topographyVariation: number; // 0-1 score for terrain variation
    viewCorridors: number; // count of significant views
  };
  
  socialInfrastructure: {
    communitySpaces: number; // count per area
    educationalFacilities: number;
    healthcareFacilities: number;
    culturalFacilities: number;
    religiousSpaces: number;
  };
}

export interface EnhancedPatternMatch {
  pattern: AlexanderPattern;
  confidence: number;
  reasons: string[];
  architecturalFit: {
    scaleAlignment: number; // 0-1 score for scale appropriateness
    typologyMatch: number; // 0-1 score for building type match
    spatialLogic: number; // 0-1 score for spatial relationship logic
    humanScaleAdherence: number; // 0-1 score for human scale principles
  };
  keyMetrics: {
    criticalDimensions: string[]; // specific measurements that matter
    idealParameters: { [key: string]: any }; // ideal values for this pattern
    currentDeviation: { [key: string]: number }; // how far from ideal
  };
  implementationGuidance: {
    designPrinciples: string[];
    dimensionalRequirements: string[];
    spatialRelationships: string[];
    materialConsiderations: string[];
  };
}

export class EnhancedPatternAnalyzer {
  private patterns: AlexanderPattern[];

  constructor() {
    this.patterns = alexanderPatterns;
  }

  analyzePatterns(context: ArchitecturalContext): EnhancedPatternMatch[] {
    const matches: EnhancedPatternMatch[] = [];

    for (const pattern of this.patterns) {
      const match = this.calculateEnhancedMatch(pattern, context);
      if (match.confidence > 0.3) {
        matches.push(match);
      }
    }

    return matches.sort((a, b) => b.confidence - a.confidence);
  }

  private calculateEnhancedMatch(pattern: AlexanderPattern, context: ArchitecturalContext): EnhancedPatternMatch {
    let confidence = 0.3; // Base confidence
    const reasons: string[] = [];
    const architecturalFit = {
      scaleAlignment: 0.5,
      typologyMatch: 0.5,
      spatialLogic: 0.5,
      humanScaleAdherence: 0.5
    };

    // Pattern-specific architectural analysis
    const specificAnalysis = this.getPatternSpecificAnalysis(pattern, context);
    confidence += specificAnalysis.confidenceBonus;
    reasons.push(...specificAnalysis.reasons);
    
    // Merge architectural fit scores
    Object.assign(architecturalFit, specificAnalysis.architecturalFit);

    // Building height and scale analysis
    const heightAnalysis = this.analyzeHeightCompatibility(pattern, context);
    confidence += heightAnalysis.bonus;
    reasons.push(...heightAnalysis.reasons);
    architecturalFit.scaleAlignment = heightAnalysis.scaleScore;

    // Spatial configuration analysis
    const spatialAnalysis = this.analyzeSpatialConfiguration(pattern, context);
    confidence += spatialAnalysis.bonus;
    reasons.push(...spatialAnalysis.reasons);
    architecturalFit.spatialLogic = spatialAnalysis.spatialScore;

    // Human scale analysis
    const humanScaleAnalysis = this.analyzeHumanScale(pattern, context);
    confidence += humanScaleAnalysis.bonus;
    reasons.push(...humanScaleAnalysis.reasons);
    architecturalFit.humanScaleAdherence = humanScaleAnalysis.humanScaleScore;

    // Building typology analysis
    const typologyAnalysis = this.analyzeTypology(pattern, context);
    confidence += typologyAnalysis.bonus;
    reasons.push(...typologyAnalysis.reasons);
    architecturalFit.typologyMatch = typologyAnalysis.typologyScore;

    return {
      pattern,
      confidence: Math.max(0, Math.min(1, confidence)),
      reasons: reasons.filter(Boolean),
      architecturalFit,
      keyMetrics: this.getKeyMetrics(pattern, context),
      implementationGuidance: this.getImplementationGuidance(pattern, context)
    };
  }

  private getPatternSpecificAnalysis(pattern: AlexanderPattern, context: ArchitecturalContext) {
    const analysis = { confidenceBonus: 0, reasons: [], architecturalFit: {} };

    switch (pattern.number) {
      case 21: // Four-Story Limit
        if (context.buildingHeights.maxStories <= 4) {
          analysis.confidenceBonus += 0.4;
          analysis.reasons.push(`Maximum ${context.buildingHeights.maxStories} stories adheres to human scale limit`);
          analysis.architecturalFit = { scaleAlignment: 0.9, humanScaleAdherence: 0.9 };
        } else {
          analysis.confidenceBonus -= 0.3;
          analysis.reasons.push(`Buildings exceed four-story human scale limit (max: ${context.buildingHeights.maxStories})`);
          analysis.architecturalFit = { scaleAlignment: 0.2, humanScaleAdherence: 0.3 };
        }
        break;

      case 96: // Number of Stories
        const idealStories = context.populationDensity > 300 ? 3 : 2;
        const deviation = Math.abs(context.buildingHeights.averageStories - idealStories);
        if (deviation < 1) {
          analysis.confidenceBonus += 0.3;
          analysis.reasons.push(`Average ${context.buildingHeights.averageStories} stories matches density requirements`);
        }
        break;

      case 106: // Positive Outdoor Space
        if (context.spatialConfiguration.openSpaceRatio > 0.3) {
          analysis.confidenceBonus += 0.35;
          analysis.reasons.push(`${(context.spatialConfiguration.openSpaceRatio * 100).toFixed(0)}% open space creates positive outdoor areas`);
          analysis.architecturalFit = { spatialLogic: 0.8 };
        }
        break;

      case 61: // Small Public Squares
        if (context.spatialConfiguration.blockSize < 150 && context.humanScale.socialSpaces > 2) {
          analysis.confidenceBonus += 0.4;
          analysis.reasons.push(`Small blocks (${context.spatialConfiguration.blockSize}m) with ${context.humanScale.socialSpaces} social spaces support square formation`);
        }
        break;

      case 95: // Building Complex
        if (context.buildingTypology.predominantType === 'courtyard' || context.buildingTypology.predominantType === 'attached') {
          analysis.confidenceBonus += 0.3;
          analysis.reasons.push(`${context.buildingTypology.predominantType} building type supports complex formation`);
          analysis.architecturalFit = { typologyMatch: 0.8 };
        }
        break;

      case 30: // Activity Nodes
        if (context.landUsePattern.mixedUse > 0.6 && context.accessibilityMetrics.transitAccess) {
          analysis.confidenceBonus += 0.4;
          analysis.reasons.push(`High mixed-use (${(context.landUsePattern.mixedUse * 100).toFixed(0)}%) with transit creates activity node`);
        }
        break;

      case 88: // Street Café
        if (context.humanScale.eyeLevelActivity > 0.7 && context.landUsePattern.groundFloorUses.includes('commercial')) {
          analysis.confidenceBonus += 0.35;
          analysis.reasons.push(`High street-level activity (${(context.humanScale.eyeLevelActivity * 100).toFixed(0)}%) supports café culture`);
        }
        break;

      case 100: // Pedestrian Street
        if (context.spatialConfiguration.streetWidth < 8 && context.accessibilityMetrics.carDependency < 0.3) {
          analysis.confidenceBonus += 0.4;
          analysis.reasons.push(`Narrow streets (${context.spatialConfiguration.streetWidth}m) with low car dependency support pedestrian use`);
        }
        break;

      case 125: // Stair Seats
        if (context.naturalElements.topographyVariation > 0.4) {
          analysis.confidenceBonus += 0.25;
          analysis.reasons.push(`Topographic variation supports natural stair and seating opportunities`);
        }
        break;

      case 171: // Tree Places
        if (context.naturalElements.treeCanopyCover > 0.4) {
          analysis.confidenceBonus += 0.3;
          analysis.reasons.push(`${(context.naturalElements.treeCanopyCover * 100).toFixed(0)}% tree canopy provides natural gathering spaces`);
        }
        break;
    }

    return analysis;
  }

  private analyzeHeightCompatibility(pattern: AlexanderPattern, context: ArchitecturalContext) {
    let bonus = 0;
    const reasons = [];
    let scaleScore = 0.5;

    // Human scale patterns prefer lower buildings
    const humanScalePatterns = [21, 37, 61, 88, 100, 106, 125];
    if (humanScalePatterns.includes(pattern.number)) {
      if (context.buildingHeights.averageStories <= 3) {
        bonus += 0.2;
        scaleScore = 0.8;
        reasons.push(`Low-rise scale (${context.buildingHeights.averageStories} stories) supports human-scaled pattern`);
      } else if (context.buildingHeights.averageStories > 6) {
        bonus -= 0.15;
        scaleScore = 0.3;
        reasons.push(`High-rise scale may conflict with human-scaled pattern requirements`);
      }
    }

    // Urban patterns can handle more height
    const urbanPatterns = [16, 30, 31, 95, 98];
    if (urbanPatterns.includes(pattern.number)) {
      if (context.buildingHeights.averageStories >= 4 && context.buildingHeights.averageStories <= 8) {
        bonus += 0.15;
        scaleScore = 0.7;
        reasons.push(`Mid-rise scale (${context.buildingHeights.averageStories} stories) appropriate for urban pattern`);
      }
    }

    // Height variation analysis
    if (context.buildingHeights.heightVariation > 0.6) {
      bonus += 0.1;
      reasons.push(`Good height variation (${(context.buildingHeights.heightVariation * 100).toFixed(0)}%) creates visual interest`);
    }

    return { bonus, reasons, scaleScore };
  }

  private analyzeSpatialConfiguration(pattern: AlexanderPattern, context: ArchitecturalContext) {
    let bonus = 0;
    const reasons = [];
    let spatialScore = 0.5;

    // Patterns requiring intimate scale
    const intimatePatterns = [37, 61, 88, 125];
    if (intimatePatterns.includes(pattern.number)) {
      if (context.spatialConfiguration.blockSize < 100) {
        bonus += 0.2;
        spatialScore = 0.8;
        reasons.push(`Intimate block size (${context.spatialConfiguration.blockSize}m) creates appropriate enclosure`);
      }
    }

    // Patterns requiring connectivity
    const connectivityPatterns = [16, 30, 52, 100];
    if (connectivityPatterns.includes(pattern.number)) {
      if (context.spatialConfiguration.connectivity > 0.7) {
        bonus += 0.15;
        spatialScore = Math.max(spatialScore, 0.7);
        reasons.push(`High connectivity (${(context.spatialConfiguration.connectivity * 100).toFixed(0)}%) supports movement patterns`);
      }
    }

    // Street width analysis
    if (context.spatialConfiguration.streetWidth > 4 && context.spatialConfiguration.streetWidth < 12) {
      bonus += 0.1;
      reasons.push(`Appropriate street width (${context.spatialConfiguration.streetWidth}m) for human scale`);
    }

    return { bonus, reasons, spatialScore };
  }

  private analyzeHumanScale(pattern: AlexanderPattern, context: ArchitecturalContext) {
    let bonus = 0;
    const reasons = [];
    let humanScaleScore = 0.5;

    // Eye-level activity is crucial for many patterns
    if (context.humanScale.eyeLevelActivity > 0.6) {
      bonus += 0.15;
      humanScaleScore = Math.max(humanScaleScore, 0.7);
      reasons.push(`Strong street-level activity (${(context.humanScale.eyeLevelActivity * 100).toFixed(0)}%) enhances human experience`);
    }

    // Social spaces are important for community patterns
    const communityPatterns = [12, 14, 37, 61];
    if (communityPatterns.includes(pattern.number)) {
      if (context.humanScale.socialSpaces > 2) {
        bonus += 0.2;
        humanScaleScore = Math.max(humanScaleScore, 0.8);
        reasons.push(`Multiple social spaces (${context.humanScale.socialSpaces}) support community formation`);
      }
    }

    // Transitional spaces add richness
    if (context.humanScale.transitionalSpaces > 1) {
      bonus += 0.1;
      reasons.push(`Transitional spaces (${context.humanScale.transitionalSpaces}) create spatial hierarchy`);
    }

    return { bonus, reasons, humanScaleScore };
  }

  private analyzeTypology(pattern: AlexanderPattern, context: ArchitecturalContext) {
    let bonus = 0;
    const reasons = [];
    let typologyScore = 0.5;

    // Courtyard patterns
    const courtyardPatterns = [95, 106, 115];
    if (courtyardPatterns.includes(pattern.number)) {
      if (context.buildingTypology.predominantType === 'courtyard') {
        bonus += 0.3;
        typologyScore = 0.9;
        reasons.push(`Courtyard building type directly supports pattern requirements`);
      }
    }

    // Dense patterns prefer attached buildings
    const densePatterns = [37, 61, 88];
    if (densePatterns.includes(pattern.number)) {
      if (context.buildingTypology.predominantType === 'attached') {
        bonus += 0.2;
        typologyScore = 0.7;
        reasons.push(`Attached building type creates appropriate density and enclosure`);
      }
    }

    // Lot coverage analysis
    if (context.buildingTypology.lotCoverage > 0.4 && context.buildingTypology.lotCoverage < 0.8) {
      bonus += 0.1;
      reasons.push(`Balanced lot coverage (${(context.buildingTypology.lotCoverage * 100).toFixed(0)}%) maintains building/open space ratio`);
    }

    return { bonus, reasons, typologyScore };
  }

  private getKeyMetrics(pattern: AlexanderPattern, context: ArchitecturalContext) {
    const criticalDimensions = [];
    const idealParameters: { [key: string]: any } = {};
    const currentDeviation: { [key: string]: number } = {};

    switch (pattern.number) {
      case 21: // Four-Story Limit
        criticalDimensions.push('Building Height', 'Story Count');
        idealParameters.maxStories = 4;
        idealParameters.averageStories = 3;
        currentDeviation.maxStories = Math.max(0, context.buildingHeights.maxStories - 4);
        currentDeviation.averageStories = Math.abs(context.buildingHeights.averageStories - 3);
        break;

      case 61: // Small Public Squares
        criticalDimensions.push('Block Size', 'Square Dimensions');
        idealParameters.blockSize = '80-120m';
        idealParameters.squareSize = '20-50m';
        currentDeviation.blockSize = Math.max(0, context.spatialConfiguration.blockSize - 120);
        break;

      case 100: // Pedestrian Street
        criticalDimensions.push('Street Width', 'Block Length');
        idealParameters.streetWidth = '4-8m';
        idealParameters.carAccess = 'limited';
        currentDeviation.streetWidth = Math.abs(context.spatialConfiguration.streetWidth - 6);
        break;

      case 106: // Positive Outdoor Space
        criticalDimensions.push('Enclosure Ratio', 'Space Proportions');
        idealParameters.enclosureRatio = '1:2 to 1:4';
        idealParameters.openSpaceRatio = '30-50%';
        currentDeviation.openSpaceRatio = Math.abs(context.spatialConfiguration.openSpaceRatio - 0.4);
        break;
    }

    return { criticalDimensions, idealParameters, currentDeviation };
  }

  private getImplementationGuidance(pattern: AlexanderPattern, context: ArchitecturalContext) {
    const designPrinciples = [];
    const dimensionalRequirements = [];
    const spatialRelationships = [];
    const materialConsiderations = [];

    switch (pattern.number) {
      case 21: // Four-Story Limit
        designPrinciples.push('Maintain human scale', 'Enable natural ventilation and lighting');
        dimensionalRequirements.push('Maximum 4 stories (12-14m height)', 'Floor-to-ceiling: 3-3.5m');
        spatialRelationships.push('Buildings should relate to pedestrian movement', 'Upper floors step back from street');
        materialConsiderations.push('Use materials that age well', 'Emphasize horizontal expression');
        break;

      case 61: // Small Public Squares
        designPrinciples.push('Create outdoor rooms', 'Enable spontaneous gathering');
        dimensionalRequirements.push('Size: 20-50m across', 'Height/width ratio: 1:2 to 1:4');
        spatialRelationships.push('Connect to pedestrian routes', 'Frame with building facades');
        materialConsiderations.push('Use durable paving materials', 'Include seating elements');
        break;

      case 88: // Street Café
        designPrinciples.push('Activate street edge', 'Create transition zones');
        dimensionalRequirements.push('Setback: 2-4m from street', 'Canopy height: 2.5-3.5m');
        spatialRelationships.push('Visual connection to indoor space', 'Buffer from traffic');
        materialConsiderations.push('Weather-resistant furniture', 'Flexible boundary elements');
        break;

      case 106: // Positive Outdoor Space
        designPrinciples.push('Define outdoor rooms', 'Create sense of enclosure');
        dimensionalRequirements.push('Height/width ratio maintains enclosure', 'Clear boundaries');
        spatialRelationships.push('Connect to building entries', 'Layer public to private spaces');
        materialConsiderations.push('Use enclosing elements (walls, hedges)', 'Define floor plane');
        break;
    }

    return { designPrinciples, dimensionalRequirements, spatialRelationships, materialConsiderations };
  }
}

export const enhancedPatternAnalyzer = new EnhancedPatternAnalyzer();