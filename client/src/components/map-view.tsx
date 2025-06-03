import { useState, useEffect, useRef } from "react";
import { MapPin, Plus, Minus, Navigation, Crosshair, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLocation } from "wouter";
import { getMovementTracker } from "@/lib/movement-tracker";
import type { PatternWithVotes, TrackingPoint } from "@shared/schema";

interface MapViewProps {
  currentLocation: {lat: number, lng: number} | null;
  patterns: PatternWithVotes[];
  onPatternSelect: (pattern: PatternWithVotes) => void;
  sessionId: string;
}

export default function MapView({ currentLocation, patterns, onPatternSelect, sessionId }: MapViewProps) {
  const [zoomLevel, setZoomLevel] = useState(13);
  const [showLocationDetails, setShowLocationDetails] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [trackingPoints, setTrackingPoints] = useState<TrackingPoint[]>([]);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [location, navigate] = useLocation();

  // Initialize OpenStreetMap
  useEffect(() => {
    if (!mapContainerRef.current) return;

    let cleanup = false;
    let markers: any[] = [];

    const initializeMap = () => {
      try {
        const L = (window as any).L;
        if (!L || !mapContainerRef.current || cleanup) return;

        // Clear any existing map and markers
        if (mapRef.current) {
          try {
            mapRef.current.remove();
          } catch (error) {
            console.warn('Error removing existing map:', error);
          }
          mapRef.current = null;
        }
        markers.forEach(marker => {
          try {
            marker.remove();
          } catch (error) {
            console.warn('Error removing marker:', error);
          }
        });
        markers = [];

        // Initialize map with error handling
        const map = L.map(mapContainerRef.current, {
          center: currentLocation ? [currentLocation.lat, currentLocation.lng] : [37.7749, -122.4194],
          zoom: zoomLevel,
          zoomControl: false,
          attributionControl: false
        });

        // Add OpenStreetMap tiles with cross-browser compatibility
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19,
          crossOrigin: true,
          errorTileUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI1NiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI1NiIgZmlsbD0iI2VlZSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjE2Ij5NYXAgVGlsZTwvdGV4dD48L3N2Zz4=',
          // Fallback tile servers for better cross-browser compatibility
          subdomains: ['a', 'b', 'c']
        }).addTo(map);

        // Add current location marker with error handling
        if (currentLocation && !cleanup) {
          try {
            const locationMarker = L.marker([currentLocation.lat, currentLocation.lng], {
              icon: L.divIcon({
                className: 'custom-location-marker',
                html: '<div style="width: 16px; height: 16px; background: #10B981; border: 2px solid white; border-radius: 50%; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>',
                iconSize: [16, 16],
                iconAnchor: [8, 8]
              })
            }).addTo(map);

            locationMarker.on('click', () => {
              setShowLocationDetails(prev => !prev);
            });
            
            markers.push(locationMarker);
          } catch (error) {
            console.warn('Failed to add location marker:', error);
          }
        }

        // Add tracking points as persistent dots to show movement patterns
        trackingPoints.forEach((point, index) => {
          if (cleanup) return;
          
          try {
            const lat = Number(point.latitude);
            const lng = Number(point.longitude);
            
            // Create more visible tracking dots that accumulate over time
            const dotAge = Date.now() - new Date(point.timestamp).getTime();
            const isRecent = dotAge < 3600000; // Less than 1 hour old
            
            const trackingDot = L.marker([lat, lng], {
              icon: L.divIcon({
                className: 'custom-tracking-dot',
                html: `<div style="
                  width: ${isRecent ? '6px' : '4px'}; 
                  height: ${isRecent ? '6px' : '4px'}; 
                  background: ${isRecent ? '#10B981' : '#3B82F6'}; 
                  border: 1px solid white; 
                  border-radius: 50%; 
                  box-shadow: 0 2px 4px rgba(0,0,0,0.4);
                  opacity: ${isRecent ? '1' : '0.8'};
                "></div>`,
                iconSize: [isRecent ? 6 : 4, isRecent ? 6 : 4],
                iconAnchor: [isRecent ? 3 : 2, isRecent ? 3 : 2]
              })
            }).addTo(map);

            // Add detailed tooltip with tracking information
            const timeAgo = Math.floor(dotAge / 60000); // minutes ago
            trackingDot.bindTooltip(`
              Tracked: ${new Date(point.timestamp).toLocaleString()}<br>
              ${timeAgo < 60 ? `${timeAgo} minutes ago` : `${Math.floor(timeAgo / 60)} hours ago`}<br>
              Coords: ${lat.toFixed(6)}, ${lng.toFixed(6)}
            `, {
              permanent: false,
              direction: 'top',
              className: 'tracking-tooltip'
            });
            
            markers.push(trackingDot);
          } catch (error) {
            console.warn('Failed to add tracking dot:', error);
          }
        });

        mapRef.current = map;
        setMapLoaded(true);
      } catch (error) {
        console.error('Map initialization failed:', error);
        setMapLoaded(false);
      }
    };

    // Load Leaflet if not already loaded
    if (!(window as any).L) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);

      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => {
        if (!cleanup) {
          setTimeout(initializeMap, 100);
        }
      };
      script.onerror = () => {
        console.error('Failed to load Leaflet library');
        setMapLoaded(false);
      };
      document.head.appendChild(script);
    } else {
      setTimeout(initializeMap, 100);
    }

    return () => {
      cleanup = true;
      // Clean up markers first
      markers.forEach(marker => {
        try {
          marker.remove();
        } catch (error) {
          console.warn('Error removing marker:', error);
        }
      });
      markers = [];
      
      // Then clean up map
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch (error) {
          console.warn('Error removing map:', error);
        }
        mapRef.current = null;
      }
      setMapLoaded(false);
    };
  }, [currentLocation, patterns.length, trackingPoints.length]);

  // Fetch tracking points for this session and update continuously
  useEffect(() => {
    const fetchTrackingPoints = async () => {
      try {
        const response = await fetch(`/api/tracking/${sessionId}`);
        if (response.ok) {
          const points = await response.json();
          setTrackingPoints(points);
          console.log(`Loaded ${points.length} tracking points for visualization`);
        }
      } catch (error) {
        console.warn('Failed to fetch tracking points:', error);
      }
    };

    if (sessionId) {
      fetchTrackingPoints();
      // Refresh tracking points every 10 seconds to show new dots quickly
      const interval = setInterval(fetchTrackingPoints, 10000);
      return () => clearInterval(interval);
    }
  }, [sessionId]);

  // Listen for real-time tracking point additions
  useEffect(() => {
    const handleTrackingPointAdded = () => {
      // Immediately refresh tracking points when a new one is added
      const fetchLatestPoints = async () => {
        try {
          const response = await fetch(`/api/tracking/${sessionId}`);
          if (response.ok) {
            const points = await response.json();
            setTrackingPoints(points);
            console.log(`Updated to ${points.length} tracking points after new addition`);
          }
        } catch (error) {
          console.warn('Failed to fetch latest tracking points:', error);
        }
      };
      
      fetchLatestPoints();
    };

    window.addEventListener('trackingPointAdded', handleTrackingPointAdded);
    return () => window.removeEventListener('trackingPointAdded', handleTrackingPointAdded);
  }, [sessionId]);

  // Update map when location changes
  useEffect(() => {
    if (mapRef.current && currentLocation) {
      try {
        mapRef.current.setView([currentLocation.lat, currentLocation.lng], zoomLevel);
      } catch (error) {
        console.warn('Error updating map view:', error);
        // Trigger map reload if update fails
        setMapLoaded(false);
      }
    }
  }, [currentLocation, zoomLevel]);

  // Periodic map health check to maintain functionality
  useEffect(() => {
    const healthCheckInterval = setInterval(() => {
      if (mapRef.current && mapLoaded) {
        try {
          // Test basic map functionality
          const center = mapRef.current.getCenter();
          if (!center) {
            console.warn('Map lost center, triggering reload');
            setMapLoaded(false);
          }
        } catch (error) {
          console.warn('Map health check failed, triggering reload:', error);
          setMapLoaded(false);
        }
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(healthCheckInterval);
  }, [mapLoaded]);

  const handleZoomIn = () => {
    const newZoom = Math.min(zoomLevel + 1, 18);
    setZoomLevel(newZoom);
    if (mapRef.current) {
      try {
        mapRef.current.setZoom(newZoom);
      } catch (error) {
        console.warn('Error zooming in:', error);
        setMapLoaded(false);
      }
    }
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(zoomLevel - 1, 8);
    setZoomLevel(newZoom);
    if (mapRef.current) {
      try {
        mapRef.current.setZoom(newZoom);
      } catch (error) {
        console.warn('Error zooming out:', error);
        setMapLoaded(false);
      }
    }
  };

  const handleRecenter = () => {
    if (currentLocation && mapRef.current) {
      try {
        mapRef.current.setView([currentLocation.lat, currentLocation.lng], zoomLevel);
        setShowLocationDetails(!showLocationDetails);
      } catch (error) {
        console.warn('Error recentering map:', error);
        setMapLoaded(false);
      }
    }
  };

  const handleAnalyzeLocation = () => {
    if (currentLocation) {
      navigate(`/location-analysis?lat=${currentLocation.lat}&lng=${currentLocation.lng}`);
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
          <Button
            size="icon"
            variant="secondary"
            className="w-10 h-10 rounded-lg shadow-md hover:bg-white"
            onClick={handleAnalyzeLocation}
            disabled={!currentLocation}
            title="Analyze this location"
          >
            <Search className="w-4 h-4" />
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
