import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Check, X, Wifi, WifiOff, Database, Search, Eye, MapPin } from "lucide-react";
import { getUserDisplayName } from "@/lib/username-generator";
import { getConsistentUserId } from "@/lib/device-fingerprint";

export default function OfflinePatternsPage() {
  const [username, setUsername] = useState<string>('');

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
            <Link href="/">
              <Button variant="ghost" size="sm" className="p-2">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <WifiOff className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-neutral-800">Offline Patterns</h1>
              <p className="text-xs text-neutral-400">Pattern accessibility without internet</p>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 px-4 py-4 pb-24 space-y-6">
        
        {/* What Offline Patterns Are */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Database className="w-5 h-5 text-primary" />
              <span>What Are Offline Patterns?</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-neutral-700">
              The term "offline" refers to patterns that work without internet connection:
            </p>
            
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <Database className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-neutral-800">Local Storage</p>
                  <p className="text-sm text-neutral-600">All 253 Alexander patterns are stored in your app's PostgreSQL database</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Search className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-neutral-800">Cached Analysis</p>
                  <p className="text-sm text-neutral-600">Pattern matching algorithms work locally</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <WifiOff className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-neutral-800">No Network Dependency</p>
                  <p className="text-sm text-neutral-600">When you lose internet, the app can still:</p>
                  <ul className="mt-2 space-y-1 text-sm text-neutral-600">
                    <li>• Analyze your location against stored patterns</li>
                    <li>• Show pattern details and descriptions</li>
                    <li>• Perform basic pattern matching</li>
                    <li>• Display the offline indicator: "Offline mode - X patterns available"</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* What Happens When Offline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <WifiOff className="w-5 h-5 text-neutral-600" />
              <span>What Happens When You're Offline</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-neutral-800 text-white px-4 py-3 rounded-lg">
              <div className="flex items-center space-x-2">
                <WifiOff className="w-4 h-4" />
                <span className="text-sm">Offline Mode Indicator:</span>
              </div>
              <p className="text-sm mt-1">Offline mode - 253 patterns available</p>
            </div>
          </CardContent>
        </Card>

        {/* What Works Offline */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-green-700">
                <Check className="w-5 h-5" />
                <span>Still Works Offline</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-3">
                <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                <span className="text-sm">View all 253 patterns in the Patterns tab</span>
              </div>
              <div className="flex items-center space-x-3">
                <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                <span className="text-sm">Read pattern descriptions and details</span>
              </div>
              <div className="flex items-center space-x-3">
                <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                <span className="text-sm">Basic location-to-pattern matching</span>
              </div>
              <div className="flex items-center space-x-3">
                <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                <span className="text-sm">Browse your previous locations and votes</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-red-700">
                <X className="w-5 h-5" />
                <span>Requires Internet</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-3">
                <X className="w-4 h-4 text-red-600 flex-shrink-0" />
                <span className="text-sm">Create new location entries</span>
              </div>
              <div className="flex items-center space-x-3">
                <X className="w-4 h-4 text-red-600 flex-shrink-0" />
                <span className="text-sm">Submit votes on patterns</span>
              </div>
              <div className="flex items-center space-x-3">
                <X className="w-4 h-4 text-red-600 flex-shrink-0" />
                <span className="text-sm">Sync with community data</span>
              </div>
              <div className="flex items-center space-x-3">
                <X className="w-4 h-4 text-red-600 flex-shrink-0" />
                <span className="text-sm">Access marketplace features</span>
              </div>
              <div className="flex items-center space-x-3">
                <X className="w-4 h-4 text-red-600 flex-shrink-0" />
                <span className="text-sm">Real-time pattern suggestions</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Why This Matters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MapPin className="w-5 h-5 text-primary" />
              <span>Why This Matters</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="font-medium text-blue-900 mb-2">Core Philosophy</p>
              <p className="text-sm text-blue-800">
                Your app follows Christopher Alexander's principle that architectural patterns should be accessible everywhere, 
                even in remote locations without internet. The offline capability ensures:
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <p className="font-medium text-neutral-800">Rural Accessibility</p>
                    <p className="text-sm text-neutral-600">Works in areas with poor connectivity</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <p className="font-medium text-neutral-800">Uninterrupted Analysis</p>
                    <p className="text-sm text-neutral-600">Continue studying patterns while traveling</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <p className="font-medium text-neutral-800">Resilient Design</p>
                    <p className="text-sm text-neutral-600">App remains functional during network outages</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <p className="font-medium text-neutral-800">Educational Value</p>
                    <p className="text-sm text-neutral-600">All 253 patterns always available for learning</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Current Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Eye className="w-5 h-5 text-primary" />
              <span>Current Status</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-green-800 font-medium mb-2">
                In your app right now, "Offline patterns" shows <span className="text-2xl font-bold">253</span> - 
                the complete collection of Christopher Alexander's patterns, all cached locally and ready for offline use.
              </p>
              <p className="text-sm text-green-700">
                The counter essentially tells you: "You have access to all 253 architectural patterns, even without internet."
              </p>
            </div>
            
            <div className="flex justify-center pt-4">
              <Link href="/patterns">
                <Button className="flex items-center space-x-2">
                  <Database className="w-4 h-4" />
                  <span>View All 253 Patterns</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}