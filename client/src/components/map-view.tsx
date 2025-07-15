import { useState, useEffect, useRef } from "react";
import { MapPin, Plus, Minus, Navigation, Crosshair, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLocation } from "wouter";
import { getMovementTracker } from "@/lib/movement-tracker";
import type { PatternWithVotes, SpatialPoint } from "@shared/schema";

// Cluster tracking points by proximity to show visit frequency
function clusterTrackingPoints(points: SpatialPoint[], radiusMeters = 20): Array<{
  latitude: string;
  longitude: string;
  count: number;
  latestTimestamp: string;
}> {
  const clusters: Array<{
    latitude: string;
    longitude: string;
    count: number;
    latestTimestamp: string;
    points: SpatialPoint[];
  }> = [];

  points.forEach(point => {
    const lat = Number(point.latitude);
    const lng = Number(point.longitude);
    
    // Find existing cluster within radius
    const existingCluster = clusters.find(cluster => {
      const clusterLat = Number(cluster.latitude);
      const clusterLng = Number(cluster.longitude);
      const distance = calculateDistance(lat, lng, clusterLat, clusterLng);
      return distance <= radiusMeters;
    });

    if (existingCluster) {
      // Add to existing cluster
      existingCluster.count++;
      existingCluster.points.push(point);
      // Update to latest timestamp
      if (new Date(point.createdAt) > new Date(existingCluster.latestTimestamp)) {
        existingCluster.latestTimestamp = point.createdAt.toISOString();
      }
    } else {
      // Create new cluster
      clusters.push({
        latitude: point.latitude,
        longitude: point.longitude,
        count: 1,
        latestTimestamp: point.createdAt.toISOString(),
        points: [point]
      });
    }
  });

  return clusters;
}

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

interface MapViewProps {
  currentLocation: {lat: number, lng: number} | null;
  patterns: PatternWithVotes[];
  onPatternSelect: (pattern: PatternWithVotes) => void;
  sessionId: string;
  onLocationUpdate?: (location: {lat: number, lng: number}) => void;
}

