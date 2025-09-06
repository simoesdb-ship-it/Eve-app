import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import BottomNavigation from "@/components/bottom-navigation";
import { UsernameDisplay } from "@/components/username-display";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getUserDisplayName } from "@/lib/username-generator";
import { getConsistentUserId } from "@/lib/device-fingerprint";
import { 
  User,
  Wallet,
  ShoppingCart, 
  Shield, 
  Bell, 
  Download, 
  Trash2, 
  Info, 
  ExternalLink,
  Wifi,
  Database,
  Coins,
  Settings,
  TrendingUp,
  MapPin,
  Clock
} from "lucide-react";

function getSessionId(): string {
  const stored = localStorage.getItem('session_id');
  if (stored) return stored;
  
  const newSessionId = `anon_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`;
  localStorage.setItem('session_id', newSessionId);
  return newSessionId;
}

export default function ProfilePage() {
  const [sessionId] = useState(getSessionId());
  const [username, setUsername] = useState<string>('');
  const [persistentUserId, setPersistentUserId] = useState<string>('');
  const [locationTracking, setLocationTracking] = useState(true);
  const [notifications, setNotifications] = useState(false);
  const [offlineMode, setOfflineMode] = useState(true);
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  // Fetch token balance
  const { data: tokenBalance } = useQuery({
    queryKey: ['/api/tokens/balance', sessionId],
    queryFn: async () => {
      const response = await fetch(`/api/tokens/balance/${sessionId}`);
      if (!response.ok) throw new Error('Failed to fetch token balance');
      return response.json();
    }
  });

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

  const handleClearData = () => {
    if (confirm("Are you sure you want to clear all local data? This action cannot be undone.")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const handleExportData = () => {
    const data = {
      timestamp: new Date().toISOString(),
      settings: {
        locationTracking,
        notifications,
        offlineMode
      },
      stats: stats
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eve-profile-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
              <span className="text-white font-bold text-sm">P</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-neutral-800">Profile</h1>
              <p className="text-xs text-neutral-400">Your data, wallet & settings</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 bg-primary/10 px-3 py-1 rounded-full">
            <Coins className="w-4 h-4 text-primary" />
            <span className="font-semibold">{tokenBalance?.balance || 0}</span>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-20">
        <div className="max-w-4xl mx-auto p-4">
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview" className="flex items-center space-x-1">
                <User className="w-3 h-3" />
                <span className="text-xs">Overview</span>
              </TabsTrigger>
              <TabsTrigger value="wallet" className="flex items-center space-x-1">
                <Wallet className="w-3 h-3" />
                <span className="text-xs">Wallet</span>
              </TabsTrigger>
              <TabsTrigger value="marketplace" className="flex items-center space-x-1">
                <ShoppingCart className="w-3 h-3" />
                <span className="text-xs">Market</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center space-x-1">
                <Settings className="w-3 h-3" />
                <span className="text-xs">Settings</span>
              </TabsTrigger>
            </TabsList>

            {/* OVERVIEW TAB */}
            <TabsContent value="overview" className="space-y-4">
              {/* User Identity */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Shield className="w-5 h-5 text-primary" />
                    <span>Your Anonymous Identity</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <UsernameDisplay />
                  <p className="text-sm text-gray-600 mt-3">
                    This unique username is generated from your device and stays the same across sessions.
                  </p>
                </CardContent>
              </Card>

              {/* Stats Overview */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card>
                  <CardContent className="p-3 text-center">
                    <div className="text-2xl font-bold">{tokenBalance?.balance || 0}</div>
                    <div className="text-xs text-muted-foreground">Tokens Earned</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <div className="text-2xl font-bold">{stats?.suggestedPatterns || 0}</div>
                    <div className="text-xs text-muted-foreground">Patterns Found</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <div className="text-2xl font-bold">{stats?.votesContributed || 0}</div>
                    <div className="text-xs text-muted-foreground">Votes Cast</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <div className="text-2xl font-bold">{stats?.locationsTracked || 0}</div>
                    <div className="text-xs text-muted-foreground">Locations</div>
                  </CardContent>
                </Card>
              </div>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-3">
                  <Button variant="outline" className="justify-start" onClick={() => window.location.href = '/economy'}>
                    <Wallet className="w-4 h-4 mr-2" />
                    View Full Wallet
                  </Button>
                  <Button variant="outline" className="justify-start" onClick={() => window.location.href = '/data-marketplace'}>
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Browse Marketplace
                  </Button>
                  <Button variant="outline" className="justify-start" onClick={handleExportData}>
                    <Download className="w-4 h-4 mr-2" />
                    Export Data
                  </Button>
                  <Button variant="outline" className="justify-start" onClick={() => window.location.href = '/activity'}>
                    <TrendingUp className="w-4 h-4 mr-2" />
                    View Activity
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* WALLET TAB */}
            <TabsContent value="wallet" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Wallet className="w-5 h-5" />
                    <span>Token Balance</span>
                  </CardTitle>
                  <CardDescription>Your earned tokens from location data contributions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-6">
                    <div className="text-4xl font-bold text-primary mb-2">
                      {tokenBalance?.balance || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Available Tokens</div>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg text-sm space-y-2">
                    <div className="font-medium">How You Earn Tokens:</div>
                    <div className="space-y-1 text-muted-foreground">
                      <div>• +5 tokens for visiting new locations</div>
                      <div>• +3 tokens for pattern voting at locations</div>
                      <div>• +10 tokens for saving detailed location analysis</div>
                      <div>• +15 tokens for sharing valuable route insights</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Button 
                onClick={() => window.location.href = '/economy'}
                className="w-full"
              >
                <Wallet className="w-4 h-4 mr-2" />
                Open Full Wallet & Economy
              </Button>
            </TabsContent>

            {/* MARKETPLACE TAB */}
            <TabsContent value="marketplace" className="space-y-4">
              <Card>
                <CardContent className="p-6 text-center">
                  <h2 className="text-2xl font-bold mb-2">Data Marketplace</h2>
                  <p className="text-muted-foreground mb-4">
                    Buy and sell location insights with other users
                  </p>
                  <Button 
                    onClick={() => window.location.href = '/data-marketplace'}
                    size="lg"
                  >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Browse Marketplace
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <div className="text-sm">
                    <div className="font-medium mb-2">What Data Can You Trade?</div>
                    <div className="grid grid-cols-1 gap-3">
                      <div className="flex items-start space-x-2">
                        <MapPin className="w-4 h-4 text-blue-600 mt-0.5" />
                        <div>
                          <div className="font-medium">Spatial Analysis</div>
                          <div className="text-muted-foreground">GPS data, building layouts, neighborhood patterns</div>
                        </div>
                      </div>
                      <div className="flex items-start space-x-2">
                        <Clock className="w-4 h-4 text-green-600 mt-0.5" />
                        <div>
                          <div className="font-medium">Time Tracking</div>
                          <div className="text-muted-foreground">Movement patterns, activity clustering data</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* SETTINGS TAB */}
            <TabsContent value="settings" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Shield className="w-5 h-5 text-primary" />
                    <span>Privacy & Security</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium">Anonymous Location Tracking</h4>
                      <p className="text-sm text-gray-600">
                        Allow anonymous location tracking for pattern suggestions
                      </p>
                    </div>
                    <Switch
                      checked={locationTracking}
                      onCheckedChange={setLocationTracking}
                    />
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium">Push Notifications</h4>
                      <p className="text-sm text-gray-600">
                        Get notified about new patterns and community activity
                      </p>
                    </div>
                    <Switch
                      checked={notifications}
                      onCheckedChange={setNotifications}
                    />
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium">Offline Mode</h4>
                      <p className="text-sm text-gray-600">
                        Cache patterns for offline viewing
                      </p>
                    </div>
                    <Switch
                      checked={offlineMode}
                      onCheckedChange={setOfflineMode}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Data Management */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Database className="w-5 h-5 text-primary" />
                    <span>Data Management</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExportData}
                      className="flex items-center space-x-2"
                    >
                      <Download className="w-4 h-4" />
                      <span>Export</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleClearData}
                      className="flex items-center space-x-2 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Clear Data</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* About */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Info className="w-5 h-5 text-primary" />
                    <span>About</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">
                      EVE Mobile helps discover Christopher Alexander's design patterns
                      for locations using community-driven insights and anonymous voting.
                    </p>
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>Version 1.0.0</span>
                      <span>•</span>
                      <span>Open Source</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Connection Status</span>
                    <div className="flex items-center space-x-2">
                      <Wifi className="w-4 h-4 text-green-500" />
                      <span className="text-green-600">Online</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation activeTab="profile" />
    </div>
  );
}