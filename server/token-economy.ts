import { db } from "./db";
import { 
  tokenTransactions, 
  sessionTokenBalances, 
  userMedia, 
  userComments,
  mediaViews,
  tokenSupplyTracking,
  type InsertTokenTransaction,
  type InsertSessionTokenBalance,
  type InsertUserMedia,
  type InsertUserComment,
  type InsertMediaView,
  type InsertTokenSupplyTracking,
  type TokenSupplyTracking
} from "@shared/schema";
import { eq, desc, sum, sql } from "drizzle-orm";

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
  INITIAL_REWARD: 50,          // Initial reward per contribution
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

// Data access costs (for consuming rich spatial analysis)
export const DATA_ACCESS_COSTS = {
  spatialAnalysis: 2,    // Cost to access detailed spatial analysis
  patternInsights: 5,    // Cost to view advanced pattern insights
  communityData: 3       // Cost to access community analysis data
};

export class TokenEconomyService {
  
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
      .where(eq(sessionTokenBalances.sessionId, sessionId));

    return {
      balance: balance.tokenBalance,
      totalEarned: balance.totalTokensEarned,
      totalSpent: balance.totalTokensSpent
    };
  }

  // Award tokens for data contribution (with Bitcoin-like supply cap)
  async awardDataTokens(
    sessionId: string,
    dataType: keyof DataContributionRates,
    dataAmount: number,
    reason: string,
    qualityMultiplier: number = 1.0
  ): Promise<number> {
    // Get current reward multiplier based on supply
    const rewardMultiplier = await this.getCurrentRewardMultiplier();
    
    if (rewardMultiplier === 0) {
      console.log(`🚫 Token cap reached! No more tokens can be minted.`);
      return 0; // No more tokens can be awarded
    }

    const baseRate = DATA_RATES[dataType];
    const tokensAwarded = Math.floor(baseRate * dataAmount * qualityMultiplier * rewardMultiplier);

    // Check if awarding these tokens would exceed the cap
    const supply = await this.getTokenSupplyInfo();
    if (supply.totalSupply + tokensAwarded > TOKEN_SUPPLY.MAX_SUPPLY) {
      const remainingTokens = TOKEN_SUPPLY.MAX_SUPPLY - supply.totalSupply;
      console.log(`⚠️ Near token cap! Only ${remainingTokens} tokens remaining.`);
      
      if (remainingTokens <= 0) {
        await this.markCapReached();
        return 0;
      }
      
      // Award only the remaining tokens
      const finalTokensAwarded = Math.min(tokensAwarded, remainingTokens);
      await this.processDataAward(sessionId, dataType, reason, finalTokensAwarded);
      await this.updateTokenSupply(finalTokensAwarded);
      
      if (supply.totalSupply + finalTokensAwarded >= TOKEN_SUPPLY.MAX_SUPPLY) {
        await this.markCapReached();
      }
      
      return finalTokensAwarded;
    }

    // Normal token awarding process
    await this.processDataAward(sessionId, dataType, reason, tokensAwarded);
    await this.updateTokenSupply(tokensAwarded);

    return tokensAwarded;
  }

  // Helper method to process data award transaction
  private async processDataAward(
    sessionId: string,
    dataType: keyof DataContributionRates,
    reason: string,
    tokensAwarded: number
  ): Promise<void> {
    // Record the transaction
    await db.insert(tokenTransactions).values({
      sessionId,
      transactionType: 'earn',
      amount: tokensAwarded,
      reason,
      relatedContentType: dataType,
      relatedContentId: 0 // Data contributions don't have specific content IDs
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

  // Spend tokens for premium content access
  async spendTokens(
    sessionId: string,
    amount: number,
    reason: string,
    contentType?: string,
    contentId?: number
  ): Promise<boolean> {
    const balance = await this.getTokenBalance(sessionId);
    
    if (balance.balance < amount) {
      return false; // Insufficient balance
    }

    // Record the transaction
    await db.insert(tokenTransactions).values({
      sessionId,
      transactionType: 'spend',
      amount: -amount, // Negative for spending
      reason,
      relatedContentType: contentType || null,
      relatedContentId: contentId || null
    });

    // Update user's balance using SQL decrement/increment
    await db
      .update(sessionTokenBalances)
      .set({
        tokenBalance: sql`${sessionTokenBalances.tokenBalance} - ${amount}`,
        totalTokensSpent: sql`${sessionTokenBalances.totalTokensSpent} + ${amount}`
      })
      .where(eq(sessionTokenBalances.sessionId, sessionId));

    return true;
  }

  // Upload media and earn tokens
  async uploadMedia(
    sessionId: string,
    locationId: number,
    mediaData: {
      mediaType: 'photo' | 'video';
      fileName: string;
      fileSize: number;
      mimeType: string;
      caption?: string;
      isPremium?: boolean;
    }
  ): Promise<{ mediaId: number; tokensEarned: number }> {
    // Calculate quality multiplier based on file size and type
    const qualityMultiplier = this.calculateMediaQualityMultiplier(
      mediaData.mediaType,
      mediaData.fileSize
    );

    const tokensEarned = Math.floor(TOKEN_RATES[mediaData.mediaType] * qualityMultiplier);
    
    // Insert media record
    const [media] = await db
      .insert(userMedia)
      .values({
        locationId,
        sessionId,
        mediaType: mediaData.mediaType,
        fileName: mediaData.fileName,
        fileSize: mediaData.fileSize,
        mimeType: mediaData.mimeType,
        caption: mediaData.caption || null,
        tokensEarned,
        isPremium: mediaData.isPremium || false,
        viewCost: mediaData.isPremium ? PREMIUM_VIEW_COSTS[mediaData.mediaType] : 0
      })
      .returning();

    // Award tokens
    await this.awardTokens(
      sessionId,
      mediaData.mediaType,
      media.id,
      `Uploaded ${mediaData.mediaType}`,
      qualityMultiplier
    );

    return { mediaId: media.id, tokensEarned };
  }

  // Add comment and earn tokens
  async addComment(
    sessionId: string,
    locationId: number,
    commentData: {
      content: string;
      commentType: 'recommendation' | 'observation' | 'pattern_analysis';
      isPremium?: boolean;
    }
  ): Promise<{ commentId: number; tokensEarned: number }> {
    const contentType = commentData.commentType === 'recommendation' ? 'recommendation' : 'comment';
    const tokensEarned = TOKEN_RATES[contentType];

    // Insert comment record
    const [comment] = await db
      .insert(userComments)
      .values({
        locationId,
        sessionId,
        content: commentData.content,
        commentType: commentData.commentType,
        tokensEarned,
        isPremium: commentData.isPremium || false,
        viewCost: commentData.isPremium ? PREMIUM_VIEW_COSTS.comment : 0
      })
      .returning();

    // Award tokens
    await this.awardTokens(
      sessionId,
      contentType,
      comment.id,
      `Added ${commentData.commentType}`
    );

    return { commentId: comment.id, tokensEarned };
  }

  // View premium media (spend tokens)
  async viewPremiumMedia(
    viewerSessionId: string,
    mediaId: number
  ): Promise<{ success: boolean; cost: number; media?: any }> {
    // Get media details
    const [media] = await db
      .select()
      .from(userMedia)
      .where(eq(userMedia.id, mediaId));

    if (!media) {
      return { success: false, cost: 0 };
    }

    if (!media.isPremium) {
      // Free content, no tokens required
      return { success: true, cost: 0, media };
    }

    // Check if user has already viewed this media
    const existingView = await db
      .select()
      .from(mediaViews)
      .where(
        eq(mediaViews.mediaId, mediaId) &&
        eq(mediaViews.viewerSessionId, viewerSessionId)
      )
      .limit(1);

    if (existingView.length > 0) {
      // Already purchased, allow free access
      return { success: true, cost: 0, media };
    }

    const cost = media.viewCost;
    const paymentSuccess = await this.spendTokens(
      viewerSessionId,
      cost,
      `Viewed premium ${media.mediaType}`,
      'media',
      mediaId
    );

    if (!paymentSuccess) {
      return { success: false, cost };
    }

    // Record the view
    await db.insert(mediaViews).values({
      mediaId,
      viewerSessionId,
      tokensPaid: cost
    });

    return { success: true, cost, media };
  }

  // Get user's recent transactions
  async getTransactionHistory(sessionId: string, limit: number = 20): Promise<any[]> {
    return await db
      .select()
      .from(tokenTransactions)
      .where(eq(tokenTransactions.sessionId, sessionId))
      .orderBy(desc(tokenTransactions.createdAt))
      .limit(limit);
  }

  // Calculate quality multiplier for media based on size and type
  private calculateMediaQualityMultiplier(mediaType: 'photo' | 'video', fileSize: number): number {
    // Higher quality (larger files) get bonus tokens
    if (mediaType === 'photo') {
      if (fileSize > 5000000) return 1.5; // > 5MB
      if (fileSize > 2000000) return 1.2; // > 2MB
      return 1.0;
    } else { // video
      if (fileSize > 50000000) return 1.5; // > 50MB
      if (fileSize > 20000000) return 1.2; // > 20MB
      return 1.0;
    }
  }
}

export const tokenEconomy = new TokenEconomyService();