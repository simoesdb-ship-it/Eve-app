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
import { generateSessionId, calculateDistance } from "@/lib/geolocation";
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
  const [persistentUserId, setPersistentUserId] = useState<string>('');
  const [isLocationLoading, setIsLocationLoading] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const { toast } = useToast();

  // Load username and persistent user ID
  useEffect(() => {
    async function loadUserData() {
      try {
        const userId = await getConsistentUserId();
        const displayName = getUserDisplayName(userId);
        setUsername(displayName);
        setPersistentUserId(userId);
      } catch (error) {
        console.error('Failed to generate username:', error);
        setUsername('Anonymous');
      }
    }
    loadUserData();
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
    setIsLocationLoading(true);
    setLocationError(null);
    
    // Rate limiting: don't attempt more than once every 30 seconds
    if (now - lastLocationAttempt < 30000) {
      console.log('Location request rate limited');
      setIsLocationLoading(false);
      return;
    }
    
    // Stop trying after 3 failed attempts per session to prevent spam
    if (locationAttempts >= 3) {
      console.log('Max location attempts reached, asking user for permission or trying IP geolocation');
      
      // Try IP-based geolocation as a last resort
      try {
        const ipResponse = await fetch('https://ipapi.co/json/');
        const ipData = await ipResponse.json();
        if (ipData.latitude && ipData.longitude) {
          const ipLocation = { lat: ipData.latitude, lng: ipData.longitude };
          console.log(`Using IP geolocation: ${ipData.city}, ${ipData.country}`);
          setCurrentLocation(ipLocation);
          setIsLocationLoading(false);
          createLocationMutation.mutate({
            latitude: ipLocation.lat.toString(),
            longitude: ipLocation.lng.toString(),
            name: `${ipData.city}, ${ipData.country}`,
            sessionId: persistentUserId || sessionId
          });
          return;
        }
      } catch (ipError) {
        console.warn('IP geolocation failed:', ipError);
      }
      
      // Final fallback only if we have no location at all
      if (!currentLocation) {
        setLocationError('GPS access denied or unavailable');
        setIsLocationLoading(false);
        return;
      }
      setIsLocationLoading(false);
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
          setIsLocationLoading(false);
          createLocationMutation.mutate({
            latitude: lastLocation.lat.toString(),
            longitude: lastLocation.lng.toString(),
            name: "Last Known Location",
            sessionId: persistentUserId || sessionId // Use persistent user ID if available
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
            enableHighAccuracy: false, // Use lower accuracy for faster response
            timeout: 10000, // Reduced timeout for quicker fallback
            maximumAge: 60000 // Allow older cached location data (1 minute)
          });
        });
        
        const { latitude, longitude, accuracy } = position.coords;
        
        // Be more permissive with GPS accuracy - allow up to 1000 meters for initial location
        if (accuracy && accuracy > 1000) {
          console.warn(`GPS accuracy too low (${accuracy}m), trying again with lower precision`);
          throw new Error('GPS accuracy insufficient');
        }
        
        // Additional validation: prevent extreme coordinate jumps
        if (currentLocation) {
          const distance = calculateDistance(
            currentLocation.lat, currentLocation.lng,
            latitude, longitude
          );
          
          // If location jumped more than 10km, it's likely an error
          if (distance > 10000) {
            console.warn(`GPS location jump too large (${distance}m), using previous location`);
            return;
          }
        }
        
        setCurrentLocation({ lat: latitude, lng: longitude });
        setIsLocationLoading(false);
        
        createLocationMutation.mutate({
          latitude: latitude.toString(),
          longitude: longitude.toString(),
          name: "Current Location",
          sessionId: persistentUserId || sessionId // Use persistent user ID if available
        });
        
        console.log(`Using GPS location: ${latitude.toFixed(6)}, ${longitude.toFixed(6)} (accuracy: ${accuracy?.toFixed(1)}m)`);
        return;
      } catch (gpsError) {
        console.warn('GPS location failed:', gpsError);
        setLocationError('Unable to access GPS location');
      }
    }
    
    setIsLocationLoading(false);
  }, [sessionId, persistentUserId, createLocationMutation, lastLocationAttempt, locationAttempts, currentLocation]);

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
      sessionId: persistentUserId || sessionId, // Use persistent user ID if available
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
                  isLocationLoading ? "Getting location..." : "Location access needed"
                }
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Location Permission Prompt */}
      {(!currentLocation && !isLocationLoading) && (
        <div className="mx-4 my-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
              <span className="text-amber-600 text-sm">📍</span>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-amber-800">Location Access Needed</h3>
              <p className="text-xs text-amber-600 mt-1">
                {locationError || "Enable GPS to discover architectural patterns around you"}
              </p>
            </div>
            <div className="flex flex-col space-y-2">
              <button 
                onClick={() => {
                  setLocationAttempts(0);
                  acquireLocation();
                }}
                className="px-3 py-1 bg-amber-600 text-white text-xs rounded hover:bg-amber-700"
              >
                Try Again
              </button>
              <button 
                onClick={() => {
                  // Use a default location for demonstration
                  const defaultLocation = { lat: 44.9537, lng: -93.0900 }; // Minneapolis downtown
                  setCurrentLocation(defaultLocation);
                  setIsLocationLoading(false);
                  createLocationMutation.mutate({
                    latitude: defaultLocation.lat.toString(),
                    longitude: defaultLocation.lng.toString(),
                    name: "Demo Location",
                    sessionId: persistentUserId || sessionId
                  });
                }}
                className="px-3 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600"
              >
                Use Demo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLocationLoading && (
        <div className="mx-4 my-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-blue-800">Getting Your Location</h3>
              <p className="text-xs text-blue-600 mt-1">
                Please allow location access when prompted
              </p>
            </div>
          </div>
        </div>
      )}

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
              <h2 className="text-lg font-semibold text-neutral-800">Pattern Validation</h2>
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
