import { useState, useEffect, useRef } from "react";
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
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  // Initialize OpenStreetMap
  useEffect(() => {
    if (!mapContainerRef.current || mapLoaded) return;

    // Create Leaflet map using CDN
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);

      // Initialize map
      const L = (window as any).L;
      if (L && mapContainerRef.current) {
        const map = L.map(mapContainerRef.current, {
          center: currentLocation ? [currentLocation.lat, currentLocation.lng] : [37.7749, -122.4194],
          zoom: zoomLevel,
          zoomControl: false
        });

        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19
        }).addTo(map);

        // Add current location marker
        if (currentLocation) {
          const marker = L.marker([currentLocation.lat, currentLocation.lng], {
            icon: L.divIcon({
              className: 'custom-location-marker',
              html: '<div class="w-4 h-4 bg-secondary rounded-full border-2 border-white shadow-lg"></div>',
              iconSize: [16, 16],
              iconAnchor: [8, 8]
            })
          }).addTo(map);

          marker.on('click', () => {
            setShowLocationDetails(!showLocationDetails);
          });
        }

        // Add pattern markers
        patterns.forEach((pattern, index) => {
          const patternMarker = L.marker([
            currentLocation ? currentLocation.lat + (Math.random() - 0.5) * 0.01 : 37.7749 + (Math.random() - 0.5) * 0.01,
            currentLocation ? currentLocation.lng + (Math.random() - 0.5) * 0.01 : -122.4194 + (Math.random() - 0.5) * 0.01
          ], {
            icon: L.divIcon({
              className: 'custom-pattern-marker',
              html: `<div class="w-8 h-8 bg-primary rounded-full border-2 border-white shadow-lg flex items-center justify-center animate-pulse">
                       <span class="text-white text-xs font-semibold">${Math.round(pattern.confidence / 20)}</span>
                     </div>`,
              iconSize: [32, 32],
              iconAnchor: [16, 16]
            })
          }).addTo(map);

          patternMarker.on('click', () => {
            onPatternSelect(pattern);
          });
        });

        mapRef.current = map;
        setMapLoaded(true);
      }
    };
    document.head.appendChild(script);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
      }
    };
  }, [currentLocation, patterns, mapLoaded]);

  // Update map when location changes
  useEffect(() => {
    if (mapRef.current && currentLocation) {
      mapRef.current.setView([currentLocation.lat, currentLocation.lng], zoomLevel);
    }
  }, [currentLocation, zoomLevel]);

  const handleZoomIn = () => {
    const newZoom = Math.min(zoomLevel + 1, 18);
    setZoomLevel(newZoom);
    if (mapRef.current) {
      mapRef.current.setZoom(newZoom);
    }
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(zoomLevel - 1, 8);
    setZoomLevel(newZoom);
    if (mapRef.current) {
      mapRef.current.setZoom(newZoom);
    }
  };

  const handleRecenter = () => {
    if (currentLocation && mapRef.current) {
      mapRef.current.setView([currentLocation.lat, currentLocation.lng], zoomLevel);
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
      <div className="relative h-64 overflow-hidden">
        {/* Leaflet Map Container */}
        <div 
          ref={mapContainerRef}
          className="w-full h-full"
          style={{ background: '#e5e7eb' }}
        />

        {/* Loading indicator */}
        {!mapLoaded && (
          <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-green-100 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <span className="text-sm text-neutral-600">Loading interactive map...</span>
            </div>
          </div>
        )}

        {/* Zoom level indicator */}
        <div className="absolute top-4 left-4 bg-black/70 text-white px-2 py-1 rounded text-xs z-[1000]">
          Zoom: {zoomLevel}
        </div>

        {/* Navigation controls */}
        <div className="absolute bottom-4 right-4 flex flex-col space-y-2 z-[1000]">
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
        <div className="absolute top-0 left-0 right-0 bg-primary text-white px-4 py-2 text-sm z-[1000]">
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
