import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import MapView from "@/components/map-view";
import PatternCard from "@/components/pattern-card";
import BottomNavigation from "@/components/bottom-navigation";
import PatternDetailsModal from "@/components/pattern-details-modal";
import { generateSessionId } from "@/lib/geolocation";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Wifi, WifiOff, Shield } from "lucide-react";
import type { PatternWithVotes, Activity } from "@shared/schema";

export default function DiscoverPage() {
  const [sessionId] = useState(() => generateSessionId());
  const [selectedPattern, setSelectedPattern] = useState<PatternWithVotes | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);
  const [locationId, setLocationId] = useState<number | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { toast } = useToast();

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Get user's current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setCurrentLocation({ lat: latitude, lng: longitude });
          
          // Create location entry
          createLocationMutation.mutate({
            latitude: latitude.toString(),
            longitude: longitude.toString(),
            name: "Current Location",
            sessionId
          });
        },
        (error) => {
          console.error("Geolocation error:", error);
          // Fallback to demo location (San Francisco)
          const demoLocation = { lat: 37.7749, lng: -122.4194 };
          setCurrentLocation(demoLocation);
          createLocationMutation.mutate({
            latitude: demoLocation.lat.toString(),
            longitude: demoLocation.lng.toString(),
            name: "Demo Location",
            sessionId
          });
        }
      );
    }
  }, [sessionId]);

  // Create location mutation
  const createLocationMutation = useMutation({
    mutationFn: async (locationData: any) => {
      const response = await apiRequest('POST', '/api/locations', locationData);
      return response.json();
    },
    onSuccess: (location) => {
      setLocationId(location.id);
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
    },
    onError: (error) => {
      toast({
        title: "Location Error",
        description: "Failed to record location for pattern suggestions",
        variant: "destructive"
      });
    }
  });

  // Fetch patterns for current location
  const { data: patterns = [], isLoading: patternsLoading } = useQuery({
    queryKey: [`/api/locations/${locationId}/patterns`, { sessionId }],
    enabled: !!locationId,
    queryFn: async () => {
      const response = await fetch(`/api/locations/${locationId}/patterns?sessionId=${sessionId}`);
      if (!response.ok) throw new Error('Failed to fetch patterns');
      return response.json();
    }
  });

  // Fetch user statistics
  const { data: stats } = useQuery({
    queryKey: [`/api/stats`, { sessionId }],
    queryFn: async () => {
      const response = await fetch(`/api/stats?sessionId=${sessionId}`);
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    }
  });

  // Fetch recent activity
  const { data: activities = [] } = useQuery({
    queryKey: ['/api/activity'],
    queryFn: async () => {
      const response = await fetch('/api/activity?limit=3');
      if (!response.ok) throw new Error('Failed to fetch activity');
      return response.json();
    }
  });

  // Vote mutation
  const voteMutation = useMutation({
    mutationFn: async ({ suggestionId, voteType }: { suggestionId: number, voteType: 'up' | 'down' }) => {
      const response = await apiRequest('POST', '/api/votes', {
        suggestionId,
        sessionId,
        voteType
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/locations/${locationId}/patterns`] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/activity'] });
      toast({
        title: "Vote Recorded",
        description: "Thank you for your feedback!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Vote Failed",
        description: error.message || "Failed to record vote",
        variant: "destructive"
      });
    }
  });

  const handleVote = (suggestionId: number, voteType: 'up' | 'down') => {
    voteMutation.mutate({ suggestionId, voteType });
  };

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const activityDate = new Date(date);
    const diffInMinutes = Math.floor((now.getTime() - activityDate.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const hours = Math.floor(diffInMinutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="flex flex-col min-h-screen bg-neutral-50">
      {/* Status Bar */}
      <div className="safe-area-top bg-primary text-white px-4 py-2 flex justify-between items-center text-sm">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-secondary rounded-full animate-pulse"></div>
          <span>Anonymous Session</span>
        </div>
        <div className="flex items-center space-x-1">
          <Shield className="w-3 h-3" />
          {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          <span>87%</span>
        </div>
      </div>

      {/* App Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">E</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-neutral-800">EVE Mobile</h1>
              <p className="text-xs text-neutral-400">
                {currentLocation ? 
                  `${currentLocation.lat.toFixed(4)}, ${currentLocation.lng.toFixed(4)}` : 
                  "Getting location..."
                }
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Map Container */}
      <MapView 
        currentLocation={currentLocation}
        patterns={patterns}
        onPatternSelect={setSelectedPattern}
      />

      {/* Quick Stats */}
      {stats && (
        <div className="px-4 py-3 bg-white border-b border-gray-100">
          <div className="flex space-x-4">
            <div className="flex-1 text-center">
              <div className="text-lg font-semibold text-neutral-800">{stats.suggestedPatterns}</div>
              <div className="text-xs text-neutral-400">Suggested Patterns</div>
            </div>
            <div className="flex-1 text-center border-l border-gray-200">
              <div className="text-lg font-semibold text-neutral-800">{stats.votesContributed}</div>
              <div className="text-xs text-neutral-400">Votes Cast</div>
            </div>
            <div className="flex-1 text-center border-l border-gray-200">
              <div className="text-lg font-semibold text-neutral-800">{stats.offlinePatterns}</div>
              <div className="text-xs text-neutral-400">Offline Patterns</div>
            </div>
          </div>
        </div>
      )}

      {/* Pattern Suggestions */}
      <div className="flex-1 px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-neutral-800">Suggested for This Location</h2>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-primary"
            onClick={() => window.location.href = '/patterns'}
          >
            View All
          </Button>
        </div>

        {patternsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : patterns.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-neutral-600">No patterns suggested for this location yet.</p>
              <p className="text-sm text-neutral-400 mt-2">
                Try moving to a different area or check back later.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {patterns.map((pattern: PatternWithVotes) => (
              <PatternCard
                key={pattern.id}
                pattern={pattern}
                onVote={handleVote}
                onViewDetails={() => setSelectedPattern(pattern)}
                isVoting={voteMutation.isPending}
              />
            ))}
          </div>
        )}

        {/* Recent Activity */}
        <div className="mt-6 py-4 bg-gray-50 -mx-4 px-4">
          <h3 className="text-sm font-semibold text-neutral-800 mb-3">Recent Community Activity</h3>
          <div className="space-y-2">
            {activities.map((activity: Activity) => (
              <div key={activity.id} className="flex items-center space-x-3 text-sm">
                <div className="w-2 h-2 bg-secondary rounded-full"></div>
                <span className="text-neutral-600">{activity.description}</span>
                <span className="text-neutral-400 ml-auto">{formatTimeAgo(activity.createdAt.toString())}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Floating Action Button */}
      <Button
        className="fixed bottom-20 right-4 w-14 h-14 rounded-full shadow-lg"
        size="icon"
        onClick={() => {
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                const { latitude, longitude } = position.coords;
                setCurrentLocation({ lat: latitude, lng: longitude });
                
                createLocationMutation.mutate({
                  latitude: latitude.toString(),
                  longitude: longitude.toString(),
                  name: "Updated Location",
                  sessionId
                });
                
                toast({
                  title: "Location Updated",
                  description: "Refreshed your current location and patterns",
                });
              },
              (error) => {
                toast({
                  title: "Location Error",
                  description: "Unable to get your current location",
                  variant: "destructive"
                });
              }
            );
          }
        }}
      >
        <Plus className="w-6 h-6" />
      </Button>

      {/* Offline Indicator */}
      {!isOnline && (
        <div className="fixed top-20 left-4 right-4 bg-neutral-800 text-white px-4 py-2 rounded-lg text-sm z-50 max-w-sm mx-auto">
          <div className="flex items-center space-x-2">
            <WifiOff className="w-4 h-4" />
            <span>Offline mode - {stats?.offlinePatterns || 0} patterns available</span>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <BottomNavigation activeTab="discover" />

      {/* Pattern Details Modal */}
      {selectedPattern && (
        <PatternDetailsModal
          pattern={selectedPattern}
          isOpen={!!selectedPattern}
          onClose={() => setSelectedPattern(null)}
        />
      )}
    </div>
  );
}
