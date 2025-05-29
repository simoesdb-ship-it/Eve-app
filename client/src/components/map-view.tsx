import { MapPin, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PatternWithVotes } from "@shared/schema";

interface MapViewProps {
  currentLocation: {lat: number, lng: number} | null;
  patterns: PatternWithVotes[];
  onPatternSelect: (pattern: PatternWithVotes) => void;
}

export default function MapView({ currentLocation, patterns, onPatternSelect }: MapViewProps) {
  const handleZoomIn = () => {
    console.log("Zoom in");
  };

  const handleZoomOut = () => {
    console.log("Zoom out");
  };

  return (
    <div className="relative h-64 bg-gradient-to-br from-blue-100 to-green-100">
      {/* Map background */}
      <div className="w-full h-full map-container relative">
        
        {/* Pattern cluster indicators */}
        <div className="absolute top-12 left-12">
          <button 
            className="w-8 h-8 bg-primary rounded-full border-2 border-white shadow-lg flex items-center justify-center animate-pulse hover:scale-110 transition-transform"
            onClick={() => patterns[0] && onPatternSelect(patterns[0])}
          >
            <span className="text-white text-xs font-semibold">3</span>
          </button>
        </div>
        
        <div className="absolute top-20 right-16">
          <button 
            className="w-6 h-6 bg-accent rounded-full border-2 border-white shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
            onClick={() => patterns[1] && onPatternSelect(patterns[1])}
          >
            <span className="text-white text-xs font-semibold">1</span>
          </button>
        </div>

        {/* Current location indicator */}
        {currentLocation && (
          <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2">
            <div className="relative">
              <div className="w-4 h-4 bg-secondary rounded-full border-2 border-white shadow-lg location-pin"></div>
              <div className="absolute inset-0 w-4 h-4 bg-secondary rounded-full border-2 border-white"></div>
            </div>
          </div>
        )}

        {/* Zoom controls */}
        <div className="absolute bottom-4 right-4 flex flex-col space-y-2">
          <Button
            size="icon"
            variant="secondary"
            className="w-10 h-10 rounded-lg shadow-md"
            onClick={handleZoomIn}
          >
            <Plus className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="secondary"
            className="w-10 h-10 rounded-lg shadow-md"
            onClick={handleZoomOut}
          >
            <Minus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Location permission banner */}
      <div className="absolute top-0 left-0 right-0 bg-accent text-white px-4 py-2 text-sm text-center">
        <MapPin className="inline w-4 h-4 mr-2" />
        Anonymous location tracking enabled
      </div>
    </div>
  );
}
