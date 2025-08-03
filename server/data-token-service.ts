import { db } from "./db";
import { 
  tokenTransactions, 
  sessionTokenBalances, 
  spatialPoints,
  tokenSupplyTracking,
  type InsertTokenTransaction,
  type TokenSupplyTracking
} from "@shared/schema";
import { eq, desc, sql, and, gte } from "drizzle-orm";

export interface DataContributionRates {
  locationPoint: number;        // Tokens per GPS coordinate recorded
  accuracyBonus: number;        // Multiplier for high-precision GPS data
  timeTracking: number;         // Tokens per minute of location tracking
  spatialDensity: number;       // Bonus for areas with rich spatial data
  patternContribution: number;  // Tokens for meaningful pattern analysis
  communityInsight: number;     // Tokens for valuable community observations
}

// Token supply constants (Bitcoin-like cap system)
export const TOKEN_SUPPLY = {
  MAX_SUPPLY: 21000000,        // Maximum tokens that will ever exist (21 million like Bitcoin)
  HALVING_INTERVAL: 2100000,   // Halving every 2.1 million tokens (like Bitcoin)
  MIN_REWARD: 0.1,             // Minimum reward (never goes below this)
  GENESIS_BLOCK_REWARD: 5000   // Initial distribution for early adopters
};

// Data-driven token earning rates (based on actual data contribution)
export const DATA_RATES: DataContributionRates = {
  locationPoint: 0.5,     // Tokens per GPS coordinate recorded
  accuracyBonus: 2.0,     // 2x multiplier for GPS accuracy < 5 meters
  timeTracking: 0.1,      // Tokens per minute of location tracking
  spatialDensity: 1.5,    // Bonus for contributing to data-sparse areas
  patternContribution: 8, // Tokens for pattern analysis contributions
  communityInsight: 15    // Tokens for valuable community insights
};

export class DataTokenService {
  
  // Initialize global token supply tracking
  async initializeTokenSupply(): Promise<void> {
    const existing = await db
      .select()
      .from(tokenSupplyTracking)
      .limit(1);

    if (existing.length === 0) {
      await db.insert(tokenSupplyTracking).values({
        totalSupply: TOKEN_SUPPLY.GENESIS_BLOCK_REWARD,
        tokensInCirculation: TOKEN_SUPPLY.GENESIS_BLOCK_REWARD,
        currentRewardMultiplier: "1.0000",
        lastHalvingAt: 0,
        nextHalvingAt: TOKEN_SUPPLY.HALVING_INTERVAL,
        isCapReached: false
      });
    }
  }

  // Get current token supply information
  async getTokenSupplyInfo(): Promise<TokenSupplyTracking> {
    await this.initializeTokenSupply();
    
    const [supply] = await db
      .select()
      .from(tokenSupplyTracking)
      .limit(1);

    return supply;
  }

  // Calculate current reward multiplier based on supply and halving
  async getCurrentRewardMultiplier(): Promise<number> {
    const supply = await this.getTokenSupplyInfo();
    
    if (supply.isCapReached) {
      return 0; // No more tokens can be minted
    }

    // Check if we need to trigger a halving event
    if (supply.totalSupply >= supply.nextHalvingAt && !supply.isCapReached) {
      await this.triggerHalvingEvent();
      return await this.getCurrentRewardMultiplier(); // Recursively get updated multiplier
    }

    return parseFloat(supply.currentRewardMultiplier);
  }

  // Trigger halving event (like Bitcoin)
  async triggerHalvingEvent(): Promise<void> {
    const supply = await this.getTokenSupplyInfo();
    const newMultiplier = Math.max(
      parseFloat(supply.currentRewardMultiplier) / 2,
      TOKEN_SUPPLY.MIN_REWARD / DATA_RATES.locationPoint // Ensure minimum viable rewards
    );

    // Check if we've reached the cap
    const isCapReached = supply.totalSupply >= TOKEN_SUPPLY.MAX_SUPPLY;

    await db
      .update(tokenSupplyTracking)
      .set({
        currentRewardMultiplier: newMultiplier.toFixed(4),
        lastHalvingAt: supply.totalSupply,
        nextHalvingAt: supply.totalSupply + TOKEN_SUPPLY.HALVING_INTERVAL,
        isCapReached,
        updatedAt: new Date()
      })
      .where(eq(tokenSupplyTracking.id, supply.id));

    console.log(`🎉 HALVING EVENT! Reward multiplier reduced to ${newMultiplier.toFixed(4)}x`);
    console.log(`📊 Total supply: ${supply.totalSupply.toLocaleString()}/${TOKEN_SUPPLY.MAX_SUPPLY.toLocaleString()}`);
  }

