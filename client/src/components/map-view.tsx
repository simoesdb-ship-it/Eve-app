import { useState } from "react";
import { MapPin, Plus, Minus, Navigation, Crosshair } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { PatternWithVotes } from "@shared/schema";

interface MapViewProps {
  currentLocation: {lat: number, lng: number} | null;
  patterns: PatternWithVotes[];
  onPatternSelect: (pattern: PatternWithVotes) => void;
}

export default function MapView({ currentLocation, patterns, onPatternSelect }: MapViewProps) {
  const [zoomLevel, setZoomLevel] = useState(13);
  const [showLocationDetails, setShowLocationDetails] = useState(false);

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 1, 18));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 1, 8));
  };

  const handleRecenter = () => {
    if (currentLocation) {
      setShowLocationDetails(!showLocationDetails);
    }
  };

  const getLocationName = () => {
    if (!currentLocation) return "Unknown Location";
    
    // Simple reverse geocoding simulation based on coordinates
    const { lat, lng } = currentLocation;
    
    if (Math.abs(lat - 37.7749) < 0.01 && Math.abs(lng + 122.4194) < 0.01) {
      return "San Francisco, CA";
    } else if (Math.abs(lat - 40.7128) < 0.01 && Math.abs(lng + 74.0060) < 0.01) {
      return "New York, NY";
    } else if (Math.abs(lat - 44.9778) < 0.01 && Math.abs(lng + 93.2650) < 0.01) {
      return "Minneapolis, MN";
    } else {
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
  };

  const getLocationDescription = () => {
    if (!currentLocation) return "";
    
    const descriptions = [
      "Urban downtown area with mixed commercial and residential use",
      "Pedestrian-friendly district with high walkability",
      "Transit-accessible neighborhood with community amenities",
      "Dense urban environment suitable for pattern implementation"
    ];
    
    return descriptions[Math.floor(Math.random() * descriptions.length)];
  };

  return (
    <div className="relative">
      {/* Interactive Map Area */}
      <div className="relative h-64 bg-gradient-to-br from-blue-100 to-green-100 overflow-hidden">
        {/* Map tiles simulation */}
        <div 
          className="w-full h-full map-container relative transition-all duration-300"
          style={{ 
            backgroundSize: `${100 + (zoomLevel - 13) * 20}%`,
            backgroundPosition: currentLocation ? 'center' : '50% 50%'
          }}
        >
          
          {/* Pattern cluster indicators - positioned based on patterns */}
          {patterns.map((pattern, index) => (
            <div 
              key={pattern.id}
              className={`absolute transform -translate-x-1/2 -translate-y-1/2`}
              style={{
                top: `${30 + index * 15}%`,
                left: `${40 + index * 20}%`
              }}
            >
              <button 
                className="w-8 h-8 bg-primary rounded-full border-2 border-white shadow-lg flex items-center justify-center hover:scale-110 transition-all duration-200 animate-pulse"
                onClick={() => onPatternSelect(pattern)}
                title={pattern.name}
              >
                <span className="text-white text-xs font-semibold">
                  {Math.round(pattern.confidence / 20)}
                </span>
              </button>
            </div>
          ))}

          {/* Current location indicator */}
          {currentLocation && (
            <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2">
              <button
                onClick={handleRecenter}
                className="relative hover:scale-110 transition-transform"
              >
                <div className="w-4 h-4 bg-secondary rounded-full border-2 border-white shadow-lg location-pin"></div>
                <div className="absolute inset-0 w-4 h-4 bg-secondary rounded-full border-2 border-white opacity-30 animate-ping"></div>
              </button>
            </div>
          )}

          {/* Zoom level indicator */}
          <div className="absolute top-4 left-4 bg-black/70 text-white px-2 py-1 rounded text-xs">
            Zoom: {zoomLevel}
          </div>

          {/* Navigation controls */}
          <div className="absolute bottom-4 right-4 flex flex-col space-y-2">
            <Button
              size="icon"
              variant="secondary"
              className="w-10 h-10 rounded-lg shadow-md hover:bg-white"
              onClick={handleZoomIn}
              disabled={zoomLevel >= 18}
            >
              <Plus className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              variant="secondary"
              className="w-10 h-10 rounded-lg shadow-md hover:bg-white"
              onClick={handleZoomOut}
              disabled={zoomLevel <= 8}
            >
              <Minus className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              variant="secondary"
              className="w-10 h-10 rounded-lg shadow-md hover:bg-white"
              onClick={handleRecenter}
              disabled={!currentLocation}
            >
              <Crosshair className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Location permission banner */}
        <div className="absolute top-0 left-0 right-0 bg-primary text-white px-4 py-2 text-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Navigation className="w-4 h-4 mr-2" />
              <span>Live location tracking</span>
            </div>
            <span className="text-xs opacity-80">Anonymous</span>
          </div>
        </div>
      </div>

      {/* Location Details Panel */}
      {showLocationDetails && currentLocation && (
        <Card className="mx-4 -mt-4 relative z-10 shadow-lg animate-slide-up">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-neutral-800 mb-1">
                  {getLocationName()}
                </h3>
                <p className="text-sm text-neutral-600 mb-3">
                  {getLocationDescription()}
                </p>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-neutral-400">Coordinates:</span>
                    <div className="font-mono">
                      {currentLocation.lat.toFixed(4)}, {currentLocation.lng.toFixed(4)}
                    </div>
                  </div>
                  <div>
                    <span className="text-neutral-400">Patterns found:</span>
                    <div className="font-semibold text-primary">
                      {patterns.length}
                    </div>
                  </div>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowLocationDetails(false)}
                className="text-neutral-400"
              >
                ×
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
