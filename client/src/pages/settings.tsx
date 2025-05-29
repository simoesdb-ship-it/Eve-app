import { useState } from "react";
import BottomNavigation from "@/components/bottom-navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Settings, 
  Shield, 
  MapPin, 
  Bell, 
  Download, 
  Trash2, 
  Info, 
  ExternalLink,
  Wifi,
  Database
} from "lucide-react";

export default function SettingsPage() {
  const [locationTracking, setLocationTracking] = useState(true);
  const [notifications, setNotifications] = useState(false);
  const [offlineMode, setOfflineMode] = useState(true);

  const handleClearData = () => {
    if (confirm("Are you sure you want to clear all local data? This action cannot be undone.")) {
      // Clear localStorage or any cached data
      localStorage.clear();
      window.location.reload();
    }
  };

  const handleExportData = () => {
    // Create a simple data export
    const data = {
      timestamp: new Date().toISOString(),
      settings: {
        locationTracking,
        notifications,
        offlineMode
      }
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eve-settings-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Settings className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-neutral-800">Settings</h1>
              <p className="text-xs text-neutral-400">Privacy & preferences</p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-20">
        
        {/* Privacy Section */}
        <div className="px-4 py-4">
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
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium">Session ID:</span>
                  <Badge variant="outline" className="text-xs font-mono">
                    anon_user_****
                  </Badge>
                </div>
                <p className="text-xs text-gray-500 pl-6">
                  Your identity is completely anonymous. No personal data is stored.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preferences Section */}
        <div className="px-4 py-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="w-5 h-5 text-primary" />
                <span>Preferences</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
        </div>

        {/* Data Management Section */}
        <div className="px-4 py-2">
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
              
              <div className="text-xs text-gray-500 space-y-1">
                <p>• Export: Download your settings and anonymous usage data</p>
                <p>• Clear: Remove all local data and reset the app</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* About Section */}
        <div className="px-4 py-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Info className="w-5 h-5 text-primary" />
                <span>About EVE Mobile</span>
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
              
              <Separator />
              
              <div className="space-y-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="justify-start p-0 h-auto text-primary"
                  onClick={() => window.open('https://en.wikipedia.org/wiki/Christopher_Alexander', '_blank')}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Learn about Christopher Alexander
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="justify-start p-0 h-auto text-primary"
                  onClick={() => window.open('https://github.com', '_blank')}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View source code
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Status Section */}
        <div className="px-4 py-2">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Connection Status</span>
                <div className="flex items-center space-x-2">
                  <Wifi className="w-4 h-4 text-green-500" />
                  <span className="text-green-600">Online</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-gray-600">Pattern Database</span>
                <Badge variant="secondary">Synced</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation activeTab="settings" />
    </div>
  );
}
