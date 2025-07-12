import { storage } from "./storage";
import { dataTokenService } from "./data-token-service";

export interface TokenRewardConfig {
  locationTracking: {
    baseReward: number;           // Base tokens per tracking point
    accuracyMultiplier: number;   // Bonus for high GPS accuracy
    movementMultiplier: {         // Movement type multipliers
      stationary: number;
      walking: number;
      biking: number;
      driving: number;
      transit: number;
    };
    timeBasedBonus: {             // Bonus for continuous tracking
      minimumMinutes: number;
      bonusPerMinute: number;
      maxBonus: number;
    };
    spatialDensityBonus: {        // Bonus for tracking in data-rich areas
      baseThreshold: number;      // Minimum nearby points
      bonusPerPoint: number;
      maxBonus: number;
    };
  };
  patternContribution: {
    patternSuggestion: number;    // Tokens for suggesting patterns
    patternVote: number;          // Tokens for voting on patterns
    qualityBonus: {               // Bonus for high-quality contributions
      highConfidencePattern: number;
      communityUpvotes: number;
      expertValidation: number;
    };
  };
  communityEngagement: {
    dailyActiveBonus: number;     // Bonus for daily app usage
    weeklyStreakMultiplier: number; // Multiplier for consecutive days
    socialInteraction: {
      voteOnOthersPatterns: number;
      helpfulVoting: number;      // Bonus for constructive voting
    };
  };
}

export const AUTOMATED_REWARDS: TokenRewardConfig = {
  locationTracking: {
    baseReward: 0.5,
    accuracyMultiplier: 1.2,
    movementMultiplier: {
      stationary: 1.0,
      walking: 1.2,
      biking: 0.8,
      driving: 0.3,
      transit: 0.6
    },
    timeBasedBonus: {
      minimumMinutes: 5,
      bonusPerMinute: 0.1,
      maxBonus: 5.0
    },
    spatialDensityBonus: {
      baseThreshold: 10,
      bonusPerPoint: 0.05,
      maxBonus: 2.0
    }
  },
  patternContribution: {
    patternSuggestion: 5.0,
    patternVote: 1.0,
    qualityBonus: {
      highConfidencePattern: 3.0,
      communityUpvotes: 0.5,
      expertValidation: 10.0
    }
  },
  communityEngagement: {
    dailyActiveBonus: 2.0,
    weeklyStreakMultiplier: 1.1,
    socialInteraction: {
      voteOnOthersPatterns: 0.8,
      helpfulVoting: 1.5
    }
  }
};

interface AutomatedRewardResult {
  tokensAwarded: number;
  rewardBreakdown: {
    category: string;
    amount: number;
    description: string;
  }[];
  totalBalance: number;
  achievements?: string[];
}

export class AutomatedTokenService {
  private recentlyRewarded = new Set<string>(); // Track recent rewards to prevent duplication

  async processLocationTracking(sessionId: string, spatialPointId: number): Promise<AutomatedRewardResult> {
    const rewardKey = `location_${sessionId}_${spatialPointId}`;
    if (this.recentlyRewarded.has(rewardKey)) {
      return { tokensAwarded: 0, rewardBreakdown: [], totalBalance: 0 };
    }

    try {
      // Get spatial point details
      const trackingPoints = await storage.getTrackingPointsBySession(sessionId);
      const currentPoint = trackingPoints.find(p => p.id === spatialPointId);
      
      if (!currentPoint) {
        throw new Error('Spatial point not found');
      }

      const rewardBreakdown: any[] = [];
      let totalTokens = 0;

      // Base reward for location tracking
      const baseReward = AUTOMATED_REWARDS.locationTracking.baseReward;
      totalTokens += baseReward;
      rewardBreakdown.push({
        category: 'Location Tracking',
        amount: baseReward,
        description: 'GPS coordinate recorded'
      });

      // Movement type multiplier
      const movementType = currentPoint.movementType || 'walking';
      const movementMultiplier = AUTOMATED_REWARDS.locationTracking.movementMultiplier[
        movementType as keyof typeof AUTOMATED_REWARDS.locationTracking.movementMultiplier
      ] || 1.0;
      
      if (movementMultiplier !== 1.0) {
        const movementBonus = baseReward * (movementMultiplier - 1.0);
        totalTokens += movementBonus;
        rewardBreakdown.push({
          category: 'Movement Type',
          amount: movementBonus,
          description: `${movementType} movement (${movementMultiplier}x)`
        });
      }

      // Accuracy bonus
      const accuracy = Number(currentPoint.accuracy) || 100;
      if (accuracy < 20) { // High accuracy GPS (< 20m)
        const accuracyBonus = baseReward * (AUTOMATED_REWARDS.locationTracking.accuracyMultiplier - 1.0);
        totalTokens += accuracyBonus;
        rewardBreakdown.push({
          category: 'GPS Accuracy',
          amount: accuracyBonus,
          description: `High precision GPS (${accuracy.toFixed(1)}m)`
        });
      }

      // Time-based continuous tracking bonus
      const timeBonus = await this.calculateTimeTrackingBonus(sessionId, currentPoint);
      if (timeBonus > 0) {
        totalTokens += timeBonus;
        rewardBreakdown.push({
          category: 'Continuous Tracking',
          amount: timeBonus,
          description: 'Extended location tracking session'
        });
      }

      // Spatial density bonus (tracking in data-rich areas)
      const densityBonus = await this.calculateSpatialDensityBonus(currentPoint);
      if (densityBonus > 0) {
        totalTokens += densityBonus;
        rewardBreakdown.push({
          category: 'Spatial Density',
          amount: densityBonus,
          description: 'Contributing to data-rich area'
        });
      }

      // Award tokens through the main token service
      await dataTokenService.awardLocationData(
        sessionId,
        Number(currentPoint.latitude),
        Number(currentPoint.longitude),
        accuracy,
        trackingPoints.length
      );

      // Get updated balance
      const balance = await dataTokenService.getTokenBalance(sessionId);

      // Mark as rewarded
      this.recentlyRewarded.add(rewardKey);
      setTimeout(() => this.recentlyRewarded.delete(rewardKey), 300000); // 5 min cooldown

      return {
        tokensAwarded: totalTokens,
        rewardBreakdown,
        totalBalance: balance.balance,
        achievements: this.checkAchievements(balance, trackingPoints.length)
      };

    } catch (error) {
      console.error('Error processing location tracking reward:', error);
      return { tokensAwarded: 0, rewardBreakdown: [], totalBalance: 0 };
    }
  }

