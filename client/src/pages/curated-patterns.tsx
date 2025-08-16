import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation, useParams } from "wouter";
import { ArrowLeft, MapPin, Lightbulb, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import MobileContainer from "@/components/mobile-container";
import BottomNavigation from "@/components/bottom-navigation";
import { getUserDisplayName } from "@/lib/username-generator";
import { getConsistentUserId } from "@/lib/device-fingerprint";

interface CuratedPattern {
  id: number;
  number: number;
  name: string;
  description: string;
  relevanceScore: number;
  contextReason: string;
  category: string;
  problemsAddressed?: string[];
  implementationPriority?: string;
  implementationRoadmap?: any;
}

interface SavedLocation {
  id: number;
  name: string;
  latitude: string;
  longitude: string;
}

export default function CuratedPatternsPage() {
  const [, navigate] = useLocation();
  const params = useParams<{ locationId: string }>();
  const [username, setUsername] = useState<string>('');
  const locationId = parseInt(params.locationId || '0');

  // Load username
  useEffect(() => {
    async function loadUsername() {
      try {
        const userId = await getConsistentUserId();
        const displayName = getUserDisplayName(userId);
        setUsername(displayName);
      } catch (error) {
        console.error('Failed to generate username:', error);
        setUsername('Anonymous');
      }
    }
    loadUsername();
  }, []);

  // Get location details - try saved locations first, then locations table
  const { data: location } = useQuery({
    queryKey: [`/api/saved-locations/${locationId}`],
    queryFn: async () => {
      let response = await fetch(`/api/saved-locations/${locationId}`);
      if (!response.ok || (await response.clone().json()).length === 0) {
        // Fallback to locations table if not in saved locations
        response = await fetch(`/api/locations/${locationId}`);
        if (!response.ok) throw new Error('Failed to fetch location');
      }
      const result = await response.json();
      return Array.isArray(result) ? result[0] : result;
    },
    enabled: !!locationId
  });

  // Get curated patterns for this location
  const { data: patterns = [], isLoading } = useQuery({
    queryKey: [`/api/locations/${locationId}/curated-patterns`],
    queryFn: async () => {
      const response = await fetch(`/api/locations/${locationId}/curated-patterns`);
      if (!response.ok) throw new Error('Failed to fetch curated patterns');
      return response.json() as CuratedPattern[];
    },
    enabled: !!locationId
  });

  // Get comments for this location to show community feedback
  const { data: comments = [] } = useQuery({
    queryKey: [`/api/locations/${locationId}/comments`],
    queryFn: async () => {
      const response = await fetch(`/api/locations/${locationId}/comments`);
      if (!response.ok) throw new Error('Failed to fetch comments');
      return response.json();
    },
    enabled: !!locationId
  });

  const getPatternLink = (patternNumber: number) => {
    return `https://www.patternlanguage.com/archive/patterns/pattern${patternNumber}.html`;
  };

  const getRelevanceColor = (score: number) => {
    if (score >= 0.8) return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    if (score >= 0.6) return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    if (score >= 0.4) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
  };

  const getRelevanceLabel = (score: number) => {
    if (score >= 0.8) return "Highly Relevant";
    if (score >= 0.6) return "Very Relevant";
    if (score >= 0.4) return "Relevant";
    return "Contextual";
  };

  if (isLoading) {
    return (
      <MobileContainer>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <Button variant="ghost" size="sm" onClick={() => navigate('/insights')}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-lg font-semibold">Loading Patterns...</h1>
            <div className="w-8" />
          </div>
          
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        </div>
        <BottomNavigation currentPage="patterns" username={username} />
      </MobileContainer>
    );
  }

  return (
    <MobileContainer>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <Button variant="ghost" size="sm" onClick={() => navigate('/insights')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-lg font-semibold">Curated Patterns</h1>
          <div className="w-8" />
        </div>

        {/* Location Summary Header */}
        {location && (
          <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300 mb-2">
              <MapPin className="w-4 h-4" />
              <span className="font-bold">{location.name}</span>
            </div>
            <div className="text-xs text-gray-700 dark:text-gray-300 space-y-1">
              <div>
                <span className="font-medium">Coordinates:</span> {location.latitude}, {location.longitude}
              </div>
              <div>
                <span className="font-medium">Analysis Type:</span>{' '}
                {comments.length > 0 
                  ? `🤖 AI Intelligence (${comments.length} problem${comments.length > 1 ? 's' : ''} analyzed)` 
                  : "📍 Contextual Patterns"}
              </div>
            </div>
          </div>
        )}

        {/* Patterns List */}
        <div className="flex-1 overflow-y-auto">
          {patterns.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <Lightbulb className="w-12 h-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No Curated Patterns
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                We couldn't find specific patterns for this location. Try the full pattern catalog instead.
              </p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => navigate('/patterns')}
              >
                Browse All Patterns
              </Button>
            </div>
          ) : (
            <div className="p-4 space-y-4">
              <div className="mb-4">
                <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Found {patterns.length} relevant pattern{patterns.length > 1 ? 's' : ''} for this location
                </h2>
                {comments.length > 0 && (
                  <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                    <p className="text-xs text-green-700 dark:text-green-300 font-medium mb-1">
                      ✨ AI Intelligence Active
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-400">
                      These patterns were selected by analyzing community-reported problems and matching them to Christopher Alexander's architectural solutions. Each suggestion includes detailed reasoning and implementation guidance.
                    </p>
                  </div>
                )}
              </div>

              {patterns.map((pattern) => (
                <Card key={pattern.id} className="hover:shadow-md transition-shadow border-l-4 border-l-blue-500">
                  <CardHeader className="pb-3">
                    <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg mb-3">
                      <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-2">
                        📊 Analysis Results
                      </h3>
                      <div className="space-y-2 text-xs">
                        <div>
                          <span className="font-medium text-gray-700 dark:text-gray-300">Location:</span>{' '}
                          <span className="text-gray-600 dark:text-gray-400">
                            {location?.latitude}, {location?.longitude} ({location?.name})
                          </span>
                        </div>
                        
                        {comments.length > 0 && (
                          <div>
                            <span className="font-medium text-gray-700 dark:text-gray-300">User Problem:</span>{' '}
                            <span className="text-gray-600 dark:text-gray-400 italic">
                              "{comments[0]?.content.substring(0, 100)}{comments[0]?.content.length > 100 ? '...' : ''}"
                            </span>
                          </div>
                        )}
                        
                        <div>
                          <span className="font-medium text-gray-700 dark:text-gray-300">AI Pattern Suggestion:</span>{' '}
                          <span className="text-blue-600 dark:text-blue-400 font-medium">
                            Pattern {pattern.number} "{pattern.name}"
                          </span>
                        </div>
                        
                        <div>
                          <span className="font-medium text-gray-700 dark:text-gray-300">Relevance Score:</span>{' '}
                          <span className="text-purple-600 dark:text-purple-400 font-medium">
                            {pattern.relevanceScore.toFixed(2)} ({(pattern.relevanceScore * 100).toFixed(0)}%)
                          </span>
                        </div>
                        
                        <div>
                          <span className="font-medium text-gray-700 dark:text-gray-300">Complete AI Analysis:</span>
                          <div className="mt-1 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                            {pattern.contextReason}
                          </div>
                        </div>

                        {/* Implementation Roadmap */}
                        {pattern.implementationRoadmap && (
                          <div className="mt-3 p-2 bg-green-50 dark:bg-green-900/20 rounded border-l-2 border-green-400">
                            <div className="flex items-center gap-1 mb-2">
                              <Star className="w-3 h-3 text-green-600 dark:text-green-400" />
                              <span className="font-medium text-green-700 dark:text-green-300 text-xs">Implementation Roadmap</span>
                            </div>
                            <div className="text-xs text-green-600 dark:text-green-400 space-y-1">
                              <div><strong>Timeline:</strong> {pattern.implementationRoadmap.timelineEstimate}</div>
                              <div><strong>Feasibility:</strong> {Math.round(pattern.implementationRoadmap.feasibilityScore * 100)}%</div>
                              
                              {pattern.implementationRoadmap.actionSequence && pattern.implementationRoadmap.actionSequence.length > 0 && (
                                <div className="mt-2">
                                  <div className="font-medium mb-1">Key Actions:</div>
                                  <ul className="list-disc list-inside space-y-0.5">
                                    {pattern.implementationRoadmap.actionSequence.slice(0, 2).map((action: any, idx: number) => (
                                      <li key={idx} className="text-xs">
                                        <strong>{action.timeframe}:</strong> {action.description.substring(0, 80)}...
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {pattern.problemsAddressed && pattern.problemsAddressed.length > 0 && (
                          <div>
                            <span className="font-medium text-gray-700 dark:text-gray-300">Problems Addressed:</span>{' '}
                            <span className="text-orange-600 dark:text-orange-400">
                              {pattern.problemsAddressed.join(', ')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-xs">
                        #{pattern.number}
                      </Badge>
                      <Badge 
                        className={`text-xs ${getRelevanceColor(pattern.relevanceScore)}`}
                      >
                        <Star className="w-3 h-3 mr-1" />
                        {getRelevanceLabel(pattern.relevanceScore)}
                      </Badge>
                      {pattern.implementationPriority && (
                        <Badge variant="secondary" className="text-xs">
                          {pattern.implementationPriority.replace('_', ' ')}
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-base leading-tight">
                      {pattern.name}
                    </CardTitle>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      {pattern.description}
                    </p>
                    


                    {/* Bottom Actions */}
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="text-xs">
                        {pattern.category}
                      </Badge>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/patterns/${pattern.id}`)}
                        className="text-xs"
                      >
                        View in Pattern Library
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}

              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                  Want to see all patterns? 
                  <Button 
                    variant="link" 
                    className="text-xs p-0 ml-1 h-auto"
                    onClick={() => navigate('/patterns')}
                  >
                    Browse full catalog
                  </Button>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      <BottomNavigation currentPage="patterns" username={username} />
    </MobileContainer>
  );
}