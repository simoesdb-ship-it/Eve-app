import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { 
  MapPin, 
  Activity, 
  TrendingUp, 
  RefreshCw, 
  Zap,
  Target,
  CheckCircle,
  Clock
} from "lucide-react";
import { AdaptiveGPSTracker, type GPSPosition, type MovementAnalysis } from "@/lib/adaptive-gps-tracker";
import type { PatternWithVotes } from "@shared/schema";

interface LivePatternSuggestionsProps {
  sessionId: string;
  onPatternSelect?: (pattern: PatternWithVotes) => void;
}

interface PatternUpdate {
  patterns: PatternWithVotes[];
  location: {
    lat: number;
    lng: number;
    accuracy: number;
  };
  timestamp: number;
  movementType: string;
}

export default function LivePatternSuggestions({ sessionId, onPatternSelect }: LivePatternSuggestionsProps) {
  const [tracker] = useState(() => new AdaptiveGPSTracker());
  const [isTracking, setIsTracking] = useState(false);
  const [currentPosition, setCurrentPosition] = useState<GPSPosition | null>(null);
  const [currentMovement, setCurrentMovement] = useState<MovementAnalysis | null>(null);
  const [lastPatternUpdate, setLastPatternUpdate] = useState<PatternUpdate | null>(null);
  const [updateHistory, setUpdateHistory] = useState<PatternUpdate[]>([]);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const lastUpdateLocation = useRef<{lat: number, lng: number} | null>(null);

  // Live pattern suggestions query - triggered by location changes
  const { data: livePatterns = [], isLoading: patternsLoading, refetch: refetchPatterns } = useQuery({
    queryKey: ['/api/patterns/live', currentPosition?.latitude, currentPosition?.longitude, sessionId],
    enabled: !!currentPosition && isTracking,
    queryFn: async () => {
      if (!currentPosition) return [];
      
      const response = await fetch(
        `/api/patterns/live?lat=${currentPosition.latitude}&lng=${currentPosition.longitude}&sessionId=${sessionId}&accuracy=${currentPosition.accuracy}&movement=${currentMovement?.type || 'unknown'}`
      );
      
      if (!response.ok) throw new Error('Failed to fetch live patterns');
      return response.json() as PatternWithVotes[];
    },
    refetchOnWindowFocus: false,
    staleTime: 30000, // Consider data stale after 30 seconds
  });

  // Update pattern history when new patterns are fetched
  useEffect(() => {
    if (livePatterns.length > 0 && currentPosition && currentMovement) {
      const newUpdate: PatternUpdate = {
        patterns: livePatterns,
        location: {
          lat: currentPosition.latitude,
          lng: currentPosition.longitude,
          accuracy: currentPosition.accuracy
        },
        timestamp: Date.now(),
        movementType: currentMovement.type
      };

      setLastPatternUpdate(newUpdate);
      setUpdateHistory(prev => [newUpdate, ...prev].slice(0, 10)); // Keep last 10 updates
    }
  }, [livePatterns, currentPosition, currentMovement]);

  // Start GPS tracking and pattern monitoring
  const startLiveTracking = async () => {
    try {
      await tracker.startTracking(
        (position, movement) => {
          setCurrentPosition(position);
          setCurrentMovement(movement);
          
          // Check if we've moved significantly since last pattern update
          const shouldUpdatePatterns = checkLocationChangeSignificance(position);
          
          if (shouldUpdatePatterns) {
            console.log('Significant location change detected, updating patterns...');
            refetchPatterns();
            lastUpdateLocation.current = { lat: position.latitude, lng: position.longitude };
          }
          
          // Store tracking data to server
          storeTrackingData(position, movement);
        },
        (oldMovement, newMovement) => {
          toast({
            title: "Movement Change Detected",
            description: `Switched to ${newMovement.type} mode - updating pattern suggestions`,
          });
          
          // Force pattern refresh on movement type change
          if (currentPosition) {
            refetchPatterns();
          }
        }
      );
      
      setIsTracking(true);
      toast({
        title: "Live Pattern Tracking Started",
        description: "Pattern suggestions will update automatically as you move",
      });
    } catch (error) {
      console.error('Failed to start live tracking:', error);
      toast({
        title: "Tracking Error",
        description: "Failed to start live pattern tracking. Please check location permissions.",
        variant: "destructive",
      });
    }
  };

  const stopLiveTracking = () => {
    tracker.stopTracking();
    setIsTracking(false);
    toast({
      title: "Live Tracking Stopped",
      description: "Pattern suggestions are no longer updating automatically",
    });
  };

  // Check if location change is significant enough to trigger pattern update
  const checkLocationChangeSignificance = (position: GPSPosition): boolean => {
    if (!lastUpdateLocation.current) return true;
    
    const distance = calculateDistance(
      lastUpdateLocation.current.lat,
      lastUpdateLocation.current.lng,
      position.latitude,
      position.longitude
    );
    
    // Update patterns if moved more than 50 meters or if accuracy is very high (< 10m)
    const significantDistance = 50; // meters
    const highAccuracy = position.accuracy < 10;
    
    return distance > significantDistance || (highAccuracy && distance > 20);
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  const storeTrackingData = async (position: GPSPosition, movement: MovementAnalysis) => {
    try {
      const response = await fetch('/api/tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          latitude: position.latitude.toString(),
          longitude: position.longitude.toString(),
          movementType: movement.type,
          speed: movement.speed.toString(),
          accuracy: position.accuracy.toString(),
          metadata: JSON.stringify({
            confidence: movement.confidence,
            consistency: movement.consistency,
            duration: movement.duration,
            heading: position.heading,
            patternUpdateTriggered: checkLocationChangeSignificance(position)
          })
        })
      });

      if (!response.ok) {
        console.error('Failed to store tracking data');
      }
    } catch (error) {
      console.error('Error storing tracking data:', error);
    }
  };

  const manualRefresh = () => {
    if (currentPosition) {
      refetchPatterns();
      toast({
        title: "Patterns Refreshed",
        description: "Updated pattern suggestions for current location",
      });
    }
  };

  const getPatternColorByConfidence = (confidence: number) => {
    if (confidence >= 0.7) return "bg-green-100 text-green-800 border-green-200";
    if (confidence >= 0.5) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    return "bg-red-100 text-red-800 border-red-200";
  };

  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

  return (
    <div className="space-y-4">
      {/* Live Tracking Control */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Live Pattern Discovery
            </span>
            <Badge variant={isTracking ? "default" : "secondary"}>
              {isTracking ? "Live" : "Inactive"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Status Display */}
            {isTracking && currentPosition && (
              <div className="grid grid-cols-2 gap-4 p-3 bg-muted rounded-lg">
                <div className="space-y-1">
                  <div className="text-sm font-medium">Current Location</div>
                  <div className="text-xs text-muted-foreground font-mono">
                    {currentPosition.latitude.toFixed(6)}, {currentPosition.longitude.toFixed(6)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    ±{currentPosition.accuracy.toFixed(1)}m accuracy
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-medium">Movement</div>
                  <div className="text-xs text-muted-foreground">
                    {currentMovement?.type.charAt(0).toUpperCase() + currentMovement?.type.slice(1) || 'Unknown'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {currentMovement?.speed.toFixed(1)} km/h
                  </div>
                </div>
              </div>
            )}

            {/* Control Buttons */}
            <div className="flex gap-2">
              {!isTracking ? (
                <Button onClick={startLiveTracking} className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Start Live Tracking
                </Button>
              ) : (
                <>
                  <Button onClick={stopLiveTracking} variant="destructive" className="flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Stop Tracking
                  </Button>
                  <Button onClick={manualRefresh} variant="outline" className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Refresh Now
                  </Button>
                </>
              )}
            </div>

            {/* Last Update Info */}
            {lastPatternUpdate && (
              <div className="text-sm text-muted-foreground">
                Last updated: {formatTimeAgo(lastPatternUpdate.timestamp)} • 
                {lastPatternUpdate.patterns.length} patterns found • 
                Movement: {lastPatternUpdate.movementType}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Live Pattern Suggestions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Current Location Patterns
            {patternsLoading && (
              <RefreshCw className="h-4 w-4 animate-spin" />
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!isTracking ? (
            <div className="text-center py-8 text-muted-foreground">
              <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <div>Start live tracking to see real-time pattern suggestions</div>
            </div>
          ) : patternsLoading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 mx-auto mb-2 animate-spin" />
              <div>Analyzing location patterns...</div>
            </div>
          ) : livePatterns.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <div>No patterns detected for current location</div>
              <Button onClick={manualRefresh} variant="outline" size="sm" className="mt-2">
                Try Again
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {livePatterns.slice(0, 5).map((pattern) => (
                <div
                  key={pattern.id}
                  className="p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => onPatternSelect?.(pattern)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono">
                        #{pattern.number}
                      </Badge>
                      <Badge className={getPatternColorByConfidence(pattern.confidence)}>
                        {(pattern.confidence * 100).toFixed(0)}% match
                      </Badge>
                      {pattern.isLive && (
                        <Badge variant="default" className="bg-green-600">
                          <Zap className="h-3 w-3 mr-1" />
                          Live
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {pattern.votes || 0} votes
                    </div>
                  </div>
                  
                  <h3 className="font-semibold text-sm mb-1">{pattern.name}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {pattern.description}
                  </p>
                  
                  <div className="mt-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span>Pattern Confidence</span>
                      <span>{(pattern.confidence * 100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${pattern.confidence * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}

              {livePatterns.length > 5 && (
                <div className="text-center pt-2">
                  <div className="text-sm text-muted-foreground">
                    +{livePatterns.length - 5} more patterns found
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Update History */}
      {updateHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Updates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {updateHistory.slice(0, 3).map((update, index) => (
                <div key={update.timestamp} className="flex items-center justify-between p-2 bg-muted rounded">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">
                      {update.patterns.length} patterns • {update.movementType}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatTimeAgo(update.timestamp)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}