  // Initialize user's token balance if it doesn't exist
  async initializeUserBalance(sessionId: string): Promise<void> {
    const existing = await db
      .select()
      .from(sessionTokenBalances)
      .where(eq(sessionTokenBalances.sessionId, sessionId))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(sessionTokenBalances).values({
        sessionId,
        tokenBalance: 100, // Starting balance
        totalTokensEarned: 0,
        totalTokensSpent: 0
      });
    }
  }

  // Get user's current token balance
  async getTokenBalance(sessionId: string): Promise<{
    balance: number;
    totalEarned: number;
    totalSpent: number;
  }> {
    await this.initializeUserBalance(sessionId);
    
    const [balance] = await db
      .select()
      .from(sessionTokenBalances)
      .where(eq(sessionTokenBalances.sessionId, sessionId))
      .limit(1);

    return {
      balance: balance.tokenBalance,
      totalEarned: balance.totalTokensEarned,
      totalSpent: balance.totalTokensSpent
    };
  }

  // Award tokens for location tracking data
  async awardLocationData(
    sessionId: string,
    coordinatesCount: number,
    accuracyMeters: number = 10,
    trackingMinutes: number = 1
  ): Promise<number> {
    // Get current reward multiplier based on supply
    const rewardMultiplier = await this.getCurrentRewardMultiplier();
    
    if (rewardMultiplier === 0) {
      console.log(`🚫 Token cap reached! No more tokens can be minted.`);
      return 0; // No more tokens can be awarded
    }

    let totalTokens = 0;

    // Award tokens for GPS coordinates
    const baseRate = DATA_RATES.locationPoint;
    let coordinateTokens = baseRate * coordinatesCount * rewardMultiplier;

    // Bonus for high accuracy GPS (< 5 meters)
    if (accuracyMeters < 5) {
      coordinateTokens *= DATA_RATES.accuracyBonus;
    }

    // Award tokens for time spent tracking
    const timeRate = DATA_RATES.timeTracking;
    const timeTokens = timeRate * trackingMinutes * rewardMultiplier;

    totalTokens = Math.floor(coordinateTokens + timeTokens);

    // Check if awarding these tokens would exceed the cap
    const supply = await this.getTokenSupplyInfo();
    if (supply.totalSupply + totalTokens > TOKEN_SUPPLY.MAX_SUPPLY) {
      const remainingTokens = TOKEN_SUPPLY.MAX_SUPPLY - supply.totalSupply;
      totalTokens = Math.min(totalTokens, remainingTokens);
      
      if (totalTokens <= 0) {
        await this.markCapReached();
        return 0;
      }
    }

    // Award the tokens
    await this.processDataAward(sessionId, totalTokens, `Location data: ${coordinatesCount} points, ${trackingMinutes}min`);
    await this.updateTokenSupply(totalTokens);

    return totalTokens;
  }

  // Helper method to process data award transaction
  private async processDataAward(
    sessionId: string,
    tokensAwarded: number,
    reason: string
  ): Promise<void> {
    // Record the transaction
    await db.insert(tokenTransactions).values({
      sessionId,
      transactionType: 'earn',
      amount: tokensAwarded,
      reason,
      relatedContentType: 'locationData',
      relatedContentId: 0
    });

    // Update user's balance using SQL increment
    await db
      .update(sessionTokenBalances)
      .set({
        tokenBalance: sql`${sessionTokenBalances.tokenBalance} + ${tokensAwarded}`,
        totalTokensEarned: sql`${sessionTokenBalances.totalTokensEarned} + ${tokensAwarded}`
      })
      .where(eq(sessionTokenBalances.sessionId, sessionId));
  }

  // Update global token supply
  private async updateTokenSupply(tokensAwarded: number): Promise<void> {
    const supply = await this.getTokenSupplyInfo();
    
    await db
      .update(tokenSupplyTracking)
      .set({
        totalSupply: sql`${tokenSupplyTracking.totalSupply} + ${tokensAwarded}`,
        tokensInCirculation: sql`${tokenSupplyTracking.tokensInCirculation} + ${tokensAwarded}`,
        updatedAt: new Date()
      })
      .where(eq(tokenSupplyTracking.id, supply.id));
  }

  // Mark that the token cap has been reached
  private async markCapReached(): Promise<void> {
    const supply = await this.getTokenSupplyInfo();
    
    await db
      .update(tokenSupplyTracking)
      .set({
        isCapReached: true,
        currentRewardMultiplier: "0.0000",
        updatedAt: new Date()
      })
      .where(eq(tokenSupplyTracking.id, supply.id));

    console.log(`🎉 TOKEN CAP REACHED! All ${TOKEN_SUPPLY.MAX_SUPPLY.toLocaleString()} tokens have been minted.`);
  }

  // Get transaction history
  async getTransactionHistory(sessionId: string, limit: number = 20): Promise<any[]> {
    const transactions = await db
      .select()
      .from(tokenTransactions)
      .where(eq(tokenTransactions.sessionId, sessionId))
      .orderBy(desc(tokenTransactions.createdAt))
      .limit(limit);

    return transactions;
  }

  // Calculate data quality multiplier based on location accuracy and density
  private calculateDataQualityMultiplier(accuracyMeters: number, nearbyPointsCount: number): number {
    let multiplier = 1.0;
    
    // Accuracy bonus
    if (accuracyMeters < 5) {
      multiplier *= 1.5; // 50% bonus for high accuracy
    } else if (accuracyMeters < 10) {
      multiplier *= 1.2; // 20% bonus for good accuracy
    }
    
    // Sparse area bonus (if few nearby points, more valuable)
    if (nearbyPointsCount < 5) {
      multiplier *= 1.3; // 30% bonus for contributing to sparse areas
    }
    
    return multiplier;
  }
}

export const dataTokenService = new DataTokenService();