import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getDeviceId, getConsistentUserId } from "@/lib/device-fingerprint";
import { getUserDisplayName, getUserColor, getUserInitials } from "@/lib/username-generator";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Fingerprint, Shield, MapPin, Coins, Check, User } from "lucide-react";

export default function OnboardingPage() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);
  const [deviceId, setDeviceId] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [username, setUsername] = useState<string>("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [isExistingUser, setIsExistingUser] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    initializeDevice();
  }, []);

  const initializeDevice = async () => {
    try {
      const deviceFingerprint = await getDeviceId();
      const anonymousUserId = await getConsistentUserId();
      
      setDeviceId(deviceFingerprint);
      setUserId(anonymousUserId);

      // Generate consistent username from device fingerprint
      const generatedUsername = getUserDisplayName(anonymousUserId);
      setUsername(generatedUsername);

      // Check if device is already registered
      const response = await fetch(`/api/check-device/${deviceFingerprint}`);
      if (response.ok) {
        const data = await response.json();
        if (data.exists && data.isActive) {
          setIsExistingUser(true);
          setUsername(data.username || generatedUsername);
          setStep(4); // Show username step for existing users too
        }
      }
    } catch (error) {
      console.error('Failed to initialize device:', error);
    }
  };

  const registerDevice = async () => {
    if (!deviceId || !userId) return;

    setIsRegistering(true);
    try {
      const deviceInfo = {
        screen: `${window.screen.width}x${window.screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: navigator.language,
        platform: navigator.platform
      };

      const response = await apiRequest('POST', '/api/register-device', {
        deviceId,
        userId,
        username,
        deviceFingerprint: JSON.stringify(deviceInfo)
      });

      const data = await response.json();
      
      if (data.registered) {
        toast({
          title: "Registration Complete",
          description: "You can now start discovering patterns in your area",
        });
        setStep(6);
      }
    } catch (error: any) {
      toast({
        title: "Registration Failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsRegistering(false);
    }
  };

  const completeOnboarding = () => {
    setLocation('/');
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="text-center space-y-6">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <MapPin className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-3">Welcome to Pattern Discovery</h2>
              <p className="text-muted-foreground leading-relaxed">
                Discover and influence architectural patterns in your community through location-based democratic participation.
              </p>
            </div>
            <Button onClick={() => setStep(2)} size="lg" className="w-full">
              Get Started
            </Button>
          </div>
        );

      case 2:
        return (
          <div className="text-center space-y-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
              <Shield className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-3">Anonymous & Secure</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Your privacy is protected. We use device fingerprinting to create a unique anonymous identity that prevents multiple accounts while keeping you completely anonymous.
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <Check className="w-4 h-4 text-green-600" />
                  <span>No personal information required</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Check className="w-4 h-4 text-green-600" />
                  <span>One account per device</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Check className="w-4 h-4 text-green-600" />
                  <span>Complete privacy protection</span>
                </div>
              </div>
            </div>
            <Button onClick={() => setStep(3)} size="lg" className="w-full">
              Continue
            </Button>
          </div>
        );

      case 3:
        return (
          <div className="text-center space-y-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <Coins className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-3">Earn Tokens for Location Data</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Contribute valuable spatial data and earn tokens based on data quality and quantity.
              </p>
              <div className="grid grid-cols-1 gap-3 text-sm">
                <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                  <span>GPS Coordinates</span>
                  <Badge variant="secondary">0.5 tokens each</Badge>
                </div>
                <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                  <span>High Accuracy Bonus</span>
                  <Badge variant="secondary">2x multiplier</Badge>
                </div>
                <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                  <span>Time Tracking</span>
                  <Badge variant="secondary">0.1 tokens/min</Badge>
                </div>
              </div>
            </div>
            <Button onClick={() => setStep(4)} size="lg" className="w-full">
              Continue
            </Button>
          </div>
        );

      case 4:
        return (
          <div className="text-center space-y-6">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
              <User className="w-8 h-8 text-orange-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-3">
                {isExistingUser ? "Welcome Back!" : "Your Anonymous Identity"}
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                {isExistingUser 
                  ? "Here's your unique anonymous identity. This username is always the same when you use this device."
                  : "You'll be known by this unique two-word name that's generated from your device. This keeps you anonymous while giving you a memorable identity."
                }
              </p>
              
              {username && (
                <div className="flex flex-col items-center space-y-4 mb-6">
                  <div 
                    className="w-20 h-20 rounded-full flex items-center justify-center text-white text-xl font-bold"
                    style={{ backgroundColor: getUserColor(username) }}
                  >
                    {getUserInitials(username)}
                  </div>
                  <div className="text-xl font-semibold text-foreground">
                    {username}
                  </div>
                </div>
              )}
              
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-2 text-sm">
                <div className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-green-600" />
                  <span>Same username every time you use the app</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-green-600" />
                  <span>Completely anonymous - no personal data</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-green-600" />
                  <span>Unique to your device</span>
                </div>
              </div>
            </div>
            <Button onClick={() => setStep(5)} size="lg" className="w-full">
              Continue
            </Button>
          </div>
        );

      case 5:
        return (
          <div className="text-center space-y-6">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto">
              <Fingerprint className="w-8 h-8 text-purple-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-3">
                {isExistingUser ? "Welcome Back!" : "Register Your Device"}
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                {isExistingUser 
                  ? "Your device is already registered. You can continue using the app with your existing anonymous identity."
                  : "Complete the registration to secure your anonymous identity and start earning tokens."
                }
              </p>
              {!isExistingUser && (
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-2 text-sm">
                  <div className="font-medium">Your Anonymous ID:</div>
                  <div className="font-mono text-xs bg-white dark:bg-gray-700 p-2 rounded border break-all">
                    {userId}
                  </div>
                </div>
              )}
            </div>
            <Button 
              onClick={isExistingUser ? completeOnboarding : registerDevice}
              size="lg" 
              className="w-full"
              disabled={isRegistering}
            >
              {isRegistering ? "Registering..." : isExistingUser ? "Start Exploring" : "Complete Registration"}
            </Button>
          </div>
        );

      case 6:
        return (
          <div className="text-center space-y-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-3">You're All Set!</h2>
              <p className="text-muted-foreground leading-relaxed">
                Your anonymous identity has been created. You can now discover patterns, contribute location data, and participate in democratic urban planning.
              </p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg text-sm">
              <div className="font-medium mb-2">Starting Balance:</div>
              <div className="text-2xl font-bold text-blue-600">100 Tokens</div>
            </div>
            <Button onClick={completeOnboarding} size="lg" className="w-full">
              Start Exploring
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8">
          {/* Progress indicator */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex space-x-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full ${
                    i <= step ? 'bg-primary' : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
          </div>

          {renderStep()}
        </CardContent>
      </Card>
    </div>
  );
}