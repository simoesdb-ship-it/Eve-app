import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getConsistentUserId } from "@/lib/device-fingerprint";
import { getUserDisplayName, getUserColor, getUserInitials } from "@/lib/username-generator";
import { useToast } from "@/hooks/use-toast";
import { Fingerprint, Shield, MapPin, Coins, Check, User } from "lucide-react";

export default function OnboardingPage() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);
  const [userId, setUserId] = useState<string>("");
  const [username, setUsername] = useState<string>("");
  const [isLocationLoading, setIsLocationLoading] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    initializeDevice();
  }, []);

  const initializeDevice = async () => {
    try {
      const anonymousUserId = await getConsistentUserId();
      setUserId(anonymousUserId);

      // Generate consistent username from device fingerprint
      const generatedUsername = getUserDisplayName(anonymousUserId);
      setUsername(generatedUsername);

      // Check if user has already completed onboarding
      const onboardingComplete = localStorage.getItem(`onboarding_complete_${anonymousUserId}`);
      if (onboardingComplete === 'true') {
        // Redirect to main app
        setLocation('/');
        return;
      }
    } catch (error) {
      console.error('Failed to initialize device:', error);
    }
  };

  const acquireLocation = useCallback(async () => {
    setIsLocationLoading(true);
    setLocationError(null);

    try {
      // Use enhanced mobile location service with progressive fallbacks
      const { mobileLocation } = await import('@/lib/mobile-location');
      const locationResult = await mobileLocation.getLocationWithRetry(3);
      
      console.log(`Location acquired via ${locationResult.source}: ${locationResult.accuracy}m accuracy`);
      setCurrentLocation({ lat: locationResult.lat, lng: locationResult.lng });
      
      // Show accuracy info to user
      if (locationResult.accuracy && locationResult.accuracy > 1000) {
        toast({
          title: "Location Found",
          description: `Using ${locationResult.source} location (${Math.round(locationResult.accuracy)}m accuracy)`,
        });
      }
      
      setIsLocationLoading(false);
    } catch (error) {
      console.error('All location methods failed:', error);
      setLocationError('Unable to determine location. Please check location permissions and try again.');
      setIsLocationLoading(false);
    }
  }, [toast]);

  const completeOnboarding = async () => {
    if (!userId) return;

    try {
      // Mark onboarding as complete in localStorage
      localStorage.setItem(`onboarding_complete_${userId}`, 'true');
      
      toast({
        title: "Welcome to Pattern Discovery!",
        description: "You're all set to start exploring architectural patterns"
      });

      // Navigate to main app
      setLocation('/');
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
      toast({
        title: "Setup Error",
        description: "Failed to complete setup. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-2xl">E</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-800">Welcome to EVE</h1>
            <p className="text-gray-600 mt-2">Pattern Discovery Platform</p>
          </div>

          {step === 1 && (
            <div className="space-y-4">
              <div className="text-center">
                <User className="w-12 h-12 text-blue-600 mx-auto mb-3" />
                <h2 className="text-lg font-semibold mb-2">Your Anonymous Identity</h2>
                <p className="text-sm text-gray-600 mb-4">
                  We'll create a unique anonymous identity for you based on your device.
                </p>
                
                <div className="bg-gray-50 p-3 rounded-lg mb-4">
                  <p className="text-sm font-medium text-gray-700">Your Username:</p>
                  <Badge variant="secondary" className="mt-1">{username}</Badge>
                </div>
              </div>
              
              <Button 
                onClick={() => setStep(2)}
                className="w-full"
              >
                Continue
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="text-center">
                <MapPin className="w-12 h-12 text-green-600 mx-auto mb-3" />
                <h2 className="text-lg font-semibold mb-2">Location Access</h2>
                <p className="text-sm text-gray-600 mb-4">
                  We need location access to suggest architectural patterns for your area.
                </p>
                
                {isLocationLoading && (
                  <div className="flex items-center justify-center space-x-2 py-4">
                    <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm text-gray-600">Getting your location...</span>
                  </div>
                )}
                
                {locationError && (
                  <div className="bg-red-50 border border-red-200 p-3 rounded-lg mb-4">
                    <p className="text-sm text-red-600">{locationError}</p>
                  </div>
                )}
                
                {currentLocation && (
                  <div className="bg-green-50 border border-green-200 p-3 rounded-lg mb-4">
                    <p className="text-sm text-green-600">
                      ✓ Location acquired: {currentLocation.lat.toFixed(4)}, {currentLocation.lng.toFixed(4)}
                    </p>
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                {!currentLocation && !isLocationLoading && (
                  <Button 
                    onClick={acquireLocation}
                    className="w-full"
                  >
                    Enable Location Access
                  </Button>
                )}
                
                {currentLocation && (
                  <Button 
                    onClick={() => setStep(3)}
                    className="w-full"
                  >
                    Continue
                  </Button>
                )}
                
                <Button 
                  onClick={() => {
                    // Skip location for now
                    setStep(3);
                  }}
                  variant="outline"
                  className="w-full"
                >
                  Skip for Now
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="text-center">
                <Check className="w-12 h-12 text-green-600 mx-auto mb-3" />
                <h2 className="text-lg font-semibold mb-2">You're All Set!</h2>
                <p className="text-sm text-gray-600 mb-4">
                  Start discovering and voting on architectural patterns in your area.
                </p>
                
                <div className="space-y-3">
                  <div className="flex items-center space-x-3 text-sm text-gray-600">
                    <Shield className="w-4 h-4" />
                    <span>Anonymous and privacy-focused</span>
                  </div>
                  <div className="flex items-center space-x-3 text-sm text-gray-600">
                    <MapPin className="w-4 h-4" />
                    <span>Location-based pattern discovery</span>
                  </div>
                  <div className="flex items-center space-x-3 text-sm text-gray-600">
                    <Coins className="w-4 h-4" />
                    <span>Earn tokens for valuable contributions</span>
                  </div>
                </div>
              </div>
              
              <Button 
                onClick={completeOnboarding}
                className="w-full"
              >
                Start Exploring
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}