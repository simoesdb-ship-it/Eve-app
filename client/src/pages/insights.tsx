import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";


import BottomNavigation from "@/components/bottom-navigation";
import { getUserDisplayName } from "@/lib/username-generator";
import { getConsistentUserId } from "@/lib/device-fingerprint";
import { 
  TrendingUp, 
  Users, 
  MapPin, 
  Clock, 
  Vote, 
  Target, 
  Activity,
  BarChart3,
  Globe,
  Zap,
  CheckCircle,
  AlertCircle,
  Eye,
  MessageSquare,
  Share2,
  ChevronDown

} from "lucide-react";

function getSessionId(): string {
  const stored = localStorage.getItem('session_id');
  if (stored) return stored;
  
  const newSessionId = `anon_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`;
  localStorage.setItem('session_id', newSessionId);
  return newSessionId;
}

export default function InsightsPage() {
  const [sessionId] = useState(getSessionId());
  const [username, setUsername] = useState<string>('');
  const [persistentUserId, setPersistentUserId] = useState<string>('');
  const [showAllLocations, setShowAllLocations] = useState(false);
  const [isHighlightsCollapsed, setIsHighlightsCollapsed] = useState(false);
  
  // Load username and persistent user ID
  useEffect(() => {
    async function loadUserData() {
      try {
        const userId = await getConsistentUserId();
        const displayName = getUserDisplayName(userId);
        setUsername(displayName);
        setPersistentUserId(userId);
      } catch (error) {
        console.error('Failed to generate username:', error);
        setUsername('Anonymous');
      }
    }
    loadUserData();
  }, []);

  // Fetch user stats using persistent user ID
  const { data: stats } = useQuery({
    queryKey: ['/api/stats', persistentUserId],
    queryFn: async () => {
      if (!persistentUserId) return null;
      const response = await fetch(`/api/stats?userId=${persistentUserId}`);
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    },
    enabled: !!persistentUserId
  });

  // Fetch recent activity using persistent user ID
  const { data: activity = [] } = useQuery({
    queryKey: ['/api/activity', persistentUserId],
    queryFn: async () => {
      if (!persistentUserId) return [];
      const response = await fetch(`/api/activity?userId=${persistentUserId}`);
      if (!response.ok) throw new Error('Failed to fetch activity');
      return response.json();
    },
    enabled: !!persistentUserId
  });

  // Fetch community analysis
  const { data: communityData } = useQuery({
    queryKey: ['/api/community/analysis'],
    queryFn: async () => {
      const response = await fetch('/api/community/analysis');
      if (!response.ok) throw new Error('Failed to fetch community data');
      return response.json();
    }
  });

  // Fetch tracking points for personal insights
  const { data: trackingPoints = [] } = useQuery({
    queryKey: ['/api/tracking', sessionId],
    queryFn: async () => {
      const response = await fetch(`/api/tracking/${sessionId}`);
      if (!response.ok) throw new Error('Failed to fetch tracking data');
      return response.json();
    }
  });

  // Fetch saved locations using persistent user ID
  const { data: savedLocations = [] } = useQuery({
    queryKey: ['/api/saved-locations', persistentUserId],
    queryFn: async () => {
      if (!persistentUserId) return [];
      const response = await fetch(`/api/saved-locations?userId=${persistentUserId}`);
      if (!response.ok) throw new Error('Failed to fetch saved locations');
      return response.json();
    },
    enabled: !!persistentUserId
  });

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'pattern_suggestion': return <Target className="w-4 h-4" />;
      case 'vote': return <Vote className="w-4 h-4" />;
      case 'location_visit': return <MapPin className="w-4 h-4" />;
      case 'community_analysis': return <Users className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const formatActivityType = (type: string) => {
    if (!type) return 'Unknown Activity';
    
    switch (type) {
      case 'pattern_suggestion': return 'Pattern Suggested';
      case 'vote': return 'Vote Cast';
      case 'location_visit': return 'Location Visit';
      case 'community_analysis': return 'Community Analysis';
      default: return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-neutral-50">
      {/* Status Bar */}
      <div className="safe-area-top bg-primary text-white px-4 py-1 text-sm">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-secondary rounded-full animate-pulse"></div>
          <span>{username || 'Loading...'}</span>
        </div>
      </div>

      {/* App Header */}
      <header className="bg-transparent px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">E</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-neutral-800">Insights</h1>
              <p className="text-xs text-neutral-400">Community & Personal Analytics</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-4 pb-24">
        <Tabs defaultValue="personal" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="personal" className="flex items-center space-x-2">
              <Activity className="w-4 h-4" />
              <span>Personal</span>
            </TabsTrigger>
            <TabsTrigger value="community" className="flex items-center space-x-2">
              <Users className="w-4 h-4" />
              <span>Community</span>
            </TabsTrigger>
          </TabsList>

          {/* PERSONAL INSIGHTS TAB */}
          <TabsContent value="personal" className="space-y-4">
            {/* Personal Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Link href="/patterns-suggested-info">
                <Card className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <CardContent className="p-3 text-center">
                    <Target className="w-6 h-6 mx-auto mb-1 text-primary" />
                    <div className="text-xl font-bold">{stats?.suggestedPatterns || 0}</div>
                    <div className="text-xs text-muted-foreground leading-tight">Patterns Suggested</div>
                  </CardContent>
                </Card>
              </Link>
              <Link href="/votes-cast-info">
                <Card className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <CardContent className="p-3 text-center">
                    <Vote className="w-6 h-6 mx-auto mb-1 text-primary" />
                    <div className="text-xl font-bold">{stats?.votesContributed || 0}</div>
                    <div className="text-xs text-muted-foreground leading-tight">Votes Cast</div>
                  </CardContent>
                </Card>
              </Link>
              <Link href="/locations-tracked-info">
                <Card className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <CardContent className="p-3 text-center">
                    <MapPin className="w-6 h-6 mx-auto mb-1 text-primary" />
                    <div className="text-xl font-bold">{stats?.locationsTracked || 0}</div>
                    <div className="text-xs text-muted-foreground leading-tight">Locations Tracked</div>
                  </CardContent>
                </Card>
              </Link>
              <Link href="/hours-contributed-info">
                <Card className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <CardContent className="p-3 text-center">
                    <Clock className="w-6 h-6 mx-auto mb-1 text-primary" />
                    <div className="text-xl font-bold">{stats?.hoursContributed || 0}</div>
                    <div className="text-xs text-muted-foreground leading-tight text-center">Hours Contributed</div>
                  </CardContent>
                </Card>
              </Link>
            </div>

            {/* Personal Activity Feed */}
            <Card>
              <CardHeader>
                <div className="text-left">
                  <CardTitle>Your Recent Activity</CardTitle>
                  <CardDescription>Track your contributions and interactions</CardDescription>
                </div>
              </CardHeader>
                  <CardContent>
                    {activity.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Activity className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p>No activity yet. Start exploring locations to see your contributions here!</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Activity Summary */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg text-center">
                            <div className="text-lg font-bold text-primary">
                              {activity.filter((item: any) => (item.type || item.activityType) === 'visit').length}
                            </div>
                            <div className="text-xs text-muted-foreground">Location Visits</div>
                          </div>
                          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg text-center">
                            <div className="text-lg font-bold text-primary">
                              {activity.filter((item: any) => (item.type || item.activityType) === 'pattern_suggestion').length}
                            </div>
                            <div className="text-xs text-muted-foreground">Pattern Suggestions</div>
                          </div>
                          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg text-center">
                            <div className="text-lg font-bold text-primary">
                              {activity.filter((item: any) => (item.type || item.activityType) === 'vote').length}
                            </div>
                            <div className="text-xs text-muted-foreground">Votes Cast</div>
                          </div>
                          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg text-center">
                            <div className="text-lg font-bold text-primary">
                              {(() => {
                                const today = new Date();
                                const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                                return activity.filter((item: any) => 
                                  new Date(item.createdAt) >= sevenDaysAgo
                                ).length;
                              })()}
                            </div>
                            <div className="text-xs text-muted-foreground">This Week</div>
                          </div>
                        </div>

                        {/* Recent Activity Highlights */}
                        <Collapsible open={!isHighlightsCollapsed} onOpenChange={(open) => setIsHighlightsCollapsed(!open)}>
                          <CollapsibleTrigger asChild>
                            <div className="flex items-center justify-between cursor-pointer py-2">
                              <h4 className="text-sm font-medium text-muted-foreground">Recent Highlights</h4>
                              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isHighlightsCollapsed ? 'rotate-0' : 'rotate-180'}`} />
                            </div>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="space-y-2">
                              {activity.slice(0, 3).map((item: any, index: number) => (
                                <div key={index} className="flex items-center space-x-3 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                  <div className="flex-shrink-0 w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                                    {getActivityIcon(item.activityType)}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                      <p className="text-sm font-medium">{formatActivityType(item.type || item.activityType)}</p>
                                      <span className="text-xs text-muted-foreground">
                                        {new Date(item.createdAt).toLocaleDateString()}
                                      </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      </div>
                    )}
                  </CardContent>
              </Card>

            {/* Saved Locations */}
            <Card>
              <CardHeader>
                <div className="text-left">
                  <CardTitle>Your Saved Locations</CardTitle>
                  <CardDescription>Places you've bookmarked for future analysis</CardDescription>
                </div>
              </CardHeader>
                  <CardContent>
                    {savedLocations.length === 0 ? (
                      <div className="text-center py-6 text-muted-foreground">
                        <MapPin className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                        <p>No saved locations yet</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Saved Locations Summary */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg text-center">
                            <div className="text-lg font-bold text-primary">
                              {savedLocations.length}
                            </div>
                            <div className="text-xs text-muted-foreground">Total Saved</div>
                          </div>
                          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg text-center">
                            <div className="text-lg font-bold text-primary">
                              {(() => {
                                const today = new Date();
                                const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                                return savedLocations.filter((location: any) => 
                                  new Date(location.createdAt) >= oneWeekAgo
                                ).length;
                              })()}
                            </div>
                            <div className="text-xs text-muted-foreground">This Week</div>
                          </div>
                          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg text-center">
                            <div className="text-lg font-bold text-primary">
                              {savedLocations.filter((location: any) => location.name && location.name !== 'Unknown Location').length}
                            </div>
                            <div className="text-xs text-muted-foreground">Named Places</div>
                          </div>
                          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg text-center">
                            <div className="text-lg font-bold text-primary">
                              {(() => {
                                const today = new Date();
                                const oneMonthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
                                return savedLocations.filter((location: any) => 
                                  new Date(location.createdAt) >= oneMonthAgo
                                ).length;
                              })()}
                            </div>
                            <div className="text-xs text-muted-foreground">This Month</div>
                          </div>
                        </div>

                        {/* All Saved Locations - Expandable */}
                        <div className="space-y-2">
                          <button 
                            onClick={() => setShowAllLocations(!showAllLocations)}
                            className="flex items-center justify-between w-full p-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
                          >
                            <h4 className="text-sm font-medium text-muted-foreground">
                              All Saved Locations ({savedLocations.length})
                            </h4>
                            <ChevronDown className={`w-4 h-4 transition-transform ${showAllLocations ? 'rotate-180' : ''}`} />
                          </button>
                          
                          {showAllLocations && (
                            <div className="max-h-96 overflow-y-auto space-y-2 border rounded-lg p-2 bg-gray-50/50 dark:bg-gray-800/50">
                              {savedLocations.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-4">No saved locations yet</p>
                              ) : (
                                savedLocations.map((location: any) => (
                                  <div key={location.id} className="flex items-center space-x-3 p-2 bg-white dark:bg-gray-900 rounded-lg shadow-sm">
                                    <div className="flex-shrink-0 w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                                      <MapPin className="w-3 h-3 text-primary" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center justify-between">
                                        <p className="text-sm font-medium truncate">{location.name || 'Unknown Location'}</p>
                                        <span className="text-xs text-muted-foreground">
                                          {new Date(location.createdAt).toLocaleDateString()}
                                        </span>
                                      </div>
                                      <p className="text-xs text-muted-foreground font-mono">
                                        {location.latitude && location.longitude ? 
                                          `${parseFloat(location.latitude).toFixed(4)}, ${parseFloat(location.longitude).toFixed(4)}` : 
                                          'Coordinates unavailable'
                                        }
                                      </p>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
              </Card>
          </TabsContent>

          {/* COMMUNITY INSIGHTS TAB */}
          <TabsContent value="community" className="space-y-4">
            {/* Community Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Community Analysis</CardTitle>
                <CardDescription>
                  Collective insights from community spatial data and pattern analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <Globe className="w-8 h-8 mx-auto mb-2 text-primary" />
                    <div className="text-2xl font-bold">{communityData?.totalCommunities || 0}</div>
                    <div className="text-sm text-muted-foreground">Communities Detected</div>
                  </div>
                  <div className="text-center">
                    <Users className="w-8 h-8 mx-auto mb-2 text-primary" />
                    <div className="text-2xl font-bold">{communityData?.activeUsers || 0}</div>
                    <div className="text-sm text-muted-foreground">Active Users</div>
                  </div>
                  <div className="text-center">
                    <BarChart3 className="w-8 h-8 mx-auto mb-2 text-primary" />
                    <div className="text-2xl font-bold">
                      {communityData?.averageAdherence ? 
                        Math.round(communityData.averageAdherence * 100) : 0}%
                    </div>
                    <div className="text-sm text-muted-foreground">Pattern Adherence</div>
                  </div>
                  <div className="text-center">
                    <Zap className="w-8 h-8 mx-auto mb-2 text-primary" />
                    <div className="text-2xl font-bold">{communityData?.totalAnalyses || 0}</div>
                    <div className="text-sm text-muted-foreground">Analyses Run</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Community Pattern Insights */}
            <Card>
              <CardHeader>
                <CardTitle>Pattern Conformance Analysis</CardTitle>
                <CardDescription>
                  How well detected communities align with Alexander's patterns
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {communityData?.patternAnalyses?.slice(0, 5).map((analysis: any, index: number) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-semibold">Pattern {analysis.patternNumber}: {analysis.patternName}</h4>
                          <p className="text-sm text-muted-foreground mt-1">{analysis.description}</p>
                        </div>
                        <Badge variant={analysis.adherence > 0.7 ? "default" : analysis.adherence > 0.4 ? "secondary" : "destructive"}>
                          {Math.round(analysis.adherence * 100)}% match
                        </Badge>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2 text-sm">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span className="text-green-700">
                            {analysis.conformingCommunities} communities conforming
                          </span>
                        </div>
                        {analysis.recommendations?.length > 0 && (
                          <div className="flex items-start space-x-2 text-sm">
                            <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5" />
                            <span className="text-amber-700">
                              {analysis.recommendations[0]}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )) || (
                    <div className="text-center py-8 text-muted-foreground">
                      <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>No community analysis data available yet</p>
                      <p className="text-sm mt-2">Community insights will appear as more users contribute data</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Community Activity Stream */}
            <Card>
              <CardHeader>
                <CardTitle>Community Activity Stream</CardTitle>
                <CardDescription>Recent contributions from all users</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {activity.slice(0, 8).map((item: any, index: number) => (
                    <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        {getActivityIcon(item.activityType)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{item.username || 'Anonymous User'}</span>
                            <span className="text-sm text-muted-foreground">
                              {formatActivityType(item.activityType)}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(item.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                      </div>
                    </div>
                  ))}
                  {activity.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>No community activity yet</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Community Insights Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Community Actions</CardTitle>
                <CardDescription>Contribute to community analysis and insights</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button className="flex items-center space-x-2 h-12">
                    <BarChart3 className="w-4 h-4" />
                    <span>Run Community Analysis</span>
                  </Button>
                  <Button variant="outline" className="flex items-center space-x-2 h-12">
                    <Share2 className="w-4 h-4" />
                    <span>Share Insights</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <BottomNavigation activeTab="insights" />
    </div>
  );
}