  async processPatternContribution(sessionId: string, suggestionId: number, isVote: boolean = false): Promise<AutomatedRewardResult> {
    const rewardKey = `pattern_${sessionId}_${suggestionId}_${isVote ? 'vote' : 'suggest'}`;
    if (this.recentlyRewarded.has(rewardKey)) {
      return { tokensAwarded: 0, rewardBreakdown: [], totalBalance: 0 };
    }

    try {
      const rewardBreakdown: any[] = [];
      let totalTokens = 0;

      if (isVote) {
        // Reward for voting on patterns
        const voteReward = AUTOMATED_REWARDS.patternContribution.patternVote;
        totalTokens += voteReward;
        rewardBreakdown.push({
          category: 'Pattern Voting',
          amount: voteReward,
          description: 'Community voting participation'
        });

        // Bonus for voting on others' patterns (not your own)
        const suggestion = await this.getPatternSuggestion(suggestionId);
        if (suggestion && suggestion.sessionId !== sessionId) {
          const socialBonus = AUTOMATED_REWARDS.communityEngagement.socialInteraction.voteOnOthersPatterns;
          totalTokens += socialBonus;
          rewardBreakdown.push({
            category: 'Social Engagement',
            amount: socialBonus,
            description: 'Voting on community patterns'
          });
        }
      } else {
        // Reward for suggesting patterns
        const suggestionReward = AUTOMATED_REWARDS.patternContribution.patternSuggestion;
        totalTokens += suggestionReward;
        rewardBreakdown.push({
          category: 'Pattern Suggestion',
          amount: suggestionReward,
          description: 'Architectural pattern contribution'
        });

        // Quality bonus for high-confidence patterns
        const suggestion = await this.getPatternSuggestion(suggestionId);
        if (suggestion && suggestion.confidence > 0.8) {
          const qualityBonus = AUTOMATED_REWARDS.patternContribution.qualityBonus.highConfidencePattern;
          totalTokens += qualityBonus;
          rewardBreakdown.push({
            category: 'High Quality',
            amount: qualityBonus,
            description: 'High-confidence pattern match'
          });
        }
      }

      // Award through data token service (simplified for pattern contributions)
      const dummyLat = 44.9; // Placeholder coordinates for pattern rewards
      const dummyLng = -93.0;
      await dataTokenService.awardLocationData(sessionId, dummyLat, dummyLng, 50, 1);

      // Get updated balance
      const balance = await dataTokenService.getTokenBalance(sessionId);

      // Mark as rewarded
      this.recentlyRewarded.add(rewardKey);
      setTimeout(() => this.recentlyRewarded.delete(rewardKey), 300000); // 5 min cooldown

      return {
        tokensAwarded: totalTokens,
        rewardBreakdown,
        totalBalance: balance.balance
      };

    } catch (error) {
      console.error('Error processing pattern contribution reward:', error);
      return { tokensAwarded: 0, rewardBreakdown: [], totalBalance: 0 };
    }
  }

