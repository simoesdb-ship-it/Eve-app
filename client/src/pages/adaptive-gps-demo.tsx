import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  MapPin, 
  Play, 
  Square, 
  Activity, 
  Gauge, 
  Clock, 
  Target,
  Navigation,
  Zap,
  TrendingUp
} from "lucide-react";
import { AdaptiveGPSTracker, type GPSPosition, type MovementAnalysis } from "@/lib/adaptive-gps-tracker";
import { useToast } from "@/hooks/use-toast";

export default function AdaptiveGPSDemo() {
  const [tracker] = useState(() => new AdaptiveGPSTracker());
  const [isTracking, setIsTracking] = useState(false);
  const [currentPosition, setCurrentPosition] = useState<GPSPosition | null>(null);
  const [currentMovement, setCurrentMovement] = useState<MovementAnalysis | null>(null);
  const [positionHistory, setPositionHistory] = useState<GPSPosition[]>([]);
  const [movementLog, setMovementLog] = useState<Array<{
    timestamp: number;
    movement: MovementAnalysis;
    position: GPSPosition;
  }>>([]);
  const sessionId = useRef(localStorage.getItem('sessionId') || 'demo_session');
  const { toast } = useToast();

  const startTracking = async () => {
    try {
      await tracker.startTracking(
        (position, movement) => {
          setCurrentPosition(position);
          setCurrentMovement(movement);
          setPositionHistory(tracker.getPositionHistory());
          
          // Store tracking data to server
          storeTrackingData(position, movement);
        },
        (oldMovement, newMovement) => {
          setMovementLog(prev => [...prev, {
            timestamp: Date.now(),
            movement: newMovement,
            position: currentPosition!
          }].slice(-10)); // Keep last 10 movement changes
          
          toast({
            title: "Movement Detected",
            description: `Changed from ${oldMovement?.type || 'unknown'} to ${newMovement.type}`,
          });
        }
      );
      
      setIsTracking(true);
      toast({
        title: "GPS Tracking Started",
        description: "Adaptive tracking system is now monitoring your movement",
      });
    } catch (error) {
      console.error('Failed to start tracking:', error);
      toast({
        title: "Tracking Error",
        description: "Failed to start GPS tracking. Please check location permissions.",
        variant: "destructive",
      });
    }
  };

  const stopTracking = () => {
    tracker.stopTracking();
    setIsTracking(false);
    toast({
      title: "GPS Tracking Stopped",
      description: "Movement monitoring has been disabled",
    });
  };

  const storeTrackingData = async (position: GPSPosition, movement: MovementAnalysis) => {
    try {
      const response = await fetch('/api/tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionId.current,
          latitude: position.latitude.toString(),
          longitude: position.longitude.toString(),
          movementType: movement.type,
          speed: movement.speed.toString(),
          accuracy: position.accuracy.toString(),
          metadata: JSON.stringify({
            confidence: movement.confidence,
            consistency: movement.consistency,
            duration: movement.duration,
            heading: position.heading
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

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'stationary': return <Target className="h-4 w-4" />;
      case 'walking': return <Activity className="h-4 w-4" />;
      case 'biking': return <Zap className="h-4 w-4" />;
      case 'driving': return <Navigation className="h-4 w-4" />;
      case 'transit': return <TrendingUp className="h-4 w-4" />;
      default: return <MapPin className="h-4 w-4" />;
    }
  };

  const getMovementColor = (type: string) => {
    switch (type) {
      case 'stationary': return 'bg-gray-600';
      case 'walking': return 'bg-green-600';
      case 'biking': return 'bg-blue-600';
      case 'driving': return 'bg-orange-600';
      case 'transit': return 'bg-purple-600';
      default: return 'bg-gray-600';
    }
  };

  const getTrackingInterval = () => {
    if (!currentMovement) return 'Unknown';
    const config = tracker.getTrackingConfig();
    return `${config.interval / 1000}s`;
  };

  const movementStats = tracker.getMovementStats();

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
          <Navigation className="h-8 w-8" />
          Adaptive GPS Tracking
        </h1>
        <p className="text-muted-foreground">
          Intelligent movement detection with dynamic tracking intervals for stationary, walking, biking, and riding users
        </p>
      </div>

      {/* Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Gauge className="h-5 w-5" />
              Tracking Control
            </span>
            <Badge variant={isTracking ? "default" : "secondary"}>
              {isTracking ? "Active" : "Inactive"}
            </Badge>
          </CardTitle>
          <CardDescription>
            Start adaptive GPS tracking with intelligent movement detection
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button 
              onClick={startTracking} 
              disabled={isTracking}
              className="flex items-center gap-2"
            >
              <Play className="h-4 w-4" />
              Start Tracking
            </Button>
            <Button 
              onClick={stopTracking} 
              disabled={!isTracking}
              variant="destructive"
              className="flex items-center gap-2"
            >
              <Square className="h-4 w-4" />
              Stop Tracking
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="current" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="current">Current Status</TabsTrigger>
          <TabsTrigger value="movement">Movement Log</TabsTrigger>
          <TabsTrigger value="statistics">Statistics</TabsTrigger>
          <TabsTrigger value="technical">Technical Details</TabsTrigger>
        </TabsList>

        {/* Current Status */}
        <TabsContent value="current" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Current Movement */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Current Movement
                </CardTitle>
              </CardHeader>
              <CardContent>
                {currentMovement ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Movement Type</span>
                      <Badge className={`${getMovementColor(currentMovement.type)} flex items-center gap-1`}>
                        {getMovementIcon(currentMovement.type)}
                        {currentMovement.type.charAt(0).toUpperCase() + currentMovement.type.slice(1)}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">
                          {currentMovement.speed}
                        </div>
                        <div className="text-sm text-muted-foreground">km/h</div>
                      </div>
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                          {(currentMovement.confidence * 100).toFixed(0)}%
                        </div>
                        <div className="text-sm text-muted-foreground">Confidence</div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Movement Consistency</span>
                        <span>{(currentMovement.consistency * 100).toFixed(0)}%</span>
                      </div>
                      <Progress value={currentMovement.consistency * 100} className="h-2" />
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Duration</span>
                      <span className="text-sm">{currentMovement.duration.toFixed(1)} min</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    {isTracking ? "Analyzing movement..." : "Start tracking to see movement data"}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Current Position */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Current Position
                </CardTitle>
              </CardHeader>
              <CardContent>
                {currentPosition ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Latitude</span>
                        <span className="text-sm font-mono">{currentPosition.latitude.toFixed(6)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Longitude</span>
                        <span className="text-sm font-mono">{currentPosition.longitude.toFixed(6)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Accuracy</span>
                        <span className="text-sm">{currentPosition.accuracy.toFixed(1)}m</span>
                      </div>
                      {currentPosition.heading && (
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Heading</span>
                          <span className="text-sm">{currentPosition.heading.toFixed(0)}°</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-4 border-t">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Tracking Interval</span>
                        <Badge variant="outline">{getTrackingInterval()}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Automatically adjusted based on movement type
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    {isTracking ? "Getting GPS position..." : "Start tracking to see position data"}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Adaptive Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Adaptive Configuration
              </CardTitle>
              <CardDescription>
                How tracking intervals adjust based on detected movement patterns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-5">
                {[
                  { type: 'stationary', interval: '30s', icon: Target, description: 'Less frequent when still' },
                  { type: 'walking', interval: '10s', icon: Activity, description: 'Standard interval' },
                  { type: 'biking', interval: '8s', icon: Zap, description: 'Slightly more frequent' },
                  { type: 'driving', interval: '5s', icon: Navigation, description: 'More frequent for speed' },
                  { type: 'transit', interval: '15s', icon: TrendingUp, description: 'Less critical for trains' }
                ].map((config) => (
                  <div key={config.type} className={`p-4 rounded-lg border-2 transition-all ${
                    currentMovement?.type === config.type 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border'
                  }`}>
                    <div className="text-center space-y-2">
                      <config.icon className="h-6 w-6 mx-auto text-muted-foreground" />
                      <div className="font-medium capitalize">{config.type}</div>
                      <Badge variant="outline">{config.interval}</Badge>
                      <div className="text-xs text-muted-foreground">{config.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Movement Log */}
        <TabsContent value="movement" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Movement Changes
              </CardTitle>
              <CardDescription>
                Recent movement type transitions detected by the adaptive system
              </CardDescription>
            </CardHeader>
            <CardContent>
              {movementLog.length > 0 ? (
                <div className="space-y-3">
                  {movementLog.slice().reverse().map((log, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge className={`${getMovementColor(log.movement.type)} flex items-center gap-1`}>
                          {getMovementIcon(log.movement.type)}
                          {log.movement.type.charAt(0).toUpperCase() + log.movement.type.slice(1)}
                        </Badge>
                        <div className="text-sm">
                          <div className="font-medium">{log.movement.speed} km/h</div>
                          <div className="text-muted-foreground">
                            {(log.movement.confidence * 100).toFixed(0)}% confidence
                          </div>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No movement changes detected yet. Start tracking to see movement transitions.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Statistics */}
        <TabsContent value="statistics" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Movement Statistics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Session Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {movementStats.totalDistance}m
                    </div>
                    <div className="text-sm text-muted-foreground">Total Distance</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {movementStats.averageSpeed}
                    </div>
                    <div className="text-sm text-muted-foreground">Avg Speed (km/h)</div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">
                      {movementStats.maxSpeed}
                    </div>
                    <div className="text-sm text-muted-foreground">Max Speed (km/h)</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {movementStats.trackingDuration.toFixed(1)}
                    </div>
                    <div className="text-sm text-muted-foreground">Duration (min)</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Position History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Position History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>GPS Points Collected</span>
                    <Badge variant="outline">{positionHistory.length}</Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Average Accuracy</span>
                    <span>
                      {positionHistory.length > 0 
                        ? (positionHistory.reduce((sum, pos) => sum + pos.accuracy, 0) / positionHistory.length).toFixed(1)
                        : '0'
                      }m
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Data Collection Rate</span>
                    <span>
                      {movementStats.trackingDuration > 0 
                        ? (positionHistory.length / movementStats.trackingDuration).toFixed(1)
                        : '0'
                      } points/min
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Technical Details */}
        <TabsContent value="technical" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gauge className="h-5 w-5" />
                Technical Configuration
              </CardTitle>
              <CardDescription>
                Current GPS settings and adaptive tracking parameters
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isTracking ? (
                <div className="space-y-6">
                  <div>
                    <h4 className="font-medium mb-3">Current GPS Configuration</h4>
                    <div className="bg-muted rounded-lg p-4 space-y-2 font-mono text-sm">
                      <div className="flex justify-between">
                        <span>Tracking Interval:</span>
                        <span>{tracker.getTrackingConfig().interval}ms</span>
                      </div>
                      <div className="flex justify-between">
                        <span>High Accuracy:</span>
                        <span>{tracker.getTrackingConfig().enableHighAccuracy ? 'Enabled' : 'Disabled'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Timeout:</span>
                        <span>{tracker.getTrackingConfig().timeout}ms</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Maximum Age:</span>
                        <span>{tracker.getTrackingConfig().maximumAge}ms</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-3">Movement Classification Thresholds</h4>
                    <div className="bg-muted rounded-lg p-4 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Stationary:</span>
                        <span>&lt; 0.5 km/h</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Walking:</span>
                        <span>0.5 - 6 km/h</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Biking:</span>
                        <span>6 - 25 km/h</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Driving:</span>
                        <span>25 - 120 km/h</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Transit:</span>
                        <span>&gt; 120 km/h</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-3">Adaptive Intervals by Movement Type</h4>
                    <div className="bg-muted rounded-lg p-4 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Stationary:</span>
                        <span>30s (power saving)</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Walking:</span>
                        <span>10s (standard)</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Biking:</span>
                        <span>8s (enhanced)</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Driving:</span>
                        <span>5s (high frequency)</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Transit:</span>
                        <span>15s (reduced)</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Start tracking to see technical configuration details
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}