import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Target, MapPin, Brain, Users, TrendingUp, Network, Award, BarChart3 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { getConsistentUserId } from "@/lib/device-fingerprint";
import { useToast } from "@/hooks/use-toast";

export default function PatternsSuggestedInfo() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Get user patterns breakdown
  const { data: breakdown, isLoading, error } = useQuery({
    queryKey: ["/api/patterns/user-breakdown"],
    queryFn: async () => {
      const persistentUserId = await getConsistentUserId();
      console.log('Fetching pattern breakdown for user:', persistentUserId);
      const response = await apiRequest("GET", `/api/patterns/user-breakdown?userId=${persistentUserId}`);
      const result = await response.json();
      console.log('Pattern breakdown result:', result);
      return result;
    },
    retry: 1,
    onError: (error) => {
      console.error('Error fetching pattern breakdown:', error);
      toast({
        title: "Error Loading Patterns",
        description: "Failed to load your pattern breakdown. Please try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="flex flex-col min-h-screen bg-neutral-50">
      {/* Status Bar */}
      <div className="safe-area-top bg-primary text-white px-4 py-1 text-sm">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-secondary rounded-full animate-pulse"></div>
          <span>Patterns Found Explained</span>
        </div>
      </div>

      {/* Header */}
      <header className="bg-transparent px-4 py-3">
        <div className="flex items-center space-x-3">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setLocation("/insights")}
            className="p-2"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Target className="text-white w-4 h-4" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-neutral-800">Patterns Found</h1>
              <p className="text-xs text-neutral-400">How pattern discovery works</p>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 px-4 py-4 pb-24 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : breakdown && breakdown.summary ? (
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="categories">Categories</TabsTrigger>
              <TabsTrigger value="relationships">Relationships</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              {/* Summary Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="w-5 h-5 text-primary" />
                    <span>Your Pattern Discovery</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">{breakdown?.summary?.totalPatterns || 0}</div>
                      <div className="text-sm text-muted-foreground">Total Patterns Found</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">{breakdown?.summary?.categoriesFound || 0}</div>
                      <div className="text-sm text-muted-foreground">Categories Discovered</div>
                    </div>
                  </div>

                  {breakdown?.summary?.mostConfidentPattern && (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Award className="w-4 h-4 text-amber-500" />
                        <span className="text-sm font-medium">Most Confident Pattern</span>
                      </div>
                      <div className="pl-6">
                        <div className="font-medium">{breakdown.summary.mostConfidentPattern.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {Math.round(breakdown.summary.mostConfidentPattern.confidence * 100)}% confidence
                        </div>
                      </div>
                    </div>
                  )}

                  {breakdown?.summary?.mostVotedPattern && (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <TrendingUp className="w-4 h-4 text-green-500" />
                        <span className="text-sm font-medium">Most Community Engagement</span>
                      </div>
                      <div className="pl-6">
                        <div className="font-medium">{breakdown.summary.mostVotedPattern.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {breakdown.summary.mostVotedPattern.votes} total votes
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* How it Works */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Brain className="w-5 h-5 text-primary" />
                    <span>AI Pattern Analysis</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-neutral-600">
                    When you visit a location, our AI analyzes the area against Christopher Alexander's 253 architectural patterns from "A Pattern Language."
                  </p>
                  <p className="text-sm text-neutral-600">
                    The system considers factors like population density, spatial layout, accessibility, and community structures to suggest patterns that best match the location.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="categories" className="space-y-4">
              {breakdown?.categories?.map((category, index) => (
                <Card key={category.category}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{category.category}</CardTitle>
                      <Badge variant="secondary">{category.patternCount} patterns</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span>Average Confidence</span>
                      <span className="font-medium">{Math.round(category.avgConfidence * 100)}%</span>
                    </div>
                    <Progress value={category.avgConfidence * 100} className="h-2" />
                    
                    <div className="flex items-center justify-between text-sm">
                      <span>Community Votes</span>
                      <span className="font-medium">{category.totalVotes}</span>
                    </div>

                    {/* Top patterns in this category */}
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-muted-foreground">Top Patterns:</div>
                      {category.patterns.slice(0, 3).map((pattern, idx) => (
                        <div key={pattern.id} className="flex items-center justify-between text-sm">
                          <span className="truncate flex-1">{pattern.name}</span>
                          <span className="text-muted-foreground ml-2">
                            {Math.round(pattern.confidence * 100)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {(!breakdown?.categories || breakdown.categories.length === 0) && (
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-sm text-muted-foreground">
                      Visit locations to start discovering architectural patterns and their categories.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="relationships" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Network className="w-5 h-5 text-primary" />
                    <span>Pattern Relationships</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-neutral-600">
                    Discover how different pattern categories work together in your explored locations.
                  </p>
                </CardContent>
              </Card>

              {breakdown?.relationships?.map((relationship, index) => (
                <Card key={index}>
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-primary rounded-full"></div>
                        <span className="font-medium">{relationship.categories[0]}</span>
                        <span className="text-muted-foreground">connects with</span>
                        <div className="w-3 h-3 bg-secondary rounded-full"></div>
                        <span className="font-medium">{relationship.categories[1]}</span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-muted-foreground">Strength:</span>
                        <Progress value={(relationship.strength / 10) * 100} className="flex-1 h-2" />
                        <span className="text-sm font-medium">{relationship.strength}</span>
                      </div>
                      
                      <p className="text-sm text-neutral-600">{relationship.description}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {(!breakdown?.relationships || breakdown.relationships.length === 0) && (
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-sm text-muted-foreground">
                      Explore more locations to discover pattern relationships and connections.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="w-16 h-16 bg-neutral-200 rounded-full flex items-center justify-center">
              <Target className="w-8 h-8 text-neutral-400" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-medium text-neutral-600">No Patterns Found Yet</h3>
              <p className="text-sm text-neutral-500 max-w-sm">
                Visit some locations first to discover architectural patterns in your area.
              </p>
            </div>
            <Button 
              onClick={() => setLocation("/discover")}
              className="mt-4"
            >
              Discover Locations
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}