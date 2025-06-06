import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Clock, MapPin, Vote, Users, CheckCircle, XCircle, Target } from "lucide-react";

interface TimeTrackingData {
  locationId: number;
  timeSpentMinutes: number;
  firstVisit: string;
  lastVisit: string;
  visitCount: number;
  averageSessionDuration: number;
  visitFrequency: number;
  interpolatedPoints: number;
}

interface VotingEligibility {
  canVote: boolean;
  weight: number;
  timeSpentMinutes: number;
  reason?: string;
}

interface LocationTimeTracking {
  timeTracking: TimeTrackingData;
  votingEligibility: VotingEligibility;
}

export default function TimeTrackingDemo() {
  const { data: eligibleLocations, isLoading: loadingEligible } = useQuery<TimeTrackingData[]>({
    queryKey: ["/api/voting-eligible-locations"],
  });

  const { data: userLocations, isLoading: loadingLocations } = useQuery<any[]>({
    queryKey: ["/api/locations"],
  });

  if (loadingEligible || loadingLocations) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Time Tracking & Voting System</h1>
          <p className="text-muted-foreground">Loading time tracking data...</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const totalVotingPower = eligibleLocations?.reduce((sum, loc) => sum + (loc.timeSpentMinutes * 0.1), 0) || 0;
  const totalTimeSpent = eligibleLocations?.reduce((sum, loc) => sum + loc.timeSpentMinutes, 0) || 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Time Tracking & Location-Based Voting</h1>
        <p className="text-muted-foreground">
          Your voting power is proportional to time spent at each location
        </p>
      </div>

      {/* Overall Summary */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Your Voting Influence Summary
          </CardTitle>
          <CardDescription>
            Based on tracked time at locations with coordinate interpolation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {eligibleLocations?.length || 0}
              </div>
              <div className="text-sm text-muted-foreground">Eligible Locations</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {Math.round(totalTimeSpent)} min
              </div>
              <div className="text-sm text-muted-foreground">Total Time Tracked</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {Math.round(totalVotingPower * 100) / 100}
              </div>
              <div className="text-sm text-muted-foreground">Total Voting Weight</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {userLocations?.length || 0}
              </div>
              <div className="text-sm text-muted-foreground">Total Locations</div>
            </div>
          </div>

          <Alert className="border-blue-200 bg-blue-50">
            <Target className="h-4 w-4 text-blue-600" />
            <AlertTitle className="text-blue-800">Coordinate Interpolation Active</AlertTitle>
            <AlertDescription className="text-blue-700">
              System clusters nearby tracking points (within 100m) and interpolates coordinates 
              to provide accurate time tracking even with GPS variations.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Tabs defaultValue="eligible" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="eligible">Voting Eligible Locations</TabsTrigger>
          <TabsTrigger value="all">All Tracked Locations</TabsTrigger>
        </TabsList>

        <TabsContent value="eligible" className="space-y-4">
          {eligibleLocations && eligibleLocations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {eligibleLocations.map((location, index) => (
                <LocationTimeCard key={location.locationId} location={location} index={index} />
              ))}
            </div>
          ) : (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertTitle>No Voting Eligible Locations</AlertTitle>
              <AlertDescription>
                Spend at least 5 minutes at a location to gain voting rights. 
                Your voting weight increases with time spent.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          {userLocations && userLocations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {userLocations.map((location, index) => (
                <AllLocationCard key={location.id} location={location} index={index} />
              ))}
            </div>
          ) : (
            <Alert>
              <MapPin className="h-4 w-4" />
              <AlertTitle>No Locations Tracked</AlertTitle>
              <AlertDescription>
                Start exploring locations to begin building your voting influence.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function LocationTimeCard({ location, index }: { location: TimeTrackingData; index: number }) {
  const votingWeight = 1.0 + (location.timeSpentMinutes * 0.1);
  const weightCapped = Math.min(votingWeight, 10.0);
  
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Location #{location.locationId}
          </span>
          <Badge variant="default" className="bg-green-100 text-green-800">
            {weightCapped.toFixed(2)}x weight
          </Badge>
        </CardTitle>
        <CardDescription>
          {location.timeSpentMinutes} minutes tracked • {location.visitCount} visits
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Avg Session:</span>
            <div className="font-medium">{location.averageSessionDuration} min</div>
          </div>
          <div>
            <span className="text-muted-foreground">Visit Frequency:</span>
            <div className="font-medium">{location.visitFrequency}/day</div>
          </div>
          <div>
            <span className="text-muted-foreground">First Visit:</span>
            <div className="font-medium">{new Date(location.firstVisit).toLocaleDateString()}</div>
          </div>
          <div>
            <span className="text-muted-foreground">Interpolated Points:</span>
            <div className="font-medium">{location.interpolatedPoints}</div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Voting Weight Progress</span>
            <span className="text-sm font-medium">{((weightCapped - 1) * 10).toFixed(0)}%</span>
          </div>
          <Progress value={(weightCapped - 1) * 10} className="h-2" />
        </div>

        {location.interpolatedPoints > 0 && (
          <Alert className="border-blue-200 bg-blue-50">
            <Target className="h-3 w-3 text-blue-600" />
            <AlertDescription className="text-xs text-blue-700">
              {location.interpolatedPoints} coordinates interpolated for clustering accuracy
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

function AllLocationCard({ location, index }: { location: any; index: number }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-blue-600" />
            Location #{location.id}
          </span>
          <Badge variant="outline">
            Tracked
          </Badge>
        </CardTitle>
        <CardDescription>
          {location.latitude}°, {location.longitude}°
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Session:</span>
            <div className="font-medium">{location.sessionId.substring(0, 8)}...</div>
          </div>
          <div>
            <span className="text-muted-foreground">Created:</span>
            <div className="font-medium">{new Date(location.createdAt).toLocaleDateString()}</div>
          </div>
        </div>

        <Alert className="border-gray-200 bg-gray-50">
          <Clock className="h-3 w-3 text-gray-600" />
          <AlertDescription className="text-xs text-gray-600">
            Visit this location longer to gain voting rights
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}