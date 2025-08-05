import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, 
  MapPin, 
  Activity, 
  MessageSquare, 
  Shield, 
  Settings,
  TrendingUp,
  Database,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  BarChart3,
  Eye,
  Zap
} from "lucide-react";

interface AdminDashboardProps {}

export default function AdminDashboard({}: AdminDashboardProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminId, setAdminId] = useState("");
  const [setupKey, setSetupKey] = useState("");
  const [username, setUsername] = useState("");
  const [overview, setOverview] = useState<any>(null);
  const [userAnalytics, setUserAnalytics] = useState<any>(null);
  const [patternAnalytics, setPatternAnalytics] = useState<any>(null);
  const [locationAnalytics, setLocationAnalytics] = useState<any>(null);
  const [communicationAnalytics, setCommunicationAnalytics] = useState<any>(null);
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Setup admin user
  const handleSetup = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId, username, setupKey })
      });

      if (response.ok) {
        setIsAuthenticated(true);
        localStorage.setItem('adminId', adminId);
        toast({ title: "Admin setup successful", description: "You can now access the dashboard" });
        loadDashboardData();
      } else {
        const error = await response.json();
        toast({ title: "Setup failed", description: error.message, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Setup failed", description: "Connection error", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Check existing authentication
  useEffect(() => {
    const storedAdminId = localStorage.getItem('adminId');
    if (storedAdminId) {
      setAdminId(storedAdminId);
      setIsAuthenticated(true);
      loadDashboardData();
    }
  }, []);

  // API call helper with admin authentication
  const adminFetch = async (endpoint: string, options: any = {}) => {
    const response = await fetch(endpoint, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'x-admin-id': adminId,
        ...options.headers
      }
    });

    if (response.status === 401 || response.status === 403) {
      setIsAuthenticated(false);
      localStorage.removeItem('adminId');
      toast({ title: "Authentication expired", description: "Please log in again", variant: "destructive" });
      return null;
    }

    return response;
  };

  // Load all dashboard data
  const loadDashboardData = async () => {
    try {
      setLoading(true);

      const [overviewRes, usersRes, patternsRes, locationsRes, commRes, healthRes, auditRes] = await Promise.all([
        adminFetch('/api/admin/overview'),
        adminFetch('/api/admin/users'),
        adminFetch('/api/admin/patterns'),
        adminFetch('/api/admin/locations'),
        adminFetch('/api/admin/communication'),
        adminFetch('/api/admin/health'),
        adminFetch('/api/admin/audit')
      ]);

      if (overviewRes?.ok) setOverview(await overviewRes.json());
      if (usersRes?.ok) setUserAnalytics(await usersRes.json());
      if (patternsRes?.ok) setPatternAnalytics(await patternsRes.json());
      if (locationsRes?.ok) setLocationAnalytics(await locationsRes.json());
      if (commRes?.ok) setCommunicationAnalytics(await commRes.json());
      if (healthRes?.ok) setSystemHealth(await healthRes.json());
      if (auditRes?.ok) setAuditLogs(await auditRes.json());

    } catch (error) {
      toast({ title: "Failed to load dashboard", description: "Connection error", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Login form
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2 text-2xl">
              <Shield className="h-8 w-8 text-blue-600" />
              Admin Dashboard
            </CardTitle>
            <CardDescription>
              Access the administrative control panel for the Pattern Discovery Platform
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="adminId">Admin ID</Label>
              <Input
                id="adminId"
                value={adminId}
                onChange={(e) => setAdminId(e.target.value)}
                placeholder="admin_your_id"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Your admin username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="setupKey">Setup Key</Label>
              <Input
                id="setupKey"
                type="password"
                value={setupKey}
                onChange={(e) => setSetupKey(e.target.value)}
                placeholder="Enter setup key"
              />
            </div>
            <Button
              onClick={handleSetup}
              disabled={loading || !adminId || !username || !setupKey}
              className="w-full"
            >
              {loading ? "Setting up..." : "Access Dashboard"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="border-b bg-white dark:bg-gray-800 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Admin Dashboard
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Pattern Discovery Platform Analytics & Control
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={loadDashboardData}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <Activity className="h-4 w-4" />
                {loading ? "Refreshing..." : "Refresh"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsAuthenticated(false);
                  localStorage.removeItem('adminId');
                }}
                className="flex items-center gap-2"
              >
                <XCircle className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="patterns" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Patterns
            </TabsTrigger>
            <TabsTrigger value="locations" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Locations
            </TabsTrigger>
            <TabsTrigger value="communication" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Communication
            </TabsTrigger>
            <TabsTrigger value="system" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              System
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {overview && (
              <>
                {/* Key Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900">
                          <MapPin className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Locations</p>
                          <p className="text-2xl font-bold">{overview.totals.locations.toLocaleString()}</p>
                          <p className="text-xs text-green-600">+{overview.recent24h.locations} today</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900">
                          <Eye className="h-6 w-6 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pattern Suggestions</p>
                          <p className="text-2xl font-bold">{overview.totals.patterns.toLocaleString()}</p>
                          <p className="text-xs text-blue-600">253 total patterns</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-full bg-green-100 dark:bg-green-900">
                          <TrendingUp className="h-6 w-6 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Community Votes</p>
                          <p className="text-2xl font-bold">{overview.totals.votes.toLocaleString()}</p>
                          <p className="text-xs text-green-600">+{overview.recent24h.votes} today</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-full bg-orange-100 dark:bg-orange-900">
                          <Users className="h-6 w-6 text-orange-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Users (7d)</p>
                          <p className="text-2xl font-bold">{overview.activeUsers7d.toLocaleString()}</p>
                          <p className="text-xs text-orange-600">Weekly active</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* System Performance */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Zap className="h-5 w-5" />
                        System Performance
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Requests/min</span>
                        <Badge variant="outline">{overview.performance.requestsPerMinute}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Avg Response Time</span>
                        <Badge variant="outline">{overview.performance.averageResponseTime}ms</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Error Rate</span>
                        <Badge variant={overview.performance.errorRate < 0.01 ? "default" : "destructive"}>
                          {(overview.performance.errorRate * 100).toFixed(2)}%
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">System Health</span>
                        <Badge variant={overview.performance.systemHealth === 'healthy' ? "default" : "destructive"}>
                          {overview.performance.systemHealth}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5" />
                        Communication Overview
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Total Messages</span>
                        <Badge variant="outline">{overview.totals.messages.toLocaleString()}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Active Connections</span>
                        <Badge variant="outline">{overview.totals.connections.toLocaleString()}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Recent Activity (24h)</span>
                        <Badge variant="outline">{overview.recent24h.activities.toLocaleString()}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            {userAnalytics && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>User Engagement Analytics</CardTitle>
                    <CardDescription>
                      Active users and contribution patterns over the last {userAnalytics.timeframe}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <p className="text-2xl font-bold text-blue-600">{userAnalytics.totalActiveUsers}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Active Users</p>
                        </div>
                        <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                          <p className="text-2xl font-bold text-green-600">{userAnalytics.topContributors.voters.length}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Top Voters</p>
                        </div>
                        <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                          <p className="text-2xl font-bold text-purple-600">{userAnalytics.topContributors.locationCreators.length}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Location Contributors</p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h4 className="font-semibold">Top Contributors</h4>
                        {userAnalytics.topContributors.voters.slice(0, 5).map((voter: any, index: number) => (
                          <div key={voter.sessionId} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded">
                            <div className="flex items-center gap-3">
                              <Badge variant="outline">#{index + 1}</Badge>
                              <span className="font-mono text-sm">{voter.sessionId.slice(-8)}</span>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">{voter.voteCount} votes</p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">Weight: {parseFloat(voter.totalWeight || 0).toFixed(1)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* System Health Tab */}
          <TabsContent value="system" className="space-y-6">
            {systemHealth && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Database className="h-5 w-5" />
                      System Health Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          {systemHealth.status === 'healthy' ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <AlertTriangle className="h-5 w-5 text-yellow-600" />
                          )}
                          <span className="font-semibold">Overall Status</span>
                        </div>
                        <Badge variant={systemHealth.status === 'healthy' ? "default" : "destructive"}>
                          {systemHealth.status.toUpperCase()}
                        </Badge>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Database className="h-5 w-5 text-blue-600" />
                          <span className="font-semibold">Database</span>
                        </div>
                        <Badge variant={systemHealth.database.status === 'connected' ? "default" : "destructive"}>
                          {systemHealth.database.status}
                        </Badge>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Response: {systemHealth.database.responseTime}ms
                        </p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Clock className="h-5 w-5 text-purple-600" />
                          <span className="font-semibold">Uptime</span>
                        </div>
                        <p className="text-lg font-semibold">
                          {Math.floor(systemHealth.uptime / 3600)}h {Math.floor((systemHealth.uptime % 3600) / 60)}m
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 space-y-4">
                      <h4 className="font-semibold">Memory Usage</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded">
                          <p className="text-sm text-gray-600 dark:text-gray-400">RSS</p>
                          <p className="font-semibold">{Math.round(systemHealth.memoryUsage.rss / 1024 / 1024)}MB</p>
                        </div>
                        <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded">
                          <p className="text-sm text-gray-600 dark:text-gray-400">Heap Used</p>
                          <p className="font-semibold">{Math.round(systemHealth.memoryUsage.heapUsed / 1024 / 1024)}MB</p>
                        </div>
                        <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded">
                          <p className="text-sm text-gray-600 dark:text-gray-400">Heap Total</p>
                          <p className="font-semibold">{Math.round(systemHealth.memoryUsage.heapTotal / 1024 / 1024)}MB</p>
                        </div>
                        <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded">
                          <p className="text-sm text-gray-600 dark:text-gray-400">External</p>
                          <p className="font-semibold">{Math.round(systemHealth.memoryUsage.external / 1024 / 1024)}MB</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Audit Logs */}
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Admin Actions</CardTitle>
                    <CardDescription>
                      Latest administrative activities and system changes
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {auditLogs.length > 0 ? (
                        auditLogs.map((log) => (
                          <div key={log.id} className="flex items-center justify-between p-3 border rounded">
                            <div className="flex items-center gap-3">
                              <Badge variant="outline">{log.action}</Badge>
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                {log.entityType} {log.entityId && `#${log.entityId}`}
                              </span>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-mono">{log.adminId}</p>
                              <p className="text-xs text-gray-500">
                                {new Date(log.timestamp).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-center text-gray-500 py-8">No audit logs available</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Pattern Analytics Tab */}
          <TabsContent value="patterns" className="space-y-6">
            {patternAnalytics && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Most Suggested Patterns</CardTitle>
                    <CardDescription>Top architectural patterns identified by the system</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {patternAnalytics.topPatterns.slice(0, 10).map((pattern: any) => (
                        <div key={pattern.patternId} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded">
                          <div>
                            <p className="font-semibold">#{pattern.patternNumber} {pattern.patternName}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Avg confidence: {parseFloat(pattern.averageConfidence || 0).toFixed(2)}
                            </p>
                          </div>
                          <Badge variant="outline">{pattern.suggestionCount} suggestions</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>ML Algorithm Performance</CardTitle>
                    <CardDescription>Analysis algorithm effectiveness comparison</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {patternAnalytics.algorithmStats.map((algo: any) => (
                        <div key={algo.algorithm} className="p-3 bg-gray-50 dark:bg-gray-800 rounded">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-semibold">{algo.algorithm}</span>
                            <Badge variant="outline">{algo.suggestionCount} suggestions</Badge>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Average confidence: {parseFloat(algo.averageConfidence || 0).toFixed(3)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* Location Analytics Tab */}
          <TabsContent value="locations" className="space-y-6">
            {locationAnalytics && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Activity Hotspots</CardTitle>
                    <CardDescription>Locations with highest user engagement</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {locationAnalytics.activityHotspots.map((location: any) => (
                        <div key={location.locationId} className="p-3 bg-gray-50 dark:bg-gray-800 rounded">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-semibold">{location.locationName}</p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {parseFloat(location.latitude).toFixed(4)}, {parseFloat(location.longitude).toFixed(4)}
                              </p>
                            </div>
                            <Badge variant="outline">{location.activityCount} activities</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Location Distribution</CardTitle>
                    <CardDescription>Geographic spread and pattern discovery rates</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {locationAnalytics.locationDistribution.slice(0, 15).map((location: any) => (
                        <div key={location.name + location.createdAt} className="p-3 bg-gray-50 dark:bg-gray-800 rounded">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-semibold">{location.name || "Unnamed Location"}</p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                Created: {new Date(location.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            <Badge variant="outline">{location.suggestionCount} patterns</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* Communication Analytics Tab */}
          <TabsContent value="communication" className="space-y-6">
            {communicationAnalytics && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Message Statistics</CardTitle>
                    <CardDescription>Communication patterns and token usage</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <p className="text-2xl font-bold text-blue-600">{communicationAnalytics.recentActivity.messages24h}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Messages (24h)</p>
                        </div>
                        <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                          <p className="text-2xl font-bold text-green-600">{communicationAnalytics.recentActivity.messages7d}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Messages (7d)</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h4 className="font-semibold">Message Types</h4>
                        {communicationAnalytics.messageStats.map((stat: any) => (
                          <div key={stat.messageType} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                            <span className="capitalize">{stat.messageType}</span>
                            <div className="text-right">
                              <Badge variant="outline">{stat.count}</Badge>
                              <p className="text-xs text-gray-500">
                                Avg cost: {parseFloat(stat.avgTokenCost || 0).toFixed(1)} tokens
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Connection Trust Levels</CardTitle>
                    <CardDescription>Peer-to-peer connection statistics</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {communicationAnalytics.connectionStats.map((stat: any) => (
                        <div key={stat.trustLevel} className="p-3 bg-gray-50 dark:bg-gray-800 rounded">
                          <div className="flex justify-between items-center">
                            <div>
                              <span className="font-semibold">Trust Level {stat.trustLevel}</span>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                Avg messages: {parseFloat(stat.avgMessages || 0).toFixed(1)}
                              </p>
                            </div>
                            <Badge variant="outline">{stat.count} connections</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}