import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import MapView from "@/components/map-view";
import PatternCard from "@/components/pattern-card";
import BottomNavigation from "@/components/bottom-navigation";
import PatternDetailsModal from "@/components/pattern-details-modal";
import { getUserDisplayName } from "@/lib/username-generator";
import { getConsistentUserId } from "@/lib/device-fingerprint";
import { generateSessionId } from "@/lib/geolocation";
import { startGlobalTracking, stopGlobalTracking } from "@/lib/movement-tracker";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, Wifi, WifiOff, Shield, ChevronDown, ChevronUp } from "lucide-react";
import type { PatternWithVotes } from "@shared/schema";

export default function DiscoverPage() {
  const [sessionId] = useState(() => generateSessionId());
  const [selectedPattern, setSelectedPattern] = useState<PatternWithVotes | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);
  const [locationId, setLocationId] = useState<number | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isPatternsCollapsed, setIsPatternsCollapsed] = useState(true);
  const [username, setUsername] = useState<string>('');
  const { toast } = useToast();

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

  // Rate-limited location acquisition with proper error handling
  const [lastLocationAttempt, setLastLocationAttempt] = useState<number>(0);
  const [locationAttempts, setLocationAttempts] = useState<number>(0);
  
  const acquireLocation = useCallback(async () => {
    const now = Date.now();
    
      // Rate limiting: don't attempt more than once every 30 seconds
    if (now - lastLocationAttempt < 30000) {
      console.log('Location request rate limited');
      return;
    }
    
    // Stop trying after 2 failed attempts per session to prevent spam
    if (locationAttempts >= 2) {
      console.log('Max location attempts reached, using fallback');
      const fallbackLocation = { lat: 44.9799652, lng: -93.289345 }; // Minneapolis
      
      // Only set location if we don't already have one
      if (!currentLocation) {
        setCurrentLocation(fallbackLocation);
        createLocationMutation.mutate({
          latitude: fallbackLocation.lat.toString(),
          longitude: fallbackLocation.lng.toString(),
          name: "Default Location",
          sessionId
        });
      }
      return;
    }
    
    setLastLocationAttempt(now);
    setLocationAttempts(prev => prev + 1);
    
    // Strategy 1: Try to get the latest tracked location from database first
    try {
      const response = await fetch(`/api/tracking/${sessionId}`);
      if (response.ok) {
        const trackingPoints = await response.json();
        
        if (trackingPoints.length > 0) {
          const lastPoint = trackingPoints[trackingPoints.length - 1];
          const lastLocation = {
            lat: Number(lastPoint.latitude),
            lng: Number(lastPoint.longitude)
          };
          
          setCurrentLocation(lastLocation);
          createLocationMutation.mutate({
            latitude: lastLocation.lat.toString(),
            longitude: lastLocation.lng.toString(),
            name: "Last Known Location",
            sessionId
          });
          
          console.log(`Using last tracked location: ${lastLocation.lat.toFixed(6)}, ${lastLocation.lng.toFixed(6)}`);
          return;
        }
      }
    } catch (trackingError) {
      console.warn('Failed to get last tracked location:', trackingError);
    }
    
    // Strategy 2: Try GPS if we have permission and it's supported
    if (navigator.geolocation) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: false, // Use standard accuracy to be more reliable
            timeout: 8000,
            maximumAge: 300000 // Accept cached location up to 5 minutes old
          });
        });
        
        const { latitude, longitude } = position.coords;
        setCurrentLocation({ lat: latitude, lng: longitude });
        
        createLocationMutation.mutate({
          latitude: latitude.toString(),
          longitude: longitude.toString(),
          name: "Current Location",
          sessionId
        });
        
        console.log(`Using GPS location: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        return;
      } catch (gpsError) {
        console.warn('GPS location failed:', gpsError);
      }
    }
    
    // Strategy 3: Use fallback location
    const fallbackLocation = { lat: 44.9799652, lng: -93.289345 }; // Minneapolis
    setCurrentLocation(fallbackLocation);
    createLocationMutation.mutate({
      latitude: fallbackLocation.lat.toString(),
      longitude: fallbackLocation.lng.toString(),
      name: "Default Location",
      sessionId
    });
    
    console.log('Using fallback location (Minneapolis)');
  }, [sessionId, createLocationMutation, lastLocationAttempt, locationAttempts, currentLocation]);

  // Acquire location only once on component mount
  const [hasInitialized, setHasInitialized] = useState(false);
  
  useEffect(() => {
    if (!hasInitialized) {
      acquireLocation();
      setHasInitialized(true);
    }
  }, [hasInitialized, acquireLocation]);

  // Monitor app visibility changes for location refresh (rate limited)
  const [lastVisibilityChange, setLastVisibilityChange] = useState<number>(0);
  
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        const now = Date.now();
        // Only refresh location if it's been more than 30 seconds since last attempt
        if (now - lastVisibilityChange > 30000) {
          console.log('App returned to foreground, refreshing location...');
          setLastVisibilityChange(now);
          setTimeout(() => {
            acquireLocation();
          }, 1000);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [acquireLocation, lastVisibilityChange]);

  // Disable automatic movement tracking to prevent geolocation spam
  useEffect(() => {
    console.log('Movement tracking started for session:', sessionId);
    // Background tracking disabled to prevent excessive geolocation requests
    // Location updates happen only when user interacts with map buttons
  }, [sessionId]);

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

  const handleLocationUpdate = (newLocation: {lat: number, lng: number}) => {
    setCurrentLocation(newLocation);
    
    // Create new location entry when location is updated
    createLocationMutation.mutate({
      latitude: newLocation.lat.toString(),
      longitude: newLocation.lng.toString(),
      sessionId,
      metadata: JSON.stringify({
        accuracy: 'high',
        source: 'manual_refresh',
        timestamp: new Date().toISOString()
      })
    });
  };



  return (
    <div className="flex flex-col min-h-screen bg-neutral-50">
      {/* Status Bar */}
      <div className="safe-area-top bg-primary text-white px-4 py-1 text-sm">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-secondary rounded-full animate-pulse"></div>
          <span>{username || 'Loading...'}</span>
        </div>
      </div>

      {/* App Header */}
      <header className="bg-transparent px-4 py-3">
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
        sessionId={sessionId}
        onLocationUpdate={handleLocationUpdate}
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
              <Link href="/offline-patterns">
                <div className="text-xs text-neutral-400 hover:text-primary cursor-pointer">Offline Patterns</div>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Pattern Suggestions */}
      <div className="flex-1 px-4 py-4 pb-24">
        <Collapsible open={!isPatternsCollapsed} onOpenChange={(open) => setIsPatternsCollapsed(!open)}>
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between mb-4 cursor-pointer">
              <h2 className="text-lg font-semibold text-neutral-800">Current Position Potential</h2>
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.location.href = '/patterns';
                  }}
                >
                  View All
                </Button>
                {isPatternsCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </div>
            </div>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
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
          </CollapsibleContent>
        </Collapsible>


      </div>



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