  async processDailyActiveBonus(sessionId: string): Promise<AutomatedRewardResult> {
    const today = new Date().toDateString();
    const rewardKey = `daily_${sessionId}_${today}`;
    
    if (this.recentlyRewarded.has(rewardKey)) {
      return { tokensAwarded: 0, rewardBreakdown: [], totalBalance: 0 };
    }

    try {
      const dailyBonus = AUTOMATED_REWARDS.communityEngagement.dailyActiveBonus;
      const rewardBreakdown = [{
        category: 'Daily Active',
        amount: dailyBonus,
        description: 'Daily app engagement bonus'
      }];

      // Check for weekly streak
      const streakMultiplier = await this.calculateWeeklyStreak(sessionId);
      let totalTokens = dailyBonus;

      if (streakMultiplier > 1.0) {
        const streakBonus = dailyBonus * (streakMultiplier - 1.0);
        totalTokens += streakBonus;
        rewardBreakdown.push({
          category: 'Weekly Streak',
          amount: streakBonus,
          description: `${Math.round((streakMultiplier - 1) * 100)}% streak bonus`
        });
      }

      // Award through data token service
      await dataTokenService.awardLocationData(sessionId, 44.9, -93.0, 50, 1);

      const balance = await dataTokenService.getTokenBalance(sessionId);

      // Mark as rewarded
      this.recentlyRewarded.add(rewardKey);
      setTimeout(() => this.recentlyRewarded.delete(rewardKey), 86400000); // 24 hour cooldown

      return {
        tokensAwarded: totalTokens,
        rewardBreakdown,
        totalBalance: balance.balance
      };

    } catch (error) {
      console.error('Error processing daily active bonus:', error);
      return { tokensAwarded: 0, rewardBreakdown: [], totalBalance: 0 };
    }
  }

  private async calculateTimeTrackingBonus(sessionId: string, currentPoint: any): Promise<number> {
    try {
      const trackingPoints = await storage.getTrackingPointsBySession(sessionId);
      const recentPoints = trackingPoints.filter(p => {
        const pointTime = new Date(p.createdAt).getTime();
        const currentTime = new Date(currentPoint.createdAt).getTime();
        const diffMinutes = (currentTime - pointTime) / (1000 * 60);
        return diffMinutes <= 60; // Last hour
      });

      if (recentPoints.length < 2) return 0;

      // Calculate continuous tracking duration
      const totalMinutes = recentPoints.length * 2; // Approximate 2 minutes per point
      const config = AUTOMATED_REWARDS.locationTracking.timeBasedBonus;

      if (totalMinutes >= config.minimumMinutes) {
        const bonus = Math.min(
          (totalMinutes - config.minimumMinutes) * config.bonusPerMinute,
          config.maxBonus
        );
        return bonus;
      }

      return 0;
    } catch (error) {
      console.error('Error calculating time tracking bonus:', error);
      return 0;
    }
  }

  private async calculateSpatialDensityBonus(currentPoint: any): Promise<number> {
    try {
      const nearbyPoints = await storage.getTrackingPointsInRadius(
        Number(currentPoint.latitude),
        Number(currentPoint.longitude),
        0.5, // 500m radius
        currentPoint.sessionId
      );

      const config = AUTOMATED_REWARDS.locationTracking.spatialDensityBonus;
      
      if (nearbyPoints.length >= config.baseThreshold) {
        const bonus = Math.min(
          (nearbyPoints.length - config.baseThreshold) * config.bonusPerPoint,
          config.maxBonus
        );
        return bonus;
      }

      return 0;
    } catch (error) {
      console.error('Error calculating spatial density bonus:', error);
      return 0;
    }
  }

  private async calculateWeeklyStreak(sessionId: string): Promise<number> {
    try {
      // Simplified streak calculation - would need persistent storage for real implementation
      const trackingPoints = await storage.getTrackingPointsBySession(sessionId);
      const uniqueDays = new Set(
        trackingPoints.map(p => new Date(p.createdAt).toDateString())
      );

      const daysActive = uniqueDays.size;
      const baseMultiplier = AUTOMATED_REWARDS.communityEngagement.weeklyStreakMultiplier;
      
      return Math.pow(baseMultiplier, Math.min(daysActive - 1, 7)); // Max 7-day streak
    } catch (error) {
      console.error('Error calculating weekly streak:', error);
      return 1.0;
    }
  }

  private async getPatternSuggestion(suggestionId: number) {
    try {
      // Would need to implement this in storage interface
      return null; // Placeholder
    } catch (error) {
      return null;
    }
  }

  private checkAchievements(balance: any, totalTrackingPoints: number): string[] {
    const achievements: string[] = [];

    // Tracking milestones
    if (totalTrackingPoints === 10) achievements.push('🗺️ Explorer - 10 locations tracked');
    if (totalTrackingPoints === 50) achievements.push('🌍 Navigator - 50 locations tracked');
    if (totalTrackingPoints === 100) achievements.push('🏆 Cartographer - 100 locations tracked');

    // Token milestones
    if (balance.balance >= 100) achievements.push('💰 Token Collector - 100 tokens earned');
    if (balance.balance >= 500) achievements.push('💎 Token Master - 500 tokens earned');

    return achievements;
  }
}

export const automatedTokenService = new AutomatedTokenService();