import { useState } from "react";
import { MapPin, Navigation, Clock, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { PatternWithVotes } from "@shared/schema";

interface TrackingDisplayProps {
  currentLocation: {lat: number, lng: number} | null;
  locationHistory: Array<{lat: number, lng: number, timestamp: Date}>;
  patterns: PatternWithVotes[];
  onPatternSelect: (pattern: PatternWithVotes) => void;
}

export default function TrackingDisplay({ currentLocation, locationHistory, patterns, onPatternSelect }: TrackingDisplayProps) {
  const [showDetails, setShowDetails] = useState(false);

  const calculateTotalDistance = () => {
    if (locationHistory.length < 2) return 0;
    
    let total = 0;
    for (let i = 1; i < locationHistory.length; i++) {
      const prev = locationHistory[i - 1];
      const curr = locationHistory[i];
      const distance = Math.sqrt(
        Math.pow((curr.lat - prev.lat) * 111000, 2) + 
        Math.pow((curr.lng - prev.lng) * 85000, 2)
      );
      total += distance;
    }
    return total;
  };

  const getTrackingDuration = () => {
    if (locationHistory.length < 2) return "0 min";
    
    const start = locationHistory[0].timestamp;
    const end = locationHistory[locationHistory.length - 1].timestamp;
    const minutes = Math.floor((end.getTime() - start.getTime()) / 60000);
    
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  const formatLocation = (location: {lat: number, lng: number}) => {
    return `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`;
  };

  return (
    <div className="space-y-4 p-4">
      {/* Current Location Card */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Navigation className="w-4 h-4 text-primary" />
            Current Location
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {currentLocation ? (
            <div className="space-y-2">
              <p className="font-mono text-sm">{formatLocation(currentLocation)}</p>
              <div className="flex items-center gap-4 text-xs text-neutral-600">
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  <span>{locationHistory.length} points tracked</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{getTrackingDuration()}</span>
                </div>
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  <span>{Math.round(calculateTotalDistance())}m total</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-neutral-500">Getting location...</p>
          )}
        </CardContent>
      </Card>

      {/* Movement Path Visualization */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Movement Path</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="h-32 bg-gray-50 rounded-lg relative overflow-hidden">
            {locationHistory.length > 1 ? (
              <svg className="w-full h-full" viewBox="0 0 300 120">
                {/* Draw path */}
                {locationHistory.map((loc, index) => {
                  if (index === 0) return null;
                  const prev = locationHistory[index - 1];
                  
                  // Simple coordinate mapping for visualization
                  const x1 = 50 + (index - 1) * (200 / Math.max(locationHistory.length - 1, 1));
                  const y1 = 60 + Math.sin(index - 1) * 20;
                  const x2 = 50 + index * (200 / Math.max(locationHistory.length - 1, 1));
                  const y2 = 60 + Math.sin(index) * 20;
                  
                  return (
                    <g key={index}>
                      <line 
                        x1={x1} y1={y1} x2={x2} y2={y2}
                        stroke="#3B82F6" 
                        strokeWidth="2"
                      />
                      <circle 
                        cx={x2} cy={y2} r="3"
                        fill="#1E40AF"
                        stroke="#ffffff"
                        strokeWidth="1"
                      />
                    </g>
                  );
                })}
                
                {/* Current location marker */}
                {currentLocation && (
                  <circle 
                    cx={250} cy={60} r="5"
                    fill="#10B981"
                    stroke="#ffffff"
                    strokeWidth="2"
                  />
                )}
              </svg>
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-neutral-500">
                Movement path will appear after tracking begins
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Tracking Points */}
      {locationHistory.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Recent Points</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {locationHistory.slice(-5).reverse().map((loc, index) => (
                <div key={index} className="flex items-center justify-between text-xs">
                  <span className="font-mono">{formatLocation(loc)}</span>
                  <span className="text-neutral-500">
                    {loc.timestamp.toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pattern Suggestions */}
      {patterns.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Movement Patterns</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {patterns.slice(0, 3).map((pattern) => (
                <div 
                  key={pattern.id}
                  className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                  onClick={() => onPatternSelect(pattern)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-medium text-sm">{pattern.name}</h4>
                    <Badge variant="secondary" className="text-xs">
                      {Math.round(pattern.confidence)}% match
                    </Badge>
                  </div>
                  <p className="text-xs text-neutral-600">{pattern.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}