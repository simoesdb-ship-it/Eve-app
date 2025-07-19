import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ArrowLeft, Clock, Timer, Award, Users, MapPin, ChevronDown, BarChart3 } from "lucide-react";
import { getConsistentUserId } from "@/lib/device-fingerprint";

export default function HoursContributedInfo() {
  const [, setLocation] = useLocation();
  const [userId, setUserId] = useState<string>('');
  const [showBreakdown, setShowBreakdown] = useState(false);

  useEffect(() => {
    async function loadUserId() {
      const deviceId = await getConsistentUserId();
      setUserId(deviceId);
    }
    loadUserId();
  }, []);

  // Fetch location time breakdown
  const { data: locationBreakdown = [], isLoading } = useQuery({
    queryKey: ['/api/location-time-breakdown', userId],
    queryFn: async () => {
      if (!userId) return [];
      const response = await fetch(`/api/location-time-breakdown/${userId}`);
      if (!response.ok) throw new Error('Failed to fetch location breakdown');
      return response.json();
    },
    enabled: !!userId
  });

  const totalHoursFromBreakdown = locationBreakdown.reduce((sum: number, location: any) => sum + location.totalHours, 0);
  const totalLocations = locationBreakdown.length;

  return (
    <div className="flex flex-col min-h-screen bg-neutral-50">
      {/* Status Bar */}
      <div className="safe-area-top bg-primary text-white px-4 py-1 text-sm">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-secondary rounded-full animate-pulse"></div>
          <span>Hours Contributed Explained</span>
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
              <Clock className="text-white w-4 h-4" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-neutral-800">Hours Contributed</h1>
              <p className="text-xs text-neutral-400">Time-based participation</p>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 px-4 py-4 pb-24 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Timer className="w-5 h-5 text-primary" />
              <span>Time Accumulation</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-neutral-600">
              The app tracks how much time you spend at different locations, accumulating hours of real-world experience with architectural patterns.
            </p>
            <p className="text-sm text-neutral-600">
              Time spent at each location increases your voting weight for that place, ensuring decisions are made by people who truly know the area.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Award className="w-5 h-5 text-primary" />
              <span>Quality Participation</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-neutral-600">
              Hours contributed represent your investment in understanding places deeply, rather than making quick judgments.
            </p>
            <p className="text-sm text-neutral-600">
              This time-based approach ensures that pattern validation is based on genuine familiarity with locations.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-primary" />
              <span>Community Value</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-neutral-600">
              Your contributed hours help build a robust dataset of human spatial experience, valuable for urban planning and design.
            </p>
            <p className="text-sm text-neutral-600">
              The more hours the community contributes collectively, the more reliable and comprehensive the pattern analysis becomes.
            </p>
          </CardContent>
        </Card>

        {/* Location Time Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              <span>Time Breakdown by Location</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg text-center">
                <div className="text-lg font-bold text-primary">
                  {totalHoursFromBreakdown.toFixed(1)}h
                </div>
                <div className="text-xs text-muted-foreground">Total Hours</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg text-center">
                <div className="text-lg font-bold text-primary">
                  {totalLocations}
                </div>
                <div className="text-xs text-muted-foreground">Locations</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg text-center">
                <div className="text-lg font-bold text-primary">
                  {locationBreakdown.reduce((sum: number, loc: any) => sum + loc.visitCount, 0)}
                </div>
                <div className="text-xs text-muted-foreground">Total Visits</div>
              </div>
            </div>

            {/* Expandable Breakdown */}
            <Collapsible open={showBreakdown} onOpenChange={setShowBreakdown}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  <span>Detailed Location Breakdown</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showBreakdown ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-4">
                  {isLoading ? (
                    <div className="text-center py-4 text-muted-foreground">
                      Loading location breakdown...
                    </div>
                  ) : locationBreakdown.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No time tracking data available yet</p>
                      <p className="text-xs">Start exploring locations to see your time breakdown</p>
                    </div>
                  ) : (
                    <ScrollArea className="h-64">
                      <div className="space-y-3">
                        {locationBreakdown.map((location: any, index: number) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 rounded-lg border">
                            <div className="flex items-center space-x-3 flex-1 min-w-0">
                              <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                                <MapPin className="w-4 h-4 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {location.locationName}
                                </p>
                                <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                                  <span>{location.visitCount} visits</span>
                                  <span>•</span>
                                  <span>
                                    {new Date(location.firstVisit).toLocaleDateString()} - {new Date(location.lastVisit).toLocaleDateString()}
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground font-mono">
                                  {location.coordinates.latitude.toFixed(4)}, {location.coordinates.longitude.toFixed(4)}
                                </p>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <div className="text-sm font-bold text-primary">
                                {location.totalHours.toFixed(1)}h
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {location.totalMinutes}m total
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>

            <div className="text-xs text-muted-foreground bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
              <strong>How it works:</strong> Time is calculated by analyzing GPS tracking points. 
              Locations within 50m are grouped together, and time gaps longer than 30 minutes 
              are considered separate visits. Only locations with 5+ minutes are included.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}