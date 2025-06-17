import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
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
  const [expandedSections, setExpandedSections] = useState({
    activity: false,
    savedLocations: false,
  });

  // Load username
  useEffect(() => {
    async function loadUsername() {
      try {
        const userId = await getConsistentUserId();
        const displayName = getUserDisplayName(userId);
        setUsername(displayName);
      } catch (error) {
        console.error('Failed to generate username:', error);
        setUsername('Anonymous');
      }
    }
    loadUsername();
  }, []);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Fetch user stats
  const { data: stats } = useQuery({
    queryKey: ['/api/stats', sessionId],
    queryFn: async () => {
      const response = await fetch(`/api/stats?sessionId=${sessionId}`);
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    }
  });

  // Fetch recent activity
  const { data: activity = [] } = useQuery({
    queryKey: ['/api/activity', sessionId],
    queryFn: async () => {
      const response = await fetch(`/api/activity?sessionId=${sessionId}`);
      if (!response.ok) throw new Error('Failed to fetch activity');
      return response.json();
    }
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

  // Fetch saved locations
  const { data: savedLocations = [] } = useQuery({
    queryKey: ['/api/saved-locations'],
    queryFn: async () => {
      const response = await fetch('/api/saved-locations');
      if (!response.ok) throw new Error('Failed to fetch saved locations');
      return response.json();
    }
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

      <div className="max-w-4xl mx-auto p-4">
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <Target className="w-8 h-8 mx-auto mb-2 text-primary" />
                  <div className="text-2xl font-bold">{stats?.suggestedPatterns || 0}</div>
                  <div className="text-sm text-muted-foreground">Patterns Suggested</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Vote className="w-8 h-8 mx-auto mb-2 text-primary" />
                  <div className="text-2xl font-bold">{stats?.votesContributed || 0}</div>
                  <div className="text-sm text-muted-foreground">Votes Cast</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <MapPin className="w-8 h-8 mx-auto mb-2 text-primary" />
                  <div className="text-2xl font-bold">{stats?.locationsTracked || 0}</div>
                  <div className="text-sm text-muted-foreground">Locations Tracked</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Clock className="w-8 h-8 mx-auto mb-2 text-primary" />
                  <div className="text-2xl font-bold">{stats?.hoursContributed || 0}</div>
                  <div className="text-sm text-muted-foreground">Hours Contributed</div>
                </CardContent>
              </Card>
            </div>

            {/* Personal Activity Feed */}
            <Collapsible open={expandedSections.activity} onOpenChange={() => toggleSection('activity')}>
              <Card>
                <CollapsibleTrigger className="w-full">
                  <CardHeader className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="text-left">
                        <CardTitle>Your Recent Activity</CardTitle>
                        <CardDescription>Track your contributions and interactions</CardDescription>
                      </div>
                      <ChevronDown className={`w-4 h-4 transition-transform ${expandedSections.activity ? 'rotate-180' : ''}`} />
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent>
                <div className="space-y-4">
                  {activity.slice(0, 10).map((item: any, index: number) => (
                    <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        {getActivityIcon(item.activityType)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{formatActivityType(item.type || item.activityType)}</p>
                          <span className="text-sm text-muted-foreground">
                            {new Date(item.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                        <div className="mt-2 space-y-1">
                          {item.locationName && (
                            <div className="flex items-center space-x-1">
                              <MapPin className="w-3 h-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">{item.locationName}</span>
                            </div>
                          )}
                          {(item.latitude && item.longitude) && (
                            <div className="flex items-center space-x-1">
                              <Target className="w-3 h-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground font-mono">
                                {Number(item.latitude).toFixed(6)}, {Number(item.longitude).toFixed(6)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {activity.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Activity className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>No activity yet. Start exploring locations to see your contributions here!</p>
                    </div>
                  )}
                </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* Saved Locations */}
            <Collapsible open={expandedSections.savedLocations} onOpenChange={() => toggleSection('savedLocations')}>
              <Card>
                <CollapsibleTrigger className="w-full">
                  <CardHeader className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="text-left">
                        <CardTitle>Your Saved Locations</CardTitle>
                        <CardDescription>Places you've bookmarked for future analysis</CardDescription>
                      </div>
                      <ChevronDown className={`w-4 h-4 transition-transform ${expandedSections.savedLocations ? 'rotate-180' : ''}`} />
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent>
                <div className="space-y-3">
                  {savedLocations.slice(0, 5).map((location: any) => (
                    <div key={location.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <MapPin className="w-4 h-4 text-primary" />
                        <div>
                          <div className="font-medium">{location.name || 'Unknown Location'}</div>
                          <div className="text-sm text-muted-foreground">
                            {location.latitude && location.longitude ? 
                              `${parseFloat(location.latitude).toFixed(4)}, ${parseFloat(location.longitude).toFixed(4)}` : 
                              'Coordinates unavailable'
                            }
                          </div>
                        </div>
                      </div>
                      <Button size="sm" variant="outline">
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                    </div>
                  ))}
                  {savedLocations.length === 0 && (
                    <div className="text-center py-6 text-muted-foreground">
                      <MapPin className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      <p>No saved locations yet</p>
                    </div>
                  )}
                </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
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