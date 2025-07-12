import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Building, Ruler, Users, TreePine, MapPin, TrendingUp, Eye, Home } from "lucide-react";

// Sample enhanced pattern analysis data
const sampleAnalysisData = {
  location: {
    name: "Downtown Plaza",
    coordinates: [44.9436, -92.8903],
    type: "urban center"
  },
  architecturalContext: {
    buildingHeights: {
      averageStories: 4.2,
      maxStories: 8,
      predominantHeight: "mid-rise",
      heightVariation: 0.7
    },
    spatialConfiguration: {
      blockSize: 85,
      streetWidth: 7.5,
      openSpaceRatio: 0.35,
      connectivity: 0.8,
      permeability: 0.75
    },
    buildingTypology: {
      predominantType: "attached",
      buildingFootprint: 850,
      lotCoverage: 0.65,
      setbackVariation: 0.4
    },
    humanScale: {
      eyeLevelActivity: 0.85,
      pedestrianComfort: 0.78,
      socialSpaces: 6,
      transitionalSpaces: 3
    },
    naturalElements: {
      treeCanopyCover: 0.45,
      waterAccess: false,
      topographyVariation: 0.3,
      viewCorridors: 2
    }
  },
  patternMatches: [
    {
      pattern: { number: 21, name: "Four-Story Limit", description: "Buildings should not exceed four stories to maintain human scale" },
      confidence: 0.82,
      reasons: ["Average 4.2 stories approaches human scale limit", "Good height variation creates visual interest"],
      architecturalFit: {
        scaleAlignment: 0.85,
        typologyMatch: 0.75,
        spatialLogic: 0.80,
        humanScaleAdherence: 0.88
      },
      keyMetrics: {
        criticalDimensions: ["Building Height", "Story Count"],
        idealParameters: { maxStories: 4, averageStories: 3 },
        currentDeviation: { maxStories: 4, averageStories: 1.2 }
      }
    },
    {
      pattern: { number: 61, name: "Small Public Squares", description: "Create outdoor rooms through small public squares" },
      confidence: 0.89,
      reasons: ["Small blocks (85m) create appropriate enclosure", "Multiple social spaces (6) support square formation", "High connectivity supports movement patterns"],
      architecturalFit: {
        scaleAlignment: 0.90,
        typologyMatch: 0.85,
        spatialLogic: 0.95,
        humanScaleAdherence: 0.87
      },
      keyMetrics: {
        criticalDimensions: ["Block Size", "Square Dimensions"],
        idealParameters: { blockSize: "80-120m", squareSize: "20-50m" },
        currentDeviation: { blockSize: 0 }
      }
    },
    {
      pattern: { number: 106, name: "Positive Outdoor Space", description: "Create outdoor spaces that are positive and well-defined" },
      confidence: 0.76,
      reasons: ["35% open space creates positive outdoor areas", "Good spatial enclosure with attached buildings"],
      architecturalFit: {
        scaleAlignment: 0.75,
        typologyMatch: 0.80,
        spatialLogic: 0.85,
        humanScaleAdherence: 0.70
      },
      keyMetrics: {
        criticalDimensions: ["Enclosure Ratio", "Space Proportions"],
        idealParameters: { enclosureRatio: "1:2 to 1:4", openSpaceRatio: "30-50%" },
        currentDeviation: { openSpaceRatio: 0.05 }
      }
    },
    {
      pattern: { number: 88, name: "Street Café", description: "Activate the street edge with café spaces" },
      confidence: 0.91,
      reasons: ["High street-level activity (85%) supports café culture", "Appropriate street width (7.5m) for outdoor dining"],
      architecturalFit: {
        scaleAlignment: 0.88,
        typologyMatch: 0.92,
        spatialLogic: 0.90,
        humanScaleAdherence: 0.95
      },
      keyMetrics: {
        criticalDimensions: ["Setback Distance", "Canopy Height"],
        idealParameters: { setback: "2-4m", canopyHeight: "2.5-3.5m" },
        currentDeviation: { setback: 0 }
      }
    }
  ]
};

export default function EnhancedPatternDemo() {
  const [selectedPattern, setSelectedPattern] = useState(sampleAnalysisData.patternMatches[0]);

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
          <Building className="h-8 w-8" />
          Enhanced Pattern Recognition
        </h1>
        <p className="text-muted-foreground">
          Comprehensive architectural analysis with Alexander's key metrics: building heights, spatial relationships, and human scale
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Analysis Overview</TabsTrigger>
          <TabsTrigger value="metrics">Key Metrics</TabsTrigger>
          <TabsTrigger value="patterns">Pattern Matches</TabsTrigger>
          <TabsTrigger value="guidance">Implementation</TabsTrigger>
        </TabsList>

        {/* Analysis Overview */}
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                {sampleAnalysisData.location.name}
              </CardTitle>
              <CardDescription>
                Comprehensive architectural context analysis with Alexander's pattern language metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                {/* Building Heights */}
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    Building Heights & Scale
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Average Stories</span>
                      <Badge variant="outline">{sampleAnalysisData.architecturalContext.buildingHeights.averageStories}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Maximum Stories</span>
                      <Badge variant="outline">{sampleAnalysisData.architecturalContext.buildingHeights.maxStories}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Height Type</span>
                      <Badge className="bg-blue-600">{sampleAnalysisData.architecturalContext.buildingHeights.predominantHeight}</Badge>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Height Variation</span>
                        <span>{(sampleAnalysisData.architecturalContext.buildingHeights.heightVariation * 100).toFixed(0)}%</span>
                      </div>
                      <Progress value={sampleAnalysisData.architecturalContext.buildingHeights.heightVariation * 100} className="h-2" />
                    </div>
                  </div>
                </div>

                {/* Spatial Configuration */}
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Ruler className="h-4 w-4" />
                    Spatial Configuration
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Block Size</span>
                      <Badge variant="outline">{sampleAnalysisData.architecturalContext.spatialConfiguration.blockSize}m</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Street Width</span>
                      <Badge variant="outline">{sampleAnalysisData.architecturalContext.spatialConfiguration.streetWidth}m</Badge>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Open Space Ratio</span>
                        <span>{(sampleAnalysisData.architecturalContext.spatialConfiguration.openSpaceRatio * 100).toFixed(0)}%</span>
                      </div>
                      <Progress value={sampleAnalysisData.architecturalContext.spatialConfiguration.openSpaceRatio * 100} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Connectivity</span>
                        <span>{(sampleAnalysisData.architecturalContext.spatialConfiguration.connectivity * 100).toFixed(0)}%</span>
                      </div>
                      <Progress value={sampleAnalysisData.architecturalContext.spatialConfiguration.connectivity * 100} className="h-2" />
                    </div>
                  </div>
                </div>

                {/* Human Scale */}
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Human Scale Metrics
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Eye-Level Activity</span>
                        <span>{(sampleAnalysisData.architecturalContext.humanScale.eyeLevelActivity * 100).toFixed(0)}%</span>
                      </div>
                      <Progress value={sampleAnalysisData.architecturalContext.humanScale.eyeLevelActivity * 100} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Pedestrian Comfort</span>
                        <span>{(sampleAnalysisData.architecturalContext.humanScale.pedestrianComfort * 100).toFixed(0)}%</span>
                      </div>
                      <Progress value={sampleAnalysisData.architecturalContext.humanScale.pedestrianComfort * 100} className="h-2" />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Social Spaces</span>
                      <Badge variant="outline">{sampleAnalysisData.architecturalContext.humanScale.socialSpaces}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Transitional Spaces</span>
                      <Badge variant="outline">{sampleAnalysisData.architecturalContext.humanScale.transitionalSpaces}</Badge>
                    </div>
                  </div>
                </div>

                {/* Building Typology */}
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Home className="h-4 w-4" />
                    Building Typology
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Type</span>
                      <Badge className="bg-green-600">{sampleAnalysisData.architecturalContext.buildingTypology.predominantType}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Avg Footprint</span>
                      <Badge variant="outline">{sampleAnalysisData.architecturalContext.buildingTypology.buildingFootprint}m²</Badge>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Lot Coverage</span>
                        <span>{(sampleAnalysisData.architecturalContext.buildingTypology.lotCoverage * 100).toFixed(0)}%</span>
                      </div>
                      <Progress value={sampleAnalysisData.architecturalContext.buildingTypology.lotCoverage * 100} className="h-2" />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Key Metrics */}
        <TabsContent value="metrics" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {sampleAnalysisData.patternMatches.map((match, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Pattern {match.pattern.number}: {match.pattern.name}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Confidence: {(match.confidence * 100).toFixed(0)}%
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Architectural Fit Scores */}
                    <div>
                      <h4 className="font-medium mb-3">Architectural Fit Analysis</h4>
                      <div className="space-y-2">
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Scale Alignment</span>
                            <span>{(match.architecturalFit.scaleAlignment * 100).toFixed(0)}%</span>
                          </div>
                          <Progress value={match.architecturalFit.scaleAlignment * 100} className="h-2" />
                        </div>
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Typology Match</span>
                            <span>{(match.architecturalFit.typologyMatch * 100).toFixed(0)}%</span>
                          </div>
                          <Progress value={match.architecturalFit.typologyMatch * 100} className="h-2" />
                        </div>
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Spatial Logic</span>
                            <span>{(match.architecturalFit.spatialLogic * 100).toFixed(0)}%</span>
                          </div>
                          <Progress value={match.architecturalFit.spatialLogic * 100} className="h-2" />
                        </div>
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Human Scale</span>
                            <span>{(match.architecturalFit.humanScaleAdherence * 100).toFixed(0)}%</span>
                          </div>
                          <Progress value={match.architecturalFit.humanScaleAdherence * 100} className="h-2" />
                        </div>
                      </div>
                    </div>

                    {/* Critical Dimensions */}
                    <div>
                      <h4 className="font-medium mb-2">Critical Dimensions</h4>
                      <div className="flex flex-wrap gap-2">
                        {match.keyMetrics.criticalDimensions.map((dim, i) => (
                          <Badge key={i} variant="outline">{dim}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Pattern Matches */}
        <TabsContent value="patterns" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Top Pattern Matches</CardTitle>
                <CardDescription>Patterns ranked by architectural fit and confidence</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {sampleAnalysisData.patternMatches.map((match, index) => (
                    <div
                      key={index}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedPattern === match ? 'bg-primary/10 border-primary' : 'hover:bg-muted'
                      }`}
                      onClick={() => setSelectedPattern(match)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-medium">Pattern {match.pattern.number}</div>
                          <div className="text-sm text-muted-foreground">{match.pattern.name}</div>
                        </div>
                        <Badge className="bg-green-600">{(match.confidence * 100).toFixed(0)}%</Badge>
                      </div>
                      <Progress value={match.confidence * 100} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Selected Pattern Analysis</CardTitle>
                <CardDescription>
                  Pattern {selectedPattern.pattern.number}: {selectedPattern.pattern.name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Pattern Description</h4>
                    <p className="text-sm text-muted-foreground">{selectedPattern.pattern.description}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Analysis Reasons</h4>
                    <div className="space-y-1">
                      {selectedPattern.reasons.map((reason, index) => (
                        <div key={index} className="text-sm flex items-start gap-2">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                          {reason}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Ideal Parameters</h4>
                    <div className="bg-muted rounded-lg p-3 text-sm space-y-1">
                      {Object.entries(selectedPattern.keyMetrics.idealParameters).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                          <span className="font-mono">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Implementation Guidance */}
        <TabsContent value="guidance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Implementation Guidance</CardTitle>
              <CardDescription>
                Design principles and dimensional requirements for Pattern {selectedPattern.pattern.number}: {selectedPattern.pattern.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <h4 className="font-medium mb-3">Design Principles</h4>
                  <div className="space-y-2">
                    {getImplementationGuidance(selectedPattern.pattern.number).designPrinciples.map((principle, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                        <span className="text-sm">{principle}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Dimensional Requirements</h4>
                  <div className="space-y-2">
                    {getImplementationGuidance(selectedPattern.pattern.number).dimensionalRequirements.map((req, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <Ruler className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{req}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Spatial Relationships</h4>
                  <div className="space-y-2">
                    {getImplementationGuidance(selectedPattern.pattern.number).spatialRelationships.map((rel, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                        <span className="text-sm">{rel}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Material Considerations</h4>
                  <div className="space-y-2">
                    {getImplementationGuidance(selectedPattern.pattern.number).materialConsiderations.map((material, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                        <span className="text-sm">{material}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Helper function for implementation guidance
function getImplementationGuidance(patternNumber: number) {
  const guidance = {
    designPrinciples: [] as string[],
    dimensionalRequirements: [] as string[],
    spatialRelationships: [] as string[],
    materialConsiderations: [] as string[]
  };

  switch (patternNumber) {
    case 21: // Four-Story Limit
      guidance.designPrinciples = ['Maintain human scale', 'Enable natural ventilation and lighting', 'Create visual connection between floors'];
      guidance.dimensionalRequirements = ['Maximum 4 stories (12-14m height)', 'Floor-to-ceiling: 3-3.5m', 'Ground floor: 3.5-4m minimum'];
      guidance.spatialRelationships = ['Buildings should relate to pedestrian movement', 'Upper floors step back from street', 'Maintain street wall continuity'];
      guidance.materialConsiderations = ['Use materials that age well', 'Emphasize horizontal expression', 'Vary materials by floor for human scale'];
      break;
    case 61: // Small Public Squares
      guidance.designPrinciples = ['Create outdoor rooms', 'Enable spontaneous gathering', 'Provide sense of enclosure'];
      guidance.dimensionalRequirements = ['Size: 20-50m across', 'Height/width ratio: 1:2 to 1:4', 'Multiple entrances/exits'];
      guidance.spatialRelationships = ['Connect to pedestrian routes', 'Frame with building facades', 'Link to surrounding streets'];
      guidance.materialConsiderations = ['Use durable paving materials', 'Include seating elements', 'Provide weather protection'];
      break;
    case 88: // Street Café
      guidance.designPrinciples = ['Activate street edge', 'Create transition zones', 'Support social interaction'];
      guidance.dimensionalRequirements = ['Setback: 2-4m from street', 'Canopy height: 2.5-3.5m', 'Clear zone width: 1.5m minimum'];
      guidance.spatialRelationships = ['Visual connection to indoor space', 'Buffer from traffic', 'Connect to sidewalk flow'];
      guidance.materialConsiderations = ['Weather-resistant furniture', 'Flexible boundary elements', 'Comfortable seating'];
      break;
    case 106: // Positive Outdoor Space
      guidance.designPrinciples = ['Define outdoor rooms', 'Create sense of enclosure', 'Ensure positive definition'];
      guidance.dimensionalRequirements = ['Height/width ratio maintains enclosure', 'Clear boundaries', 'Appropriate scale for use'];
      guidance.spatialRelationships = ['Connect to building entries', 'Layer public to private spaces', 'Frame with architectural elements'];
      guidance.materialConsiderations = ['Use enclosing elements (walls, hedges)', 'Define floor plane', 'Create overhead definition'];
      break;
    default:
      guidance.designPrinciples = ['Apply Alexander\'s principles', 'Focus on human scale', 'Create positive spaces'];
      guidance.dimensionalRequirements = ['Follow pattern-specific dimensions', 'Maintain appropriate proportions'];
      guidance.spatialRelationships = ['Connect to context', 'Support intended use'];
      guidance.materialConsiderations = ['Use appropriate materials', 'Consider durability and maintenance'];
  }

  return guidance;
}