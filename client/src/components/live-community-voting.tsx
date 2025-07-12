import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  ThumbsUp, 
  ThumbsDown, 
  Users, 
  Clock, 
  MapPin,
  Vote,
  TrendingUp,
  Activity,
  CheckCircle,
  Timer
} from "lucide-react";
import type { PatternWithVotes } from "@shared/schema";

interface LiveCommunityVotingProps {
  sessionId: string;
  currentLocation?: { lat: number; lng: number; locationId?: number } | null;
  onVoteSuccess?: (patternId: number, voteType: 'up' | 'down') => void;
}

interface VotingEligibility {
  canVote: boolean;
  totalWeight: number;
  baseTimeMinutes: number;
  eligibilityReason: string;
  movementBreakdown: Array<{
    movementType: string;
    timeSpentMinutes: number;
    weight: number;
    description: string;
  }>;
  weightComponents: {
    timeWeight: number;
    movementWeight: number;
    qualityBonus: number;
  };
}

interface ActiveVotingPattern extends PatternWithVotes {
  currentVotes: number;
  recentVoteActivity: Array<{
    voteType: 'up' | 'down';
    weight: number;
    timeAgo: string;
    movementType: string;
  }>;
  votingTrend: 'rising' | 'falling' | 'stable';
  communityEngagement: number; // 0-1 score
}

