import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Coins, 
  MapPin, 
  TrendingUp, 
  Star, 
  X,
  CheckCircle,
  Gift,
  Activity
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface TokenReward {
  tokensAwarded: number;
  rewardBreakdown: Array<{
    category: string;
    amount: number;
    description: string;
  }>;
  totalBalance: number;
  achievements?: string[];
}

interface TokenRewardNotificationProps {
  reward: TokenReward | null;
  onDismiss: () => void;
  sessionId: string;
}

export default function TokenRewardNotification({ reward, onDismiss, sessionId }: TokenRewardNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (reward && reward.tokensAwarded > 0) {
      setIsVisible(true);
      // Auto-dismiss after 8 seconds
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onDismiss, 300); // Wait for animation to complete
      }, 8000);

      return () => clearTimeout(timer);
    }
  }, [reward, onDismiss]);

  if (!reward || reward.tokensAwarded <= 0) return null;

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'location tracking':
        return <MapPin className="h-4 w-4" />;
      case 'movement type':
        return <Activity className="h-4 w-4" />;
      case 'gps accuracy':
        return <Star className="h-4 w-4" />;
      case 'continuous tracking':
        return <TrendingUp className="h-4 w-4" />;
      case 'spatial density':
        return <CheckCircle className="h-4 w-4" />;
      case 'pattern suggestion':
      case 'pattern voting':
        return <Gift className="h-4 w-4" />;
      default:
        return <Coins className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'location tracking':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'movement type':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'gps accuracy':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'continuous tracking':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'spatial density':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'pattern suggestion':
      case 'pattern voting':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -100, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -100, scale: 0.8 }}
          transition={{ 
            type: "spring", 
            stiffness: 200, 
            damping: 20,
            duration: 0.6
          }}
          className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md px-4"
        >
          <Card className="shadow-2xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5">
            <CardContent className="p-4">
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  >
                    <Coins className="h-6 w-6 text-primary" />
                  </motion.div>
                  <div>
                    <div className="font-bold text-lg text-primary">
                      +{reward.tokensAwarded.toFixed(1)} Tokens!
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Balance: {reward.totalBalance.toFixed(1)} tokens
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsVisible(false);
                    setTimeout(onDismiss, 300);
                  }}
                  className="h-8 w-8 p-0 hover:bg-muted"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Reward Breakdown */}
              <div className="space-y-2 mb-3">
                {reward.rewardBreakdown.map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 + 0.3 }}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`text-xs ${getCategoryColor(item.category)}`}>
                        <div className="flex items-center gap-1">
                          {getCategoryIcon(item.category)}
                          {item.category}
                        </div>
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="font-medium text-primary">
                        +{item.amount.toFixed(1)}
                      </span>
                      <Coins className="h-3 w-3 text-primary" />
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Achievements */}
              {reward.achievements && reward.achievements.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  className="border-t pt-3"
                >
                  <div className="text-sm font-medium mb-2 text-primary">
                    🎉 New Achievements!
                  </div>
                  <div className="space-y-1">
                    {reward.achievements.map((achievement, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.9 + index * 0.1 }}
                        className="text-xs p-2 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-md"
                      >
                        {achievement}
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Description */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
                className="text-xs text-muted-foreground mt-3 text-center"
              >
                Keep exploring to earn more tokens! 🗺️
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}