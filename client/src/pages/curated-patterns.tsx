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

  // Get location details
  const { data: location } = useQuery({
    queryKey: [`/api/saved-locations/${locationId}`],
    queryFn: async () => {
      const response = await fetch(`/api/saved-locations/${locationId}`);
      if (!response.ok) throw new Error('Failed to fetch location');
      return response.json() as SavedLocation;
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
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
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
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-lg font-semibold">Curated Patterns</h1>
          <div className="w-8" />
        </div>

        {/* Location Info */}
        {location && (
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
              <MapPin className="w-4 h-4" />
              <span className="font-medium">{location.name}</span>
            </div>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              Patterns curated based on your location's characteristics
            </p>
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
                  Found {patterns.length} relevant patterns for this location
                </h2>
              </div>

              {patterns.map((pattern) => (
                <Card key={pattern.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
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
                        </div>
                        <CardTitle className="text-base leading-tight">
                          {pattern.name}
                        </CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      {pattern.description}
                    </p>
                    
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg mb-3">
                      <p className="text-xs text-blue-700 dark:text-blue-300 font-medium mb-1">
                        Why this pattern fits here:
                      </p>
                      <p className="text-xs text-blue-600 dark:text-blue-400">
                        {pattern.contextReason}
                      </p>
                    </div>

                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="text-xs">
                        {pattern.category}
                      </Badge>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(getPatternLink(pattern.number), '_blank')}
                        className="text-xs"
                      >
                        Read More
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