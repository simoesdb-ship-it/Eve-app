import { useState, useRef, useEffect } from "react";
import { MapPin, Plus, Minus, Navigation, Crosshair } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { PatternWithVotes } from "@shared/schema";

interface SimpleMapProps {
  currentLocation: {lat: number, lng: number} | null;
  locationHistory: Array<{lat: number, lng: number, timestamp: Date}>;
  patterns: PatternWithVotes[];
  onPatternSelect: (pattern: PatternWithVotes) => void;
}

export default function SimpleMap({ currentLocation, locationHistory, patterns, onPatternSelect }: SimpleMapProps) {
  const [zoomLevel, setZoomLevel] = useState(13);
  const [showLocationDetails, setShowLocationDetails] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Draw the map on canvas
  useEffect(() => {
    if (!canvasRef.current || !currentLocation) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth * 2;
    canvas.height = canvas.offsetHeight * 2;
    ctx.scale(2, 2);

    // Clear canvas
    ctx.fillStyle = '#e5e7eb';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw street-like grid pattern
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 1;
    const gridSize = 40;
    
    // Vertical "streets"
    for (let x = gridSize; x < canvas.offsetWidth; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.offsetHeight);
      ctx.stroke();
    }
    
    // Horizontal "streets"
    for (let y = gridSize; y < canvas.offsetHeight; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.offsetWidth, y);
      ctx.stroke();
    }

    // Calculate center point
    const centerX = canvas.offsetWidth / 2;
    const centerY = canvas.offsetHeight / 2;

    // Draw location history path
    if (locationHistory.length > 1) {
      ctx.strokeStyle = '#3B82F6';
      ctx.lineWidth = 3;
      ctx.beginPath();
      
      locationHistory.forEach((loc, index) => {
        // Simple coordinate mapping (this would need proper projection in real implementation)
        const x = centerX + (loc.lng - currentLocation.lng) * 10000;
        const y = centerY - (loc.lat - currentLocation.lat) * 10000;
        
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();

      // Draw small markers for historical points
      locationHistory.forEach((loc, index) => {
        if (index === locationHistory.length - 1) return; // Skip current location
        
        const x = centerX + (loc.lng - currentLocation.lng) * 10000;
        const y = centerY - (loc.lat - currentLocation.lat) * 10000;
        
        ctx.fillStyle = '#1E40AF';
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
      });
    }

    // Draw current location marker
    ctx.fillStyle = '#10B981';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 8, 0, 2 * Math.PI);
    ctx.fill();
    
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Add location coordinates text
    ctx.fillStyle = '#374151';
    ctx.font = '12px system-ui';
    ctx.fillText(`${currentLocation.lat.toFixed(4)}, ${currentLocation.lng.toFixed(4)}`, 10, 25);
    
  }, [currentLocation, locationHistory, zoomLevel]);

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 1, 18));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 1, 8));
  };

  const handleRecenter = () => {
    setShowLocationDetails(!showLocationDetails);
  };

  const getLocationName = () => {
    if (!currentLocation) return "Unknown Location";
    
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
    const descriptions = [
      "Urban area with mixed development",
      "Pedestrian-friendly district",
      "Transit-accessible neighborhood",
      "Dense urban environment"
    ];
    
    return descriptions[Math.floor(Math.random() * descriptions.length)];
  };

  return (
    <div className="relative">
      {/* Simple Canvas Map */}
      <div className="relative h-64 overflow-hidden bg-gray-100">
        <canvas 
          ref={canvasRef}
          className="w-full h-full"
          style={{ imageRendering: 'pixelated' }}
        />

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

        {/* Location permission banner */}
        <div className="absolute top-0 left-0 right-0 bg-primary text-white px-4 py-2 text-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Navigation className="w-4 h-4 mr-2" />
              <span>Live location tracking</span>
            </div>
            <span className="text-xs opacity-80">
              {locationHistory.length} points tracked
            </span>
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
                    <span className="text-neutral-400">Tracking points:</span>
                    <div className="font-semibold text-primary">
                      {locationHistory.length}
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