import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Database, MapPin, Activity, Users, Clock, Layers, Target, TrendingUp } from "lucide-react";

export default function DataArchitecture() {
  const [sessionId] = useState(() => localStorage.getItem('sessionId') || 'demo_session');

  // Sample data queries to show real storage
  const { data: spatialData } = useQuery({
    queryKey: ["/api/tracking", sessionId]
  });

  const { data: stats } = useQuery({
    queryKey: ["/api/stats"],
    queryParams: { sessionId }
  });

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
          <Database className="h-8 w-8" />
          Data Storage Architecture
        </h1>
        <p className="text-muted-foreground">
          Comprehensive session-based tracking with spatial indexing and movement pattern analysis
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="spatial">Spatial Data</TabsTrigger>
          <TabsTrigger value="sessions">Session System</TabsTrigger>
          <TabsTrigger value="voting">Voting Weight</TabsTrigger>
          <TabsTrigger value="schema">Database Schema</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5" />
                Core Data Flow Architecture
              </CardTitle>
              <CardDescription>
                Multi-layered data storage system optimized for location-based democratic participation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6">
                {/* Data Flow Diagram */}
                <div className="bg-muted rounded-lg p-6">
                  <h3 className="font-semibold mb-4">Data Flow Pipeline</h3>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold">1</div>
                      <div className="flex-1">
                        <div className="font-medium">GPS Collection</div>
                        <div className="text-sm text-muted-foreground">Real-time coordinate tracking with speed/movement classification</div>
                      </div>
                      <Badge variant="outline">spatial_points</Badge>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center text-sm font-bold">2</div>
                      <div className="flex-1">
                        <div className="font-medium">Movement Analysis</div>
                        <div className="text-sm text-muted-foreground">Speed-based classification: walking, biking, driving, stationary</div>
                      </div>
                      <Badge variant="outline">movement_type</Badge>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center text-sm font-bold">3</div>
                      <div className="flex-1">
                        <div className="font-medium">Time Aggregation</div>
                        <div className="text-sm text-muted-foreground">Location clustering and time-spent calculation by movement type</div>
                      </div>
                      <Badge variant="outline">time_tracking</Badge>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center text-sm font-bold">4</div>
                      <div className="flex-1">
                        <div className="font-medium">Voting Weight</div>
                        <div className="text-sm text-muted-foreground">Democratic weight calculation based on engagement patterns</div>
                      </div>
                      <Badge variant="outline">votes</Badge>
                    </div>
                  </div>
                </div>

                {/* Current Session Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {spatialData?.length || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">GPS Points</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {stats?.suggestedPatterns || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Patterns</div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                      {stats?.votesContributed || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Votes Cast</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                      {sessionId.split('_')[0]}
                    </div>
                    <div className="text-sm text-muted-foreground">Session ID</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Spatial Data Tab */}
        <TabsContent value="spatial" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Spatial Data Storage System
              </CardTitle>
              <CardDescription>
                High-precision GPS coordinate storage with movement pattern analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Spatial Points Table Structure */}
                <div>
                  <h3 className="font-semibold mb-3">spatial_points Table Schema</h3>
                  <div className="bg-muted rounded-lg p-4 font-mono text-sm space-y-2">
                    <div><span className="text-blue-600">id:</span> <span className="text-green-600">serial PRIMARY KEY</span></div>
                    <div><span className="text-blue-600">latitude:</span> <span className="text-green-600">decimal(12,8)</span> <span className="text-gray-600">-- 8 decimal places = ~1mm precision</span></div>
                    <div><span className="text-blue-600">longitude:</span> <span className="text-green-600">decimal(12,8)</span> <span className="text-gray-600">-- Global coordinate support</span></div>
                    <div><span className="text-blue-600">session_id:</span> <span className="text-green-600">text NOT NULL</span> <span className="text-gray-600">-- Anonymous user identifier</span></div>
                    <div><span className="text-blue-600">movement_type:</span> <span className="text-green-600">text</span> <span className="text-gray-600">-- walking|biking|driving|stationary|transit</span></div>
                    <div><span className="text-blue-600">speed:</span> <span className="text-green-600">decimal(8,2)</span> <span className="text-gray-600">-- km/h for movement analysis</span></div>
                    <div><span className="text-blue-600">accuracy:</span> <span className="text-green-600">decimal(8,2)</span> <span className="text-gray-600">-- GPS accuracy in meters</span></div>
                    <div><span className="text-blue-600">type:</span> <span className="text-green-600">text</span> <span className="text-gray-600">-- tracking|analyzed|saved</span></div>
                    <div><span className="text-blue-600">metadata:</span> <span className="text-green-600">text</span> <span className="text-gray-600">-- JSON for patterns, analysis</span></div>
                    <div><span className="text-blue-600">created_at:</span> <span className="text-green-600">timestamp</span> <span className="text-gray-600">-- UTC timestamp</span></div>
                  </div>
                </div>

                {/* Movement Classification */}
                <div>
                  <h3 className="font-semibold mb-3">Movement Type Classification</h3>
                  <div className="grid gap-3">
                    <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <div>
                        <div className="font-medium text-green-700 dark:text-green-300">Walking</div>
                        <div className="text-sm text-muted-foreground">0-6 km/h • Highest voting weight (1.0x)</div>
                      </div>
                      <Badge className="bg-green-600">High Engagement</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <div>
                        <div className="font-medium text-blue-700 dark:text-blue-300">Biking</div>
                        <div className="text-sm text-muted-foreground">6-25 km/h • Medium voting weight (0.7x)</div>
                      </div>
                      <Badge className="bg-blue-600">Medium Engagement</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                      <div>
                        <div className="font-medium text-orange-700 dark:text-orange-300">Driving</div>
                        <div className="text-sm text-muted-foreground">25+ km/h • Lower voting weight (0.3x)</div>
                      </div>
                      <Badge className="bg-orange-600">Lower Engagement</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/20 rounded-lg">
                      <div>
                        <div className="font-medium text-gray-700 dark:text-gray-300">Stationary</div>
                        <div className="text-sm text-muted-foreground">0.5 km/h • Base time accumulation</div>
                      </div>
                      <Badge className="bg-gray-600">Time Accumulation</Badge>
                    </div>
                  </div>
                </div>

                {/* Sample Data */}
                {spatialData && spatialData.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3">Recent Spatial Data (Sample)</h3>
                    <div className="bg-muted rounded-lg p-4 max-h-64 overflow-y-auto">
                      <div className="space-y-2 font-mono text-xs">
                        {spatialData.slice(0, 5).map((point: any, index: number) => (
                          <div key={index} className="flex flex-wrap gap-4 py-2 border-b border-border">
                            <span className="text-blue-600">#{point.id}</span>
                            <span className="text-green-600">{point.latitude}, {point.longitude}</span>
                            <span className="text-orange-600">{point.movementType}</span>
                            <span className="text-purple-600">{point.speed}km/h</span>
                            <span className="text-gray-600">{new Date(point.createdAt).toLocaleTimeString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Session System Tab */}
        <TabsContent value="sessions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Session-Based Anonymous System
              </CardTitle>
              <CardDescription>
                Privacy-first architecture using device fingerprinting and GPS-based usernames
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Session Architecture */}
                <div>
                  <h3 className="font-semibold mb-3">Session Architecture</h3>
                  <div className="grid gap-4">
                    <div className="p-4 border rounded-lg">
                      <div className="font-medium mb-2">Anonymous Identity Generation</div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div>• Device fingerprinting captures screen, timezone, language</div>
                        <div>• GPS coordinates determine regional language pool</div>
                        <div>• Culturally appropriate usernames generated server-side</div>
                        <div>• Session ID format: anon_[fingerprint]_[timestamp]</div>
                      </div>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <div className="font-medium mb-2">Data Isolation</div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div>• All spatial points linked to session_id</div>
                        <div>• Voting history tracked by session</div>
                        <div>• Location time-spent calculated per session</div>
                        <div>• Cross-session data correlation prevented</div>
                      </div>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <div className="font-medium mb-2">Global Language Pools</div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div>• North America: English, Spanish, French</div>
                        <div>• Europe: English, Spanish, French, German, Italian</div>
                        <div>• Asia: Japanese, Chinese, Hindi (romanized)</div>
                        <div>• Africa: English, Swahili, Arabic (romanized)</div>
                        <div>• South America: Spanish, Portuguese</div>
                        <div>• Oceania: English, Maori, Pacific islands</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Current Session Details */}
                <div>
                  <h3 className="font-semibold mb-3">Current Session Details</h3>
                  <div className="bg-muted rounded-lg p-4 space-y-2 font-mono text-sm">
                    <div><span className="text-blue-600">Session ID:</span> {sessionId}</div>
                    <div><span className="text-blue-600">Format:</span> anon_[fingerprint]_[timestamp]</div>
                    <div><span className="text-blue-600">Created:</span> {new Date(parseInt(sessionId.split('_')[2])).toLocaleString()}</div>
                    <div><span className="text-blue-600">Storage Key:</span> localStorage.sessionId</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Voting Weight Tab */}
        <TabsContent value="voting" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Weighted Voting Algorithm
              </CardTitle>
              <CardDescription>
                Movement-based democratic participation with time and engagement weighting
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Weight Calculation */}
                <div>
                  <h3 className="font-semibold mb-3">Weight Calculation Formula</h3>
                  <div className="bg-muted rounded-lg p-4 font-mono text-sm space-y-2">
                    <div className="text-center text-lg font-bold mb-4">
                      Total Weight = Time Weight + Movement Bonus + Engagement Bonus + Diversity Bonus
                    </div>
                    <div><span className="text-blue-600">Time Weight:</span> base_time_minutes × 0.1</div>
                    <div><span className="text-green-600">Movement Bonus:</span> Σ(movement_minutes × movement_multiplier)</div>
                    <div><span className="text-orange-600">Engagement Bonus:</span> meaningful_interaction_multiplier</div>
                    <div><span className="text-purple-600">Diversity Bonus:</span> movement_type_variety_multiplier</div>
                  </div>
                </div>

                {/* Movement Multipliers */}
                <div>
                  <h3 className="font-semibold mb-3">Movement Type Multipliers</h3>
                  <div className="grid gap-3">
                    <div className="flex justify-between items-center p-3 border rounded-lg">
                      <div className="font-medium">Walking</div>
                      <div className="text-green-600 font-bold">1.0x</div>
                    </div>
                    <div className="flex justify-between items-center p-3 border rounded-lg">
                      <div className="font-medium">Biking</div>
                      <div className="text-blue-600 font-bold">0.7x</div>
                    </div>
                    <div className="flex justify-between items-center p-3 border rounded-lg">
                      <div className="font-medium">Public Transit</div>
                      <div className="text-indigo-600 font-bold">0.5x</div>
                    </div>
                    <div className="flex justify-between items-center p-3 border rounded-lg">
                      <div className="font-medium">Driving</div>
                      <div className="text-orange-600 font-bold">0.3x</div>
                    </div>
                    <div className="flex justify-between items-center p-3 border rounded-lg">
                      <div className="font-medium">Stationary</div>
                      <div className="text-gray-600 font-bold">0.8x</div>
                    </div>
                  </div>
                </div>

                {/* Vote Storage */}
                <div>
                  <h3 className="font-semibold mb-3">Vote Storage Schema</h3>
                  <div className="bg-muted rounded-lg p-4 font-mono text-sm space-y-2">
                    <div><span className="text-blue-600">suggestion_id:</span> <span className="text-green-600">integer</span> <span className="text-gray-600">-- Pattern suggestion being voted on</span></div>
                    <div><span className="text-blue-600">session_id:</span> <span className="text-green-600">text</span> <span className="text-gray-600">-- Anonymous voter identifier</span></div>
                    <div><span className="text-blue-600">vote_type:</span> <span className="text-green-600">text</span> <span className="text-gray-600">-- 'up' or 'down'</span></div>
                    <div><span className="text-blue-600">weight:</span> <span className="text-green-600">decimal(5,2)</span> <span className="text-gray-600">-- Calculated voting power</span></div>
                    <div><span className="text-blue-600">location_id:</span> <span className="text-green-600">integer</span> <span className="text-gray-600">-- Where vote was cast</span></div>
                    <div><span className="text-blue-600">time_spent_minutes:</span> <span className="text-green-600">integer</span> <span className="text-gray-600">-- Time at location</span></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Database Schema Tab */}
        <TabsContent value="schema" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Complete Database Schema
              </CardTitle>
              <CardDescription>
                PostgreSQL schema with spatial indexing and movement pattern support
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Core Tables */}
                <div>
                  <h3 className="font-semibold mb-3">Core Tables Overview</h3>
                  <div className="grid gap-4">
                    <div className="p-4 border rounded-lg">
                      <div className="font-medium mb-2 flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        spatial_points
                      </div>
                      <div className="text-sm text-muted-foreground">
                        High-precision GPS coordinates with movement classification and speed tracking
                      </div>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <div className="font-medium mb-2 flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        votes
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Weighted democratic votes with movement-based power calculation
                      </div>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <div className="font-medium mb-2 flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        locations
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Named places with administrative boundaries and pattern suggestions
                      </div>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <div className="font-medium mb-2 flex items-center gap-2">
                        <Layers className="h-4 w-4" />
                        patterns
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Christopher Alexander's 253 architectural patterns with metadata
                      </div>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <div className="font-medium mb-2 flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        users
                      </div>
                      <div className="text-sm text-muted-foreground">
                        GPS-based anonymous users with cultural username generation
                      </div>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <div className="font-medium mb-2 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        token_transactions
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Bitcoin-like token economy for data marketplace participation
                      </div>
                    </div>
                  </div>
                </div>

                {/* Indexing Strategy */}
                <div>
                  <h3 className="font-semibold mb-3">Spatial Indexing Strategy</h3>
                  <div className="bg-muted rounded-lg p-4 space-y-3">
                    <div>
                      <div className="font-medium">PostgreSQL PostGIS Extensions</div>
                      <div className="text-sm text-muted-foreground">Geospatial indexing for coordinate-based queries</div>
                    </div>
                    <div>
                      <div className="font-medium">Session-Based Partitioning</div>
                      <div className="text-sm text-muted-foreground">Data isolation and query optimization by user session</div>
                    </div>
                    <div>
                      <div className="font-medium">Time-Series Optimization</div>
                      <div className="text-sm text-muted-foreground">Efficient movement pattern aggregation and analysis</div>
                    </div>
                    <div>
                      <div className="font-medium">Proximity Clustering</div>
                      <div className="text-sm text-muted-foreground">DBSCAN algorithm for location grouping and time calculation</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}