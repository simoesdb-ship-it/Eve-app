import { useQuery } from "@tanstack/react-query";
import BottomNavigation from "@/components/bottom-navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Vote, Activity, TrendingUp, Calendar, MapPin, Users, ChevronDown, Map, BookOpen, Heart, BarChart3, Navigation, Database } from "lucide-react";
import type { Activity as ActivityType } from "@shared/schema";
import { useState } from "react";

export default function ActivityPage() {
  // State for collapsible sections
  const [expandedSections, setExpandedSections] = useState({
    movement: true,
    location: true,
    saved: true,
    patterns: true,
    community: true,
    stats: true
  });

  // Fetch recent activity with more items
  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['/api/activity', { limit: 50 }],
    queryFn: async () => {
      const response = await fetch('/api/activity?limit=50');
      if (!response.ok) throw new Error('Failed to fetch activity');
      return response.json();
    }
  });

  // Fetch stats for feature tracking
  const { data: stats } = useQuery({
    queryKey: ['/api/stats'],
    queryFn: async () => {
      const response = await fetch('/api/stats');
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    }
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const activityDate = new Date(date);
    const diffInMinutes = Math.floor((now.getTime() - activityDate.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const hours = Math.floor(diffInMinutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'vote':
        return Vote;
      case 'visit':
        return MapPin;
      case 'suggestion':
        return TrendingUp;
      default:
        return Activity;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'vote':
        return 'bg-green-100 text-green-800';
      case 'visit':
        return 'bg-blue-100 text-blue-800';
      case 'suggestion':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Group activities by date
  const groupedActivities = activities.reduce((acc: { [key: string]: ActivityType[] }, activity: ActivityType) => {
    const date = new Date(activity.createdAt).toDateString();
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(activity);
    return acc;
  }, {});

  const isToday = (date: string) => {
    return date === new Date().toDateString();
  };

  const isYesterday = (date: string) => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return date === yesterday.toDateString();
  };

  const formatDateHeader = (date: string) => {
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return new Date(date).toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div className="flex flex-col min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-neutral-800">Community Activity</h1>
              <p className="text-xs text-neutral-400">Anonymous contributions & votes</p>
            </div>
          </div>
        </div>
      </header>

      {/* Feature Categories */}
      <div className="px-4 py-3 space-y-3">
        {/* Movement Tracking */}
        <Collapsible open={expandedSections.movement} onOpenChange={() => toggleSection('movement')}>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-white rounded-lg border hover:bg-gray-50">
            <div className="flex items-center space-x-3">
              <Navigation className="w-5 h-5 text-blue-600" />
              <div className="text-left">
                <h3 className="font-medium text-neutral-800">Movement Tracking</h3>
                <p className="text-xs text-neutral-500">GPS location recording every 3 minutes</p>
              </div>
            </div>
            <ChevronDown className={`w-4 h-4 transition-transform ${expandedSections.movement ? 'rotate-180' : ''}`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="px-3 py-2">
            <div className="text-sm text-neutral-600 space-y-1">
              <p>• Records precise coordinates (latitude/longitude)</p>
              <p>• Creates accumulating dots on map showing movement patterns</p>
              <p>• Maintains anonymous session-based tracking for privacy</p>
              <p>• Currently tracking {stats?.offlinePatterns || 0} active sessions</p>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Location Analysis */}
        <Collapsible open={expandedSections.location} onOpenChange={() => toggleSection('location')}>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-white rounded-lg border hover:bg-gray-50">
            <div className="flex items-center space-x-3">
              <MapPin className="w-5 h-5 text-green-600" />
              <div className="text-left">
                <h3 className="font-medium text-neutral-800">Location Analysis</h3>
                <p className="text-xs text-neutral-500">Geographic pattern recognition and suggestions</p>
              </div>
            </div>
            <ChevronDown className={`w-4 h-4 transition-transform ${expandedSections.location ? 'rotate-180' : ''}`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="px-3 py-2">
            <div className="text-sm text-neutral-600 space-y-1">
              <p>• Analyzes specific locations when users tap to investigate</p>
              <p>• Generates contextual Alexander pattern suggestions</p>
              <p>• Creates persistent location records with associated patterns</p>
              <p>• Links real places to relevant design patterns</p>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Saved Locations */}
        <Collapsible open={expandedSections.saved} onOpenChange={() => toggleSection('saved')}>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-white rounded-lg border hover:bg-gray-50">
            <div className="flex items-center space-x-3">
              <Heart className="w-5 h-5 text-red-600" />
              <div className="text-left">
                <h3 className="font-medium text-neutral-800">Saved Locations</h3>
                <p className="text-xs text-neutral-500">Bookmarked places for future reference</p>
              </div>
            </div>
            <ChevronDown className={`w-4 h-4 transition-transform ${expandedSections.saved ? 'rotate-180' : ''}`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="px-3 py-2">
            <div className="text-sm text-neutral-600 space-y-1">
              <p>• Stores analyzed locations across sessions using PostgreSQL</p>
              <p>• Maintains heart-icon favorites system</p>
              <p>• Preserves pattern suggestions tied to specific coordinates</p>
              <p>• Enables returning to previously analyzed places</p>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Pattern Library */}
        <Collapsible open={expandedSections.patterns} onOpenChange={() => toggleSection('patterns')}>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-white rounded-lg border hover:bg-gray-50">
            <div className="flex items-center space-x-3">
              <BookOpen className="w-5 h-5 text-purple-600" />
              <div className="text-left">
                <h3 className="font-medium text-neutral-800">Pattern Library Integration</h3>
                <p className="text-xs text-neutral-500">Application of Alexander's 253 patterns to real spaces</p>
              </div>
            </div>
            <ChevronDown className={`w-4 h-4 transition-transform ${expandedSections.patterns ? 'rotate-180' : ''}`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="px-3 py-2">
            <div className="text-sm text-neutral-600 space-y-1">
              <p>• Complete "A Pattern Language" collection with correct book numbering</p>
              <p>• Cross-reference system linking related patterns</p>
              <p>• Search and filtering by categories (Transportation, Housing, etc.)</p>
              <p>• Pattern-to-location matching based on geographic context</p>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Community Activity */}
        <Collapsible open={expandedSections.community} onOpenChange={() => toggleSection('community')}>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-white rounded-lg border hover:bg-gray-50">
            <div className="flex items-center space-x-3">
              <Users className="w-5 h-5 text-orange-600" />
              <div className="text-left">
                <h3 className="font-medium text-neutral-800">Community Activity</h3>
                <p className="text-xs text-neutral-500">Collective pattern application across all users</p>
              </div>
            </div>
            <ChevronDown className={`w-4 h-4 transition-transform ${expandedSections.community ? 'rotate-180' : ''}`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="px-3 py-2">
            <div className="text-sm text-neutral-600 space-y-1">
              <p>• Real-time feed of location analyses community-wide</p>
              <p>• Aggregate statistics ({stats?.suggestedPatterns || 0} pattern suggestions recorded)</p>
              <p>• Anonymous contribution tracking while preserving privacy</p>
              <p>• Building collective knowledge about pattern relevance</p>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Usage Statistics */}
        <Collapsible open={expandedSections.stats} onOpenChange={() => toggleSection('stats')}>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-white rounded-lg border hover:bg-gray-50">
            <div className="flex items-center space-x-3">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
              <div className="text-left">
                <h3 className="font-medium text-neutral-800">Usage Statistics</h3>
                <p className="text-xs text-neutral-500">Personal and community engagement metrics</p>
              </div>
            </div>
            <ChevronDown className={`w-4 h-4 transition-transform ${expandedSections.stats ? 'rotate-180' : ''}`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="px-3 py-2">
            <div className="text-sm text-neutral-600 space-y-1">
              <p>• Individual pattern suggestions contributed</p>
              <p>• Votes cast on pattern relevance ({stats?.votesContributed || 0} total)</p>
              <p>• Offline pattern discoveries</p>
              <p>• Community-wide pattern application trends</p>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Recent Activity Feed */}
      <div className="flex-1 overflow-y-auto pb-20">
        <div className="px-4 py-4">
          <div className="flex items-center space-x-2 mb-3">
            <Calendar className="w-4 h-4 text-gray-400" />
            <h3 className="font-semibold text-neutral-800">Recent Activity Feed</h3>
            <Badge variant="outline" className="text-xs">
              {activities.length} total activities
            </Badge>
          </div>
          
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : activities.length === 0 ? (
            <div className="py-8 text-center">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">No community activity yet</p>
              <p className="text-sm text-gray-400">
                Start exploring patterns and voting to see activity here
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {activities.slice(0, 10).map((activity: ActivityType) => {
                const IconComponent = getActivityIcon(activity.type);
                
                return (
                  <Card key={activity.id} className="transition-shadow hover:shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getActivityColor(activity.type)}`}>
                          <IconComponent className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-neutral-800">
                            {activity.description}
                          </p>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {activity.type}
                            </Badge>
                            <span className="text-xs text-neutral-400">
                              {formatTimeAgo(activity.createdAt.toString())}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation activeTab="activity" />
    </div>
  );
}
