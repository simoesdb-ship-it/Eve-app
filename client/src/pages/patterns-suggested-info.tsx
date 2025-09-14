import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Target, MapPin, Brain, Users, Clock, Lightbulb, Zap } from "lucide-react";
import { format } from "date-fns";

export default function PatternsSuggestedInfo() {
  const [, setLocation] = useLocation();

  // Get session ID from localStorage
  const sessionId = localStorage.getItem('sessionId') || 'anonymous';

  // Fetch pattern suggestions
  const { data: suggestions = [], isLoading, error } = useQuery({
    queryKey: ['pattern-suggestions', sessionId],
    queryFn: async () => {
      const response = await fetch(`/api/pattern-suggestions?sessionId=${sessionId}`);
      if (!response.ok) throw new Error('Failed to fetch pattern suggestions');
      return response.json();
    }
  });

  return (
    <div className="flex flex-col min-h-screen bg-neutral-50">
      {/* Status Bar */}
      <div className="safe-area-top bg-primary text-white px-4 py-1 text-sm">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-secondary rounded-full animate-pulse"></div>
          <span>Patterns Suggested Explained</span>
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
              <h1 className="text-lg font-semibold text-neutral-800">Patterns Suggested</h1>
              <p className="text-xs text-neutral-400">How pattern suggestions work</p>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 px-4 py-4 pb-24 space-y-4">
        {/* Overview Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="w-5 h-5 text-primary" />
              <span>Your Pattern Suggestions</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-4 text-neutral-600">Loading your pattern suggestions...</div>
            ) : error ? (
              <div className="text-center py-4 text-red-600">Failed to load pattern suggestions</div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{suggestions.length}</div>
                  <div className="text-sm text-neutral-600">Total Suggestions</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {new Set(suggestions.map((s: any) => s.location.id)).size}
                  </div>
                  <div className="text-sm text-neutral-600">Locations Analyzed</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Analysis Methods */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Brain className="w-5 h-5 text-primary" />
              <span>Analysis Methods Used</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {suggestions.length > 0 && (
              <div className="space-y-2">
                {Object.entries(
                  suggestions.reduce((acc: any, s: any) => {
                    acc[s.mlAlgorithm] = (acc[s.mlAlgorithm] || 0) + 1;
                    return acc;
                  }, {})
                ).map(([algorithm, count]) => (
                  <div key={algorithm} className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <Zap className="w-4 h-4 text-blue-500" />
                      <span className="text-sm text-neutral-600 capitalize">
                        {algorithm.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <Badge variant="secondary">{count as number}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Suggestions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Lightbulb className="w-5 h-5 text-primary" />
              <span>Recent Suggestions</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="animate-pulse">
                    <div className="h-4 bg-neutral-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-neutral-200 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : suggestions.length === 0 ? (
              <div className="text-center py-8 text-neutral-500">
                <Target className="w-12 h-12 mx-auto mb-4 text-neutral-300" />
                <p>No pattern suggestions yet</p>
                <p className="text-sm mt-2">Visit locations to generate AI pattern analysis</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {suggestions.slice(0, 20).map((suggestion: any) => (
                  <div key={suggestion.id} className="border rounded-lg p-3 bg-neutral-50">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">
                          Pattern #{suggestion.pattern.number}: {suggestion.pattern.name}
                        </h4>
                        <p className="text-xs text-neutral-600 mt-1">
                          {suggestion.location.name}
                        </p>
                      </div>
                      <div className="flex flex-col items-end space-y-1">
                        <Badge variant={suggestion.confidence > 0.7 ? "default" : "secondary"}>
                          {Math.round(suggestion.confidence * 100)}% match
                        </Badge>
                        <div className="flex items-center text-xs text-neutral-500">
                          <Clock className="w-3 h-3 mr-1" />
                          {format(new Date(suggestion.createdAt), 'MMM d, HH:mm')}
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-xs text-neutral-600 line-clamp-2">
                      {suggestion.pattern.description}
                    </p>
                    
                    <div className="mt-2 flex justify-between items-center">
                      <Badge variant="outline" className="text-xs">
                        {suggestion.pattern.category}
                      </Badge>
                      <button 
                        onClick={() => setLocation(`/patterns/${suggestion.pattern.id}`)}
                        className="text-xs text-primary hover:underline"
                      >
                        View Pattern →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}