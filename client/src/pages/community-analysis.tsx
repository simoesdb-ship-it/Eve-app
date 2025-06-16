import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Users, MapPin, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react";
import BottomNavigation from "@/components/bottom-navigation";
import MobileContainer from "@/components/mobile-container";

interface CommunityCluster {
  id: string;
  centerLat: number;
  centerLng: number;
  population: number;
  area: number;
  density: number;
  activityPatterns: {
    peakHours: number[];
    weeklyDistribution: number[];
    movementIntensity: number;
  };
  confidence: number;
  patternAnalysis: {
    patternNumber: number;
    patternName: string;
    adherence: number;
    recommendations: string[];
    deviations: string[];
  };
}

interface PatternInterpretation {
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

export default function CommunityAnalysis() {
  const { data: interpretations, isLoading, error } = useQuery<PatternInterpretation[]>({
    queryKey: ["/api/community-analysis"],
    refetchInterval: 30000, // Refresh every 30 seconds for real-time updates
  });

  if (isLoading) {
    return (
      <MobileContainer>
        <div className="container mx-auto p-6 space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-4">Community Pattern Analysis</h1>
            <p className="text-muted-foreground">Analyzing spatial data and pattern matches...</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-200 rounded"></div>
                    <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="h-20"></div>
        </div>
        <BottomNavigation activeTab="community" />
      </MobileContainer>
    );
  }

  if (error) {
    return (
      <MobileContainer>
        <div className="container mx-auto p-6">
          <Alert className="max-w-2xl mx-auto">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Analysis Error</AlertTitle>
            <AlertDescription>
              Unable to load community pattern analysis. Please try again later.
            </AlertDescription>
          </Alert>
          <div className="h-20"></div>
        </div>
        <BottomNavigation activeTab="community" />
      </MobileContainer>
    );
  }

  if (!interpretations || interpretations.length === 0) {
    return (
      <MobileContainer>
        <div className="container mx-auto p-6">
          <div className="text-center max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold mb-4">Community Pattern Analysis</h1>
            <Alert>
              <MapPin className="h-4 w-4" />
              <AlertTitle>No Data Available</AlertTitle>
              <AlertDescription>
                No spatial tracking data found for analysis. Start using the app to record movement patterns and location data.
              </AlertDescription>
            </Alert>
          </div>
          <div className="h-20"></div>
        </div>
        <BottomNavigation activeTab="community" />
      </MobileContainer>
    );
  }

  const primaryPattern = interpretations[0]; // Pattern #12 should be first

  return (
    <MobileContainer>
      <div className="container mx-auto p-6 space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Community Pattern Analysis</h1>
          <p className="text-muted-foreground">
            Real-time analysis of Alexander's patterns against actual community movement data
          </p>
        </div>

      {/* Primary Pattern Overview - Community of 7000 */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Pattern #{primaryPattern.pattern.number}: {primaryPattern.pattern.name}
              </CardTitle>
              <CardDescription>{primaryPattern.pattern.description}</CardDescription>
            </div>
            <Badge variant={primaryPattern.overallAssessment.averageAdherence > 0.7 ? "default" : "secondary"}>
              {Math.round(primaryPattern.overallAssessment.averageAdherence * 100)}% Adherence
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {primaryPattern.overallAssessment.totalCommunities}
              </div>
              <div className="text-sm text-muted-foreground">Communities Detected</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {primaryPattern.overallAssessment.conformingCommunities}
              </div>
              <div className="text-sm text-muted-foreground">Well-Formed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {Math.round(primaryPattern.overallAssessment.averageAdherence * 100)}%
              </div>
              <div className="text-sm text-muted-foreground">Avg Adherence</div>
            </div>
          </div>

          <Progress 
            value={primaryPattern.overallAssessment.averageAdherence * 100} 
            className="mb-4"
          />

          {primaryPattern.overallAssessment.systemRecommendations.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold">System Recommendations:</h4>
              <ul className="space-y-1">
                {primaryPattern.overallAssessment.systemRecommendations.map((rec, idx) => (
                  <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                    <TrendingUp className="h-3 w-3 mt-1 flex-shrink-0" />
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* All Pattern Interpretations */}
      <Tabs defaultValue="communities" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="communities">Detected Communities</TabsTrigger>
          <TabsTrigger value="patterns">All Pattern Matches</TabsTrigger>
        </TabsList>

        <TabsContent value="communities" className="space-y-4">
          {primaryPattern.detectedCommunities.length === 0 ? (
            <Alert>
              <MapPin className="h-4 w-4" />
              <AlertTitle>No Communities Detected</AlertTitle>
              <AlertDescription>
                Insufficient spatial data to identify community clusters. Continue using the app to build tracking data.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {primaryPattern.detectedCommunities.map((community) => (
                <Card key={community.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between text-base">
                      <span>Community {community.id.split('_')[1]}</span>
                      <Badge variant={community.patternAnalysis.adherence > 0.7 ? "default" : "outline"}>
                        {Math.round(community.patternAnalysis.adherence * 100)}%
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      {community.centerLat.toFixed(4)}, {community.centerLng.toFixed(4)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Population:</span>
                        <div className="font-medium">{community.population}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Density:</span>
                        <div className="font-medium">{community.density.toFixed(1)}/km²</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Area:</span>
                        <div className="font-medium">{community.area.toFixed(1)} km²</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Confidence:</span>
                        <div className="font-medium">{Math.round(community.confidence * 100)}%</div>
                      </div>
                    </div>

                    <Progress value={community.patternAnalysis.adherence * 100} className="h-2" />

                    {community.patternAnalysis.recommendations.length > 0 && (
                      <div className="space-y-1">
                        <h5 className="text-xs font-semibold text-muted-foreground">Recommendations:</h5>
                        <ul className="space-y-1">
                          {community.patternAnalysis.recommendations.slice(0, 2).map((rec, idx) => (
                            <li key={idx} className="text-xs text-muted-foreground flex items-start gap-1">
                              <CheckCircle className="h-2 w-2 mt-1 flex-shrink-0" />
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {community.patternAnalysis.deviations.length > 0 && (
                      <div className="space-y-1">
                        <h5 className="text-xs font-semibold text-muted-foreground">Issues:</h5>
                        <ul className="space-y-1">
                          {community.patternAnalysis.deviations.slice(0, 2).map((dev, idx) => (
                            <li key={idx} className="text-xs text-muted-foreground flex items-start gap-1">
                              <AlertTriangle className="h-2 w-2 mt-1 flex-shrink-0" />
                              {dev}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="patterns" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {interpretations.map((interpretation) => (
              <Card key={interpretation.pattern.number} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Pattern #{interpretation.pattern.number}: {interpretation.pattern.name}</span>
                    <Badge variant={interpretation.overallAssessment.averageAdherence > 0.6 ? "default" : "secondary"}>
                      {Math.round(interpretation.overallAssessment.averageAdherence * 100)}%
                    </Badge>
                  </CardTitle>
                  <CardDescription>{interpretation.pattern.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="text-center">
                      <div className="font-bold">{interpretation.overallAssessment.totalCommunities}</div>
                      <div className="text-muted-foreground text-xs">Communities</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-green-600">{interpretation.overallAssessment.conformingCommunities}</div>
                      <div className="text-muted-foreground text-xs">Conforming</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold">{Math.round(interpretation.overallAssessment.averageAdherence * 100)}%</div>
                      <div className="text-muted-foreground text-xs">Adherence</div>
                    </div>
                  </div>

                  <Progress value={interpretation.overallAssessment.averageAdherence * 100} />

                  <div className="text-xs space-y-1">
                    <div><strong>Ideal Population:</strong> {interpretation.pattern.idealParameters.populationRange[0]}-{interpretation.pattern.idealParameters.populationRange[1]}</div>
                    <div><strong>Ideal Density:</strong> {interpretation.pattern.idealParameters.densityRange[0]}-{interpretation.pattern.idealParameters.densityRange[1]}/km²</div>
                    <div><strong>Ideal Area:</strong> {interpretation.pattern.idealParameters.areaRange[0]}-{interpretation.pattern.idealParameters.areaRange[1]} km²</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Add space for bottom navigation */}
      <div className="h-20"></div>
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation activeTab="community" />
    </MobileContainer>
  );
}