export default function MapView({ currentLocation, patterns, onPatternSelect, sessionId, onLocationUpdate }: MapViewProps) {
  const [zoomLevel, setZoomLevel] = useState(13);
  const [showLocationDetails, setShowLocationDetails] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [trackingPoints, setTrackingPoints] = useState<SpatialPoint[]>([]);
  const [isRecentering, setIsRecentering] = useState(false);
  const [hasInitialCentered, setHasInitialCentered] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [location, navigate] = useLocation();

  // App foreground refresh functionality
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && onLocationUpdate && navigator.geolocation) {
        // App came to foreground, try to refresh location with short timeout
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const newLocation = {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            };
            
            // Only update if location has changed significantly
            if (!currentLocation || 
                Math.abs(newLocation.lat - currentLocation.lat) > 0.0001 || 
                Math.abs(newLocation.lng - currentLocation.lng) > 0.0001) {
              onLocationUpdate(newLocation);
            }
          },
          (error) => {
            // Silently fail on foreground refresh - don't spam console
            // User can manually refresh with green button if needed
          },
          {
            enableHighAccuracy: false, // Use less accurate but faster positioning
            timeout: 3000, // Very short timeout for background refresh
            maximumAge: 30000 // Allow slightly cached location
          }
        );
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [onLocationUpdate, currentLocation]);

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
          center: currentLocation ? [currentLocation.lat, currentLocation.lng] : [44.9799652, -93.289345], // Minneapolis fallback
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

        // Add tracking points with clustering visualization for frequency analysis
        const clusteredPoints = clusterTrackingPoints(trackingPoints);
        
        clusteredPoints.forEach((cluster, index) => {
          if (cleanup) return;
          
          try {
            const lat = Number(cluster.latitude);
            const lng = Number(cluster.longitude);
            
            // Calculate visual prominence based on visit frequency
            const visitCount = cluster.count;
            const dotAge = Date.now() - new Date(cluster.latestTimestamp).getTime();
            const isRecent = dotAge < 3600000; // Less than 1 hour old
            
            // Size and color based on frequency and recency
            const baseSize = Math.min(4 + (visitCount * 2), 16); // 4px to 16px max
            const opacity = Math.min(0.6 + (visitCount * 0.1), 1.0);
            const color = visitCount > 3 ? '#EF4444' : // Red for high frequency
                         visitCount > 1 ? '#F59E0B' : // Orange for medium frequency  
                         isRecent ? '#10B981' : '#3B82F6'; // Green for recent, blue for old
            
            const trackingDot = L.marker([lat, lng], {
              icon: L.divIcon({
                className: 'custom-tracking-dot',
                html: `<div style="
                  width: ${baseSize}px; 
                  height: ${baseSize}px; 
                  background: ${color}; 
                  border: 2px solid white; 
                  border-radius: 50%; 
                  box-shadow: 0 3px 6px rgba(0,0,0,0.5);
                  opacity: ${opacity};
                  ${visitCount > 2 ? 'animation: pulse 2s infinite;' : ''}
                "></div>`,
                iconSize: [baseSize, baseSize],
                iconAnchor: [baseSize/2, baseSize/2]
              })
            }).addTo(map);

            // Enhanced tooltip with frequency information
            const timeAgo = Math.floor(dotAge / 60000);
            trackingDot.bindTooltip(`
              <strong>${visitCount > 1 ? `${visitCount} visits` : '1 visit'}</strong><br>
              Latest: ${new Date(cluster.latestTimestamp).toLocaleString()}<br>
              ${timeAgo < 60 ? `${timeAgo} minutes ago` : `${Math.floor(timeAgo / 60)} hours ago`}<br>
              Location: ${lat.toFixed(6)}, ${lng.toFixed(6)}
            `, {
              permanent: false,
              direction: 'top',
              className: 'tracking-tooltip'
            });
            
            markers.push(trackingDot);
          } catch (error) {
            console.warn('Failed to add tracking cluster:', error);
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

  // Update map when location changes, with special handling for first-time GPS centering
  useEffect(() => {
    if (mapRef.current && currentLocation) {
      try {
        // For first-time GPS acquisition, center with a slightly higher zoom level for better context
        if (!hasInitialCentered) {
          console.log(`Centering map on first GPS coordinates: ${currentLocation.lat.toFixed(6)}, ${currentLocation.lng.toFixed(6)}`);
          mapRef.current.setView([currentLocation.lat, currentLocation.lng], 15, {
            animate: true,
            duration: 1.0
          });
          setHasInitialCentered(true);
        } else {
          // Subsequent location updates use normal zoom level
          mapRef.current.setView([currentLocation.lat, currentLocation.lng], zoomLevel);
        }
      } catch (error) {
        console.warn('Error updating map view:', error);
        // Trigger map reload if update fails
        setMapLoaded(false);
      }
    }
  }, [currentLocation, zoomLevel, hasInitialCentered]);

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
    if (!mapRef.current) return;
    
    const newZoom = Math.min(zoomLevel + 1, 18);
    setZoomLevel(newZoom);
    
    try {
      mapRef.current.setZoom(newZoom);
    } catch (error) {
      console.warn('Error zooming in:', error);
      // Try alternative zoom method
      try {
        mapRef.current.setView(mapRef.current.getCenter(), newZoom);
      } catch (fallbackError) {
        console.warn('Fallback zoom failed:', fallbackError);
      }
    }
  };

  const handleZoomOut = () => {
    if (!mapRef.current) return;
    
    const newZoom = Math.max(zoomLevel - 1, 8);
    setZoomLevel(newZoom);
    
    try {
      mapRef.current.setZoom(newZoom);
    } catch (error) {
      console.warn('Error zooming out:', error);
      // Try alternative zoom method
      try {
        mapRef.current.setView(mapRef.current.getCenter(), newZoom);
      } catch (fallbackError) {
        console.warn('Fallback zoom failed:', fallbackError);
      }
    }
  };

  const handleRecenter = async () => {
    if (!mapRef.current) return;
    
    setIsRecentering(true);
    
    try {
      // If we have a current location, center immediately then try to refresh
      if (currentLocation) {
        mapRef.current.setView([currentLocation.lat, currentLocation.lng], Math.max(zoomLevel, 15));
        setShowLocationDetails(!showLocationDetails);
      }
      
      // Try to get fresh location in background
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const newLocation = {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            };
            
            // Only update if location has changed significantly (more than ~10 meters)
            if (!currentLocation || 
                Math.abs(newLocation.lat - currentLocation.lat) > 0.0001 || 
                Math.abs(newLocation.lng - currentLocation.lng) > 0.0001) {
              
              // Update map view to fresh location
              if (mapRef.current) {
                mapRef.current.setView([newLocation.lat, newLocation.lng], Math.max(zoomLevel, 15));
              }
              
              // Notify parent component of location update
              if (onLocationUpdate) {
                onLocationUpdate(newLocation);
              }
            }
            setIsRecentering(false);
          },
          (error) => {
            console.warn('Error refreshing location:', error);
            // If we don't have any location and can't get one, stay where we are
            if (!currentLocation) {
              console.warn('No location available and unable to acquire fresh location');
            }
            setIsRecentering(false);
          },
          {
            enableHighAccuracy: true,
            timeout: 8000, // Shorter timeout
            maximumAge: 0 // Force fresh location
          }
        );
      } else {
        setIsRecentering(false);
      }
    } catch (error) {
      console.warn('Error in recenter function:', error);
      setIsRecentering(false);
    }
  };

  const handleAnalyzeLocation = () => {
    if (!currentLocation) {
      console.warn('No location available for analysis');
      return;
    }
    
    try {
      const lat = currentLocation.lat.toFixed(6);
      const lng = currentLocation.lng.toFixed(6);
      navigate(`/location-analysis?lat=${lat}&lng=${lng}`);
    } catch (error) {
      console.warn('Error navigating to location analysis:', error);
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

        {/* Map status indicator */}
        <div className="absolute top-4 left-4 bg-black/70 text-white px-2 py-1 rounded text-xs z-[1000]">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${mapLoaded ? 'bg-green-400' : 'bg-red-400'}`}></div>
            <span>Zoom: {zoomLevel}</span>
            {currentLocation && (
              <span className="opacity-75">• Located</span>
            )}
          </div>
        </div>

        {/* Navigation controls */}
        <div className="absolute bottom-4 right-4 flex flex-col space-y-2 z-[1000]">
          <Button
            size="icon"
            variant="secondary"
            className="w-10 h-10 rounded-lg shadow-md hover:bg-white transition-all duration-200 hover:scale-105 active:scale-95"
            onClick={handleZoomIn}
            disabled={zoomLevel >= 18 || !mapLoaded}
            title="Zoom in"
          >
            <Plus className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="secondary"
            className="w-10 h-10 rounded-lg shadow-md hover:bg-white transition-all duration-200 hover:scale-105 active:scale-95"
            onClick={handleZoomOut}
            disabled={zoomLevel <= 8 || !mapLoaded}
            title="Zoom out"
          >
            <Minus className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="secondary"
            className={`w-10 h-10 rounded-lg shadow-md transition-all duration-200 hover:scale-105 active:scale-95 ${
              isRecentering 
                ? 'bg-green-200 border-green-300' 
                : 'bg-green-50 hover:bg-green-100 border-green-200'
            }`}
            onClick={handleRecenter}
            disabled={isRecentering}
            title={isRecentering ? "Getting location..." : "Center map on current location"}
          >
            <Crosshair className={`w-4 h-4 transition-all duration-200 ${
              isRecentering 
                ? 'text-green-700 animate-spin' 
                : 'text-green-600'
            }`} />
          </Button>
          <Button
            size="icon"
            variant="secondary"
            className="w-10 h-10 rounded-lg shadow-md hover:bg-white transition-all duration-200 hover:scale-105 active:scale-95"
            onClick={handleAnalyzeLocation}
            disabled={!currentLocation || !mapLoaded}
            title={currentLocation ? "Analyze this location" : "No location available"}
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
