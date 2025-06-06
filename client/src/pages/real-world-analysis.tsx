import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { MapPin, AlertTriangle, TrendingDown, Users, Building2, CheckCircle } from "lucide-react";

interface LocationAnalysis {
  location: {
    name: string;
    coordinates: [number, number];
    population: number;
    area: number;
    density: number;
  };
  patternConformances: {
    pattern: {
      number: number;
      name: string;
      description: string;
    };
    adherence: number;
    deviations: string[];
    recommendations: string[];
  }[];
  overallAssessment: {
    totalPatternsAnalyzed: number;
    averageAdherence: number;
    criticalDeviations: string[];
    keyRecommendations: string[];
  };
  summary: {
    majorDeviations: number;
    averageAdherence: number;
    patternsAnalyzed: number;
  };
}

interface RealWorldExamples {
  totalLocations: number;
  analyses: LocationAnalysis[];
}

export default function RealWorldAnalysis() {
  const { data: examples, isLoading, error } = useQuery<RealWorldExamples>({
    queryKey: ["/api/real-world-examples"],
    refetchInterval: 60000,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Real-World Pattern Analysis</h1>
          <p className="text-muted-foreground">Analyzing real communities against Alexander's 253 patterns...</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
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
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert className="max-w-2xl mx-auto">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Analysis Error</AlertTitle>
          <AlertDescription>
            Unable to load real-world pattern analysis. Please try again later.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!examples || examples.analyses.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-4">Real-World Pattern Analysis</h1>
          <Alert>
            <MapPin className="h-4 w-4" />
            <AlertTitle>No Analysis Available</AlertTitle>
            <AlertDescription>
              No real-world location analysis data found.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  const averageAdherence = examples.analyses.reduce((sum, analysis) => 
    sum + analysis.summary.averageAdherence, 0) / examples.analyses.length;

  const totalDeviations = examples.analyses.reduce((sum, analysis) => 
    sum + analysis.summary.majorDeviations, 0);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Real-World Pattern Analysis</h1>
        <p className="text-muted-foreground">
          How actual communities deviate from Christopher Alexander's "A Pattern Language"
        </p>
      </div>

      {/* Overall Assessment */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Overall Assessment: {examples.totalLocations} Communities Analyzed
          </CardTitle>
          <CardDescription>
            Analysis against Alexander's 253 patterns reveals significant deviations from human-scale design principles
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {Math.round(averageAdherence)}%
              </div>
              <div className="text-sm text-muted-foreground">Average Pattern Adherence</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {totalDeviations}
              </div>
              <div className="text-sm text-muted-foreground">Major Deviations Detected</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {examples.analyses[0]?.summary.patternsAnalyzed || 0}
              </div>
              <div className="text-sm text-muted-foreground">Patterns Per Location</div>
            </div>
          </div>

          <Progress value={averageAdherence} className="mb-4" />

          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertTitle className="text-red-800">Critical Finding</AlertTitle>
            <AlertDescription className="text-red-700">
              All analyzed communities significantly exceed Alexander's Pattern #12 (Community of 7000) limit, 
              suggesting loss of democratic participation and human-scale community structure.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Individual Location Analyses */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">Community Overview</TabsTrigger>
          <TabsTrigger value="detailed">Detailed Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {examples.analyses.map((analysis, index) => (
              <Card key={index} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{analysis.location.name}</span>
                    <Badge variant={analysis.summary.averageAdherence > 60 ? "default" : "destructive"}>
                      {analysis.summary.averageAdherence}% Adherence
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    {analysis.location.population.toLocaleString()} people • {analysis.location.area.toFixed(1)} km² • 
                    {Math.round(analysis.location.density)} people/km²
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Progress value={analysis.summary.averageAdherence} className="h-2" />
                  
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Patterns Analyzed:</span>
                      <div className="font-medium">{analysis.summary.patternsAnalyzed}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Major Deviations:</span>
                      <div className="font-medium text-red-600">{analysis.summary.majorDeviations}</div>
                    </div>
                  </div>

                  {/* Pattern #12 Analysis */}
                  {analysis.patternConformances.find(p => p.pattern.number === 12) && (
                    <Alert className="border-orange-200 bg-orange-50">
                      <Users className="h-4 w-4 text-orange-600" />
                      <AlertTitle className="text-orange-800 text-sm">Pattern #12 Violation</AlertTitle>
                      <AlertDescription className="text-orange-700 text-xs">
                        Population of {analysis.location.population.toLocaleString()} exceeds Alexander's 7,000-person 
                        democratic participation limit by {Math.round((analysis.location.population / 7000 - 1) * 100)}%
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Top Recommendations */}
                  {analysis.overallAssessment.keyRecommendations.length > 0 && (
                    <div className="space-y-1">
                      <h5 className="text-xs font-semibold text-muted-foreground">Key Recommendations:</h5>
                      <ul className="space-y-1">
                        {analysis.overallAssessment.keyRecommendations.slice(0, 2).map((rec, idx) => (
                          <li key={idx} className="text-xs text-muted-foreground flex items-start gap-1">
                            <CheckCircle className="h-2 w-2 mt-1 flex-shrink-0" />
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="detailed" className="space-y-6">
          {examples.analyses.map((analysis, index) => (
            <Card key={index} className="border-l-4 border-l-primary">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{analysis.location.name} - Detailed Pattern Analysis</span>
                  <Badge variant="outline">
                    {analysis.overallAssessment.totalPatternsAnalyzed} patterns analyzed
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Population: {analysis.location.population.toLocaleString()} • 
                  Area: {analysis.location.area.toFixed(1)} km² • 
                  Density: {Math.round(analysis.location.density)} people/km²
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Critical Deviations */}
                {analysis.overallAssessment.criticalDeviations.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-red-800">Critical Deviations from Alexander's Patterns:</h4>
                    <ul className="space-y-1">
                      {analysis.overallAssessment.criticalDeviations.map((deviation, idx) => (
                        <li key={idx} className="text-sm text-red-700 flex items-start gap-2">
                          <TrendingDown className="h-3 w-3 mt-1 flex-shrink-0" />
                          {deviation}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Pattern Breakdown */}
                <div className="space-y-2">
                  <h4 className="font-semibold">Pattern Adherence Breakdown:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                    {analysis.patternConformances
                      .sort((a, b) => a.adherence - b.adherence)
                      .slice(0, 10)
                      .map((pattern, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs">
                        <div className="flex-1">
                          <div className="font-medium">#{pattern.pattern.number}: {pattern.pattern.name}</div>
                          <div className="text-muted-foreground text-xs truncate">
                            {pattern.pattern.description.substring(0, 60)}...
                          </div>
                        </div>
                        <Badge variant={pattern.adherence > 0.6 ? "default" : pattern.adherence > 0.3 ? "secondary" : "destructive"} className="ml-2">
                          {Math.round(pattern.adherence * 100)}%
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                {/* System Recommendations */}
                {analysis.overallAssessment.keyRecommendations.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-green-800">Recommendations for Improvement:</h4>
                    <ul className="space-y-1">
                      {analysis.overallAssessment.keyRecommendations.map((rec, idx) => (
                        <li key={idx} className="text-sm text-green-700 flex items-start gap-2">
                          <CheckCircle className="h-3 w-3 mt-1 flex-shrink-0" />
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}