export default function LiveCommunityVoting({ sessionId, currentLocation, onVoteSuccess }: LiveCommunityVotingProps) {
  const [selectedPattern, setSelectedPattern] = useState<ActiveVotingPattern | null>(null);
  const [votingEligibility, setVotingEligibility] = useState<VotingEligibility | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Get voting eligibility for current location
  const { data: eligibilityData, refetch: refetchEligibility } = useQuery({
    queryKey: ['/api/voting/eligibility', sessionId, currentLocation?.locationId],
    enabled: !!currentLocation?.locationId && !!sessionId,
    queryFn: async () => {
      const response = await fetch(
        `/api/voting/eligibility?sessionId=${sessionId}&locationId=${currentLocation?.locationId}`
      );
      if (!response.ok) throw new Error('Failed to fetch voting eligibility');
      return response.json() as VotingEligibility;
    },
    refetchInterval: 30000, // Update eligibility every 30 seconds
  });

  // Get active voting patterns for current location
  const { data: activePatterns = [], isLoading: patternsLoading, refetch: refetchPatterns } = useQuery({
    queryKey: ['/api/voting/active-patterns', currentLocation?.locationId],
    enabled: !!currentLocation?.locationId,
    queryFn: async () => {
      const response = await fetch(
        `/api/voting/active-patterns?locationId=${currentLocation?.locationId}`
      );
      if (!response.ok) throw new Error('Failed to fetch active patterns');
      return response.json() as ActiveVotingPattern[];
    },
    refetchInterval: 15000, // Refresh active patterns every 15 seconds
  });

  // Get live voting activity feed
  const { data: recentActivity = [] } = useQuery({
    queryKey: ['/api/voting/recent-activity', currentLocation?.locationId],
    enabled: !!currentLocation?.locationId,
    queryFn: async () => {
      const response = await fetch(
        `/api/voting/recent-activity?locationId=${currentLocation?.locationId}&limit=10`
      );
      if (!response.ok) throw new Error('Failed to fetch recent activity');
      return response.json();
    },
    refetchInterval: 10000, // Update activity feed every 10 seconds
  });

  // Cast vote mutation
  const voteMutation = useMutation({
    mutationFn: async ({ suggestionId, voteType }: { suggestionId: number; voteType: 'up' | 'down' }) => {
      return apiRequest('POST', '/api/votes', {
        suggestionId,
        sessionId,
        voteType,
        locationId: currentLocation?.locationId
      });
    },
    onSuccess: (data, variables) => {
      toast({
        title: "Vote Cast Successfully",
        description: `Your ${variables.voteType === 'up' ? 'support' : 'opposition'} vote was recorded with ${data.weight.toFixed(2)}x weight`,
      });

      // Refresh voting data
      refetchPatterns();
      refetchEligibility();
      queryClient.invalidateQueries({ queryKey: ['/api/voting/recent-activity'] });
      
      // Notify parent component
      onVoteSuccess?.(selectedPattern?.id || 0, variables.voteType);
      
      // Clear selection
      setSelectedPattern(null);
    },
    onError: (error: any) => {
      toast({
        title: "Voting Error",
        description: error.message || "Failed to cast vote. Please check your eligibility.",
        variant: "destructive",
      });
    },
  });

  // Update eligibility when data changes
  useEffect(() => {
    if (eligibilityData) {
      setVotingEligibility(eligibilityData);
    }
  }, [eligibilityData]);

  const handleVote = (pattern: ActiveVotingPattern, voteType: 'up' | 'down') => {
    if (!votingEligibility?.canVote) {
      toast({
        title: "Voting Not Available",
        description: votingEligibility?.eligibilityReason || "You need to spend more time at this location to vote",
        variant: "destructive",
      });
      return;
    }

    setSelectedPattern(pattern);
    voteMutation.mutate({ suggestionId: pattern.suggestionId, voteType });
  };

  const getVotingTrendIcon = (trend: string) => {
    switch (trend) {
      case 'rising': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'falling': return <TrendingUp className="h-4 w-4 text-red-600 rotate-180" />;
      default: return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getEngagementColor = (engagement: number) => {
    if (engagement >= 0.7) return "bg-green-100 text-green-800 border-green-200";
    if (engagement >= 0.4) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    return "bg-gray-100 text-gray-800 border-gray-200";
  };

  const formatTimeAgo = (timeString: string) => {
    const time = new Date(timeString).getTime();
    const now = Date.now();
    const diffMinutes = Math.floor((now - time) / (1000 * 60));
    
    if (diffMinutes < 1) return 'just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
    return `${Math.floor(diffMinutes / 1440)}d ago`;
  };

  if (!currentLocation?.locationId) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <div className="text-muted-foreground">
            Save a location to participate in community voting
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Voting Eligibility Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Vote className="h-5 w-5" />
            Voting Eligibility
            {votingEligibility?.canVote && (
              <Badge variant="default" className="bg-green-600">
                <CheckCircle className="h-3 w-3 mr-1" />
                Eligible
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!votingEligibility ? (
            <div className="text-center text-muted-foreground">
              Checking voting eligibility...
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4 p-3 bg-muted rounded-lg">
                <div className="space-y-1">
                  <div className="text-sm font-medium">Vote Weight</div>
                  <div className="text-lg font-bold text-primary">
                    {votingEligibility.totalWeight.toFixed(2)}x
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Based on {votingEligibility.baseTimeMinutes.toFixed(1)} min at location
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-medium">Status</div>
                  <div className={`text-sm font-medium ${votingEligibility.canVote ? 'text-green-600' : 'text-red-600'}`}>
                    {votingEligibility.canVote ? 'Can Vote' : 'Ineligible'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {votingEligibility.eligibilityReason}
                  </div>
                </div>
              </div>

              {/* Movement Breakdown */}
              {votingEligibility.movementBreakdown.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium">Movement Analysis</div>
                  {votingEligibility.movementBreakdown
                    .filter(m => m.timeSpentMinutes > 0)
                    .map((movement, index) => (
                      <div key={index} className="flex justify-between items-center text-xs">
                        <span className="capitalize">{movement.movementType}</span>
                        <span>{movement.timeSpentMinutes.toFixed(1)}min • {movement.weight.toFixed(2)}x weight</span>
                      </div>
                    ))
                  }
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Voting Patterns */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Community Voting
            <Badge variant="outline">{activePatterns.length} active</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {patternsLoading ? (
            <div className="text-center py-4">
              <Activity className="h-6 w-6 mx-auto mb-2 animate-spin" />
              <div>Loading community patterns...</div>
            </div>
          ) : activePatterns.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              <Vote className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <div>No active voting patterns for this location</div>
            </div>
          ) : (
            <div className="space-y-3">
              {activePatterns.slice(0, 5).map((pattern) => (
                <div
                  key={pattern.id}
                  className="p-4 border rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono">
                        #{pattern.number}
                      </Badge>
                      <Badge className={getEngagementColor(pattern.communityEngagement)}>
                        {(pattern.communityEngagement * 100).toFixed(0)}% engaged
                      </Badge>
                      {getVotingTrendIcon(pattern.votingTrend)}
                    </div>
                    <div className="text-sm font-medium">
                      {pattern.currentVotes > 0 ? '+' : ''}{pattern.currentVotes} votes
                    </div>
                  </div>
                  
                  <h3 className="font-semibold text-sm mb-1">{pattern.name}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                    {pattern.description}
                  </p>

                  {/* Recent Activity */}
                  {pattern.recentVoteActivity.length > 0 && (
                    <div className="mb-3">
                      <div className="text-xs font-medium mb-1">Recent Activity</div>
                      <div className="space-y-1">
                        {pattern.recentVoteActivity.slice(0, 2).map((activity, index) => (
                          <div key={index} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1">
                              {activity.voteType === 'up' ? 
                                <ThumbsUp className="h-3 w-3 text-green-600" /> : 
                                <ThumbsDown className="h-3 w-3 text-red-600" />
                              }
                              <span className="capitalize">{activity.movementType}</span>
                              <span>• {activity.weight.toFixed(1)}x</span>
                            </div>
                            <span className="text-muted-foreground">{activity.timeAgo}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Voting Actions */}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleVote(pattern, 'up')}
                      disabled={!votingEligibility?.canVote || voteMutation.isPending}
                      className="flex items-center gap-1 text-green-600 hover:text-green-700"
                    >
                      <ThumbsUp className="h-3 w-3" />
                      Support
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleVote(pattern, 'down')}
                      disabled={!votingEligibility?.canVote || voteMutation.isPending}
                      className="flex items-center gap-1 text-red-600 hover:text-red-700"
                    >
                      <ThumbsDown className="h-3 w-3" />
                      Oppose
                    </Button>
                  </div>
                </div>
              ))}

              {activePatterns.length > 5 && (
                <div className="text-center pt-2">
                  <div className="text-sm text-muted-foreground">
                    +{activePatterns.length - 5} more patterns available for voting
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Live Activity Feed */}
      {recentActivity.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Live Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentActivity.slice(0, 5).map((activity: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-2 bg-muted rounded text-sm">
                  <div className="flex items-center gap-2">
                    {activity.type === 'vote_up' ? 
                      <ThumbsUp className="h-4 w-4 text-green-600" /> : 
                      <ThumbsDown className="h-4 w-4 text-red-600" />
                    }
                    <span>Pattern #{activity.patternNumber}</span>
                    <Badge variant="outline" className="text-xs">
                      {activity.weight?.toFixed(1)}x
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatTimeAgo(activity.timestamp)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}