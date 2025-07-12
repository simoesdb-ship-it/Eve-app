import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Clock, TrendingUp, Car, Bike, Footprints, Square, Users } from "lucide-react";

interface WeightedVotingEligibility {
  canVote: boolean;
  totalWeight: number;
  baseTimeMinutes: number;
  movementBreakdown: Array<{
    movementType: 'walking' | 'biking' | 'driving' | 'stationary' | 'transit';
    timeSpentMinutes: number;
    averageSpeed: number;
    distanceCovered: number;
    weightFactor: number;
  }>;
  weightComponents: {
    timeWeight: number;
    movementBonus: number;
    engagementBonus: number;
    diversityBonus: number;
  };
  eligibilityReason: string;
}

interface VotingStats {
  totalVotes: number;
  totalWeight: number;
  upvotes: number;
  downvotes: number;
  averageWeight: number;
  movementBreakdown: Record<string, number>;
  topContributors: Array<{
    sessionId: string;
    weight: number;
    movementTypes: string[];
  }>;
}

export default function WeightedVotingDemo() {
  const { toast } = useToast();
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);
  const [sessionId] = useState(() => localStorage.getItem('sessionId') || 'demo_session');

  // Get voting-eligible locations
  const { data: eligibleLocations } = useQuery({
    queryKey: ["/api/voting-eligible-locations"],
    queryParams: { sessionId }
  });

  // Get weighted voting eligibility for selected location
  const { data: eligibility, isLoading: loadingEligibility } = useQuery({
    queryKey: ["/api/voting-eligibility", selectedLocationId],
    queryParams: { sessionId },
    enabled: !!selectedLocationId
  });

  // Get voting stats for demo suggestion
  const { data: votingStats } = useQuery({
    queryKey: ["/api/voting-stats", 1], // Demo suggestion ID
    enabled: !!selectedLocationId
  });

  // Cast weighted vote mutation
  const castVoteMutation = useMutation({
    mutationFn: async ({ voteType }: { voteType: 'up' | 'down' }) => {
      return apiRequest("POST", "/api/votes", {
        suggestionId: 1, // Demo suggestion
        sessionId,
        voteType,
        locationId: selectedLocationId
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Vote Cast Successfully",
        description: `Your vote weight: ${data.weight.toFixed(2)}x based on your movement patterns`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/voting-stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/voting-eligibility"] });
    },
    onError: (error: any) => {
      toast({
        title: "Voting Failed",
        description: error.message || "Could not cast vote",
        variant: "destructive",
      });
    },
  });

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'walking': return <Footprints className="h-4 w-4" />;
      case 'biking': return <Bike className="h-4 w-4" />;
      case 'driving': return <Car className="h-4 w-4" />;
      case 'stationary': return <Square className="h-4 w-4" />;
      default: return <TrendingUp className="h-4 w-4" />;
    }
  };

  const getMovementColor = (type: string) => {
    switch (type) {
      case 'walking': return 'bg-green-500';
      case 'biking': return 'bg-blue-500';
      case 'driving': return 'bg-orange-500';
      case 'stationary': return 'bg-gray-500';
      default: return 'bg-purple-500';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Weighted Voting System</h1>
        <p className="text-muted-foreground">
          Your voting power is determined by time spent at locations and movement patterns
        </p>
      </div>

      {/* Location Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Voting Eligible Locations
          </CardTitle>
          <CardDescription>
            Select a location where you've spent time to see your voting eligibility
          </CardDescription>
        </CardHeader>
        <CardContent>
          {eligibleLocations && eligibleLocations.length > 0 ? (
            <div className="grid gap-2">
              {eligibleLocations.slice(0, 5).map((location: any) => (
                <div
                  key={location.locationId}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedLocationId === location.locationId
                      ? 'border-primary bg-primary/5'
                      : 'hover:border-primary/50'
                  }`}
                  onClick={() => setSelectedLocationId(location.locationId)}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Location #{location.locationId}</span>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {location.timeSpentMinutes.toFixed(1)} minutes
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No voting eligible locations found.</p>
              <p className="text-sm">Move around and spend time at locations to gain voting rights.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Voting Eligibility Details */}
      {selectedLocationId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Voting Eligibility Analysis
            </CardTitle>
            <CardDescription>
              Location #{selectedLocationId} - Movement-based voting weight calculation
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingEligibility ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : eligibility ? (
              <div className="space-y-6">
                {/* Voting Eligibility Status */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">
                      {eligibility.canVote ? 'Eligible to Vote' : 'Not Eligible'}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {eligibility.eligibilityReason}
                    </p>
                  </div>
                  {eligibility.canVote && (
                    <Badge variant="default" className="text-lg px-4 py-2">
                      {eligibility.totalWeight.toFixed(2)}x Weight
                    </Badge>
                  )}
                </div>

                {eligibility.canVote && (
                  <>
                    {/* Weight Components Breakdown */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Time Weight</label>
                        <div className="flex items-center gap-2">
                          <Progress value={(eligibility.weightComponents.timeWeight / eligibility.totalWeight) * 100} className="flex-1" />
                          <span className="text-sm">{eligibility.weightComponents.timeWeight.toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Movement Bonus</label>
                        <div className="flex items-center gap-2">
                          <Progress value={(eligibility.weightComponents.movementBonus / eligibility.totalWeight) * 100} className="flex-1" />
                          <span className="text-sm">{eligibility.weightComponents.movementBonus.toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Engagement Bonus</label>
                        <div className="flex items-center gap-2">
                          <Progress value={(eligibility.weightComponents.engagementBonus / eligibility.totalWeight) * 100} className="flex-1" />
                          <span className="text-sm">{eligibility.weightComponents.engagementBonus.toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Diversity Bonus</label>
                        <div className="flex items-center gap-2">
                          <Progress value={(eligibility.weightComponents.diversityBonus / eligibility.totalWeight) * 100} className="flex-1" />
                          <span className="text-sm">{eligibility.weightComponents.diversityBonus.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Movement Pattern Analysis */}
                    <div>
                      <h4 className="font-medium mb-3">Movement Pattern Analysis</h4>
                      <div className="grid gap-3">
                        {eligibility.movementBreakdown.map((movement) => (
                          <div key={movement.movementType} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                            <div className="flex items-center gap-3">
                              {getMovementIcon(movement.movementType)}
                              <div>
                                <div className="font-medium capitalize">{movement.movementType}</div>
                                <div className="text-sm text-muted-foreground">
                                  {movement.timeSpentMinutes.toFixed(1)} minutes • {movement.averageSpeed.toFixed(1)} km/h
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-medium">{movement.weightFactor.toFixed(2)}x</div>
                              <div className="text-sm text-muted-foreground">
                                {movement.distanceCovered.toFixed(2)} km
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Voting Actions */}
                    <div className="flex gap-3 pt-4 border-t">
                      <Button
                        onClick={() => castVoteMutation.mutate({ voteType: 'up' })}
                        disabled={castVoteMutation.isPending}
                        className="flex-1"
                      >
                        Vote Up (Weight: {eligibility.totalWeight.toFixed(2)}x)
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => castVoteMutation.mutate({ voteType: 'down' })}
                        disabled={castVoteMutation.isPending}
                        className="flex-1"
                      >
                        Vote Down (Weight: {eligibility.totalWeight.toFixed(2)}x)
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No voting data available for this location.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Voting Statistics */}
      {votingStats && (
        <Card>
          <CardHeader>
            <CardTitle>Community Voting Statistics</CardTitle>
            <CardDescription>
              Aggregated voting data showing movement pattern influence
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold">{votingStats.totalVotes}</div>
                <div className="text-sm text-muted-foreground">Total Votes</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{votingStats.totalWeight.toFixed(1)}</div>
                <div className="text-sm text-muted-foreground">Total Weight</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{votingStats.averageWeight.toFixed(2)}</div>
                <div className="text-sm text-muted-foreground">Avg Weight</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {votingStats.upvotes}/{votingStats.downvotes}
                </div>
                <div className="text-sm text-muted-foreground">Up/Down</div>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-3">Movement Distribution</h4>
              <div className="space-y-2">
                {Object.entries(votingStats.movementBreakdown).map(([type, minutes]) => (
                  <div key={type} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getMovementIcon(type)}
                      <span className="capitalize">{type}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded ${getMovementColor(type)}`} />
                      <span>{(minutes as number).toFixed(1)} min</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}