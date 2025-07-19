import { ArrowLeft, MapPin, Vote, TrendingUp, Users, Activity, Database } from "lucide-react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ActivityExplanation() {
  return (
    <div className="flex flex-col min-h-screen bg-neutral-50">
      {/* Status Bar */}
      <div className="safe-area-top bg-primary text-white px-4 py-1 text-sm">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-secondary rounded-full animate-pulse"></div>
          <span>Activity Categories</span>
        </div>
      </div>

      {/* App Header */}
      <header className="bg-transparent px-4 py-3">
        <div className="flex items-center justify-between">
          <Link href="/activity">
            <button className="flex items-center space-x-2 text-neutral-600 hover:text-neutral-800">
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Activity</span>
            </button>
          </Link>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">E</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-neutral-800">Activity Categories</h1>
              <p className="text-xs text-neutral-400">Understanding Your Contributions</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-4 pb-24 space-y-4">
        {/* Overview Card */}
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <Database className="w-6 h-6 text-blue-600 mt-1" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">Community Activity Database</h3>
                <p className="text-sm text-blue-800 mb-3">
                  The app tracks <strong>1,344 total activities</strong> across all users, building a comprehensive 
                  dataset of architectural pattern discoveries and community insights. Your contributions become 
                  part of this growing knowledge base.
                </p>
                <div className="text-xs text-blue-700">
                  Recent Activity shows your last 10 activities • Total includes all historical data
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Activity Categories */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-neutral-800">Activity Categories Explained</h2>

          {/* Location Visits */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MapPin className="w-5 h-5 text-blue-600" />
                <span>Location Visits (1,197 total)</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-neutral-600">
                Every time you tap the map to analyze a location, it creates a "visit" activity record. 
                This triggers AI analysis of the area and generates Christopher Alexander pattern suggestions.
              </p>
              <div className="bg-blue-50 p-3 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">What Happens During a Visit:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• GPS coordinates are recorded with high precision</li>
                  <li>• Building height, architectural style, and density analyzed</li>
                  <li>• 253 Alexander patterns evaluated for relevance</li>
                  <li>• Location saved to database for community access</li>
                  <li>• Pattern suggestions generated using AI algorithms</li>
                </ul>
              </div>
              <div className="text-xs text-neutral-500">
                <strong>Recent examples:</strong> "Current Location" visits around coordinates 44.943°N, 92.890°W
              </div>
            </CardContent>
          </Card>

          {/* Votes Cast */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Vote className="w-5 h-5 text-green-600" />
                <span>Votes Cast (147 total)</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-neutral-600">
                When you agree or disagree with pattern suggestions at locations, your vote contributes 
                to community consensus about which Alexander patterns truly apply to real places.
              </p>
              <div className="bg-green-50 p-3 rounded-lg">
                <h4 className="font-medium text-green-900 mb-2">Voting Impact:</h4>
                <ul className="text-sm text-green-800 space-y-1">
                  <li>• Time-weighted influence (more time at location = stronger vote)</li>
                  <li>• Builds community consensus on pattern applicability</li>
                  <li>• Earns tokens for contributing quality feedback</li>
                  <li>• Helps refine AI pattern suggestion algorithms</li>
                  <li>• Creates crowdsourced architectural knowledge base</li>
                </ul>
              </div>
              <div className="text-xs text-neutral-500">
                <strong>Example:</strong> Voting "agree" that Pattern 61 "Small Public Squares" applies to a location
              </div>
            </CardContent>
          </Card>

          {/* Pattern Suggestions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-yellow-600" />
                <span>Pattern Suggestions (AI Generated)</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-neutral-600">
                The AI analyzes each location and suggests which of Christopher Alexander's 253 patterns 
                are most relevant. These suggestions become the foundation for community voting.
              </p>
              <div className="bg-yellow-50 p-3 rounded-lg">
                <h4 className="font-medium text-yellow-900 mb-2">Suggestion Algorithm:</h4>
                <ul className="text-sm text-yellow-800 space-y-1">
                  <li>• Evaluates all 253 patterns from "A Pattern Language"</li>
                  <li>• Uses confidence scoring (0.0 to 1.0) to rank relevance</li>
                  <li>• Only suggests patterns with confidence above 0.5</li>
                  <li>• Considers building type, density, transportation, green space</li>
                  <li>• Generates 10-15 suggestions per location on average</li>
                </ul>
              </div>
              <div className="text-xs text-neutral-500">
                <strong>Recent examples:</strong> Pattern 61 "Small Public Squares" (confidence: 0.653), 
                Pattern 30 "Activity Nodes" (confidence: 0.595)
              </div>
            </CardContent>
          </Card>

          {/* Community Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-purple-600" />
                <span>Community Analysis</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-neutral-600">
                Background analysis of community patterns, spatial clustering, and collective insights 
                that help understand how users interact with urban spaces.
              </p>
              <div className="bg-purple-50 p-3 rounded-lg">
                <h4 className="font-medium text-purple-900 mb-2">Community Insights:</h4>
                <ul className="text-sm text-purple-800 space-y-1">
                  <li>• Identifies popular locations across all users</li>
                  <li>• Analyzes collective movement patterns</li>
                  <li>• Tracks consensus on pattern applications</li>
                  <li>• Measures community engagement with different urban areas</li>
                  <li>• Generates insights for urban planning and design</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Movement Tracking Issue */}
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-orange-900">
              <Activity className="w-5 h-5" />
              <span>Movement Tracking Status</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-orange-800">
              <strong>Current Issue:</strong> Movement tracking shows "0 locations, 0 hours" due to 
              session ID mismatch between tracking and statistics systems.
            </p>
            <div className="bg-orange-100 p-3 rounded-lg">
              <h4 className="font-medium text-orange-900 mb-2">Technical Details:</h4>
              <ul className="text-sm text-orange-800 space-y-1">
                <li>• 48 spatial tracking points exist in database across 6 sessions</li>
                <li>• Statistics endpoint requires proper session ID to calculate hours</li>
                <li>• Location time breakdown works correctly when session ID provided</li>
                <li>• Frontend and backend use different session ID generation methods</li>
              </ul>
            </div>
            <div className="text-xs text-orange-700">
              <strong>Solution in progress:</strong> Unifying session ID handling across tracking and stats systems
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}