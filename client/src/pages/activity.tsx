import { useQuery } from "@tanstack/react-query";
import BottomNavigation from "@/components/bottom-navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Vote, Activity, TrendingUp, Calendar, MapPin, Users } from "lucide-react";
import type { Activity as ActivityType } from "@shared/schema";

export default function ActivityPage() {
  // Fetch recent activity with more items
  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['/api/activity', { limit: 50 }],
    queryFn: async () => {
      const response = await fetch('/api/activity?limit=50');
      if (!response.ok) throw new Error('Failed to fetch activity');
      return response.json();
    }
  });

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

      {/* Stats Overview */}
      <div className="px-4 py-3 bg-white border-b border-gray-100">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-semibold text-neutral-800">{activities.length}</div>
            <div className="text-xs text-neutral-400">Total Activities</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-neutral-800">
              {activities.filter((a: ActivityType) => a.type === 'vote').length}
            </div>
            <div className="text-xs text-neutral-400">Votes Cast</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-neutral-800">
              {activities.filter((a: ActivityType) => a.type === 'visit').length}
            </div>
            <div className="text-xs text-neutral-400">Locations</div>
          </div>
        </div>
      </div>

      {/* Activity Feed */}
      <div className="flex-1 overflow-y-auto pb-20">
        {isLoading ? (
          <div className="px-4 py-4 space-y-3">
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
          <div className="px-4 py-8 text-center">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">No community activity yet</p>
            <p className="text-sm text-gray-400">
              Start exploring patterns and voting to see activity here
            </p>
          </div>
        ) : (
          Object.entries(groupedActivities).map(([date, dateActivities]) => (
            <div key={date} className="px-4 py-4">
              <div className="flex items-center space-x-2 mb-3">
                <Calendar className="w-4 h-4 text-gray-400" />
                <h3 className="font-semibold text-neutral-800">
                  {formatDateHeader(date)}
                </h3>
                <Badge variant="outline" className="text-xs">
                  {dateActivities.length} activities
                </Badge>
              </div>
              
              <div className="space-y-3">
                {dateActivities.map((activity: ActivityType) => {
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
            </div>
          ))
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation activeTab="activity" />
    </div>
  );
}
