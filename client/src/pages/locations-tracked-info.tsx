import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MapPin, Navigation, Shield, Database } from "lucide-react";

export default function LocationsTrackedInfo() {
  const [, setLocation] = useLocation();

  return (
    <div className="flex flex-col min-h-screen bg-neutral-50">
      {/* Status Bar */}
      <div className="safe-area-top bg-primary text-white px-4 py-1 text-sm">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-secondary rounded-full animate-pulse"></div>
          <span>Locations Tracked Explained</span>
        </div>
      </div>

      {/* Header */}
      <header className="bg-transparent px-4 py-3">
        <div className="flex items-center space-x-3">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setLocation("/insights")}
            className="p-2"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <MapPin className="text-white w-4 h-4" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-neutral-800">Locations Tracked</h1>
              <p className="text-xs text-neutral-400">Spatial data collection</p>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 px-4 py-4 pb-24 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Navigation className="w-5 h-5 text-primary" />
              <span>GPS Tracking</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-neutral-600">
              The app continuously tracks your location to understand movement patterns and spatial relationships between different places.
            </p>
            <p className="text-sm text-neutral-600">
              Each unique location you visit is recorded and becomes available for pattern analysis and community contribution.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Database className="w-5 h-5 text-primary" />
              <span>Spatial Intelligence</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-neutral-600">
              Your location data helps build a comprehensive map of architectural patterns across different geographical areas.
            </p>
            <p className="text-sm text-neutral-600">
              The system clusters nearby coordinates to identify distinct locations and understand spatial relationships between patterns.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="w-5 h-5 text-primary" />
              <span>Privacy & Anonymity</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-neutral-600">
              All location data is anonymized and tied only to your device fingerprint, not your personal identity.
            </p>
            <p className="text-sm text-neutral-600">
              Your tracked locations contribute to collective spatial intelligence while maintaining complete privacy protection.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}