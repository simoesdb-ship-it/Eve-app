import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import TrackingDisplay from "@/components/tracking-display";
import PatternCard from "@/components/pattern-card";
import BottomNavigation from "@/components/bottom-navigation";
import PatternDetailsModal from "@/components/pattern-details-modal";
import { generateSessionId } from "@/lib/geolocation";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Wifi, WifiOff, Shield } from "lucide-react";
import type { PatternWithVotes, Activity } from "@shared/schema";

// Helper function to calculate distance between two coordinates
function getDistanceFromLatLonInM(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000; // Radius of the earth in meters
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const d = R * c; // Distance in meters
  return d;
}

function deg2rad(deg: number) {
  return deg * (Math.PI/180);
}

export default function DiscoverPage() {
  const [sessionId] = useState(() => generateSessionId());
  const [selectedPattern, setSelectedPattern] = useState<PatternWithVotes | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);
  const [locationHistory, setLocationHistory] = useState<Array<{lat: number, lng: number, timestamp: Date}>>([]);
  const [locationId, setLocationId] = useState<number | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [watchId, setWatchId] = useState<any>(null);
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

  // Continuous location tracking
  useEffect(() => {
    if (navigator.geolocation) {
      // Get initial position
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const newLocation = { lat: latitude, lng: longitude };
          setCurrentLocation(newLocation);
          
          // Add to location history
          setLocationHistory(prev => [...prev, { 
            lat: latitude, 
            lng: longitude, 
            timestamp: new Date() 
          }]);
          
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
          toast({
            title: "Location Access Required",
            description: "Please enable location services to track your movement and discover patterns",
            variant: "destructive"
          });
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 60000
        }
      );
      
      // Set up time-based tracking (every 3 minutes)
      const trackingInterval = setInterval(() => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            const newLocation = { lat: latitude, lng: longitude };
            
            // Always update current location
            setCurrentLocation(newLocation);
            
            // Add to location history with timestamp
            setLocationHistory(prev => {
              const newHistory = [...prev, { 
                lat: latitude, 
                lng: longitude, 
                timestamp: new Date() 
              }];
              
              // Only keep last 20 tracking points (1 hour of data)
              return newHistory.slice(-20);
            });
            
            // Record location in database every time
            createLocationMutation.mutate({
              latitude: latitude.toString(),
              longitude: longitude.toString(),
              name: "Movement Track",
              sessionId
            });
          },
          (error) => {
            console.warn("Tracking interval error:", error);
          },
          {
            enableHighAccuracy: false, // Use less battery
            timeout: 15000,
            maximumAge: 180000 // 3 minutes cache
          }
        );
      }, 180000); // 3 minutes = 180000ms
      
      setWatchId(trackingInterval);
    }
    
    // Cleanup function
    return () => {
      if (watchId !== null) {
        clearInterval(watchId);
      }
    };
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
      <div className="safe-area-top bg-primary text-white px-4 py-2 text-sm">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-secondary rounded-full animate-pulse"></div>
          <span>Guest User</span>
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

      {/* Tracking Display */}
      <TrackingDisplay 
        currentLocation={currentLocation}
        locationHistory={locationHistory}
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

      {/* Recent Activity */}
      <div className="px-4 py-4 bg-gray-50 border-t border-gray-100">
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
