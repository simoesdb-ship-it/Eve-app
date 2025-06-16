import { db } from "./db";
import { 
  tokenTransactions, 
  sessionTokenBalances, 
  userMedia, 
  userComments,
  mediaViews,
  type InsertTokenTransaction,
  type InsertSessionTokenBalance,
  type InsertUserMedia,
  type InsertUserComment,
  type InsertMediaView
} from "@shared/schema";
import { eq, desc, sum, sql } from "drizzle-orm";

export interface TokenEarningRates {
  location: number;
  photo: number;
  video: number;
  comment: number;
  recommendation: number;
}

// Token earning rates for different content types
export const TOKEN_RATES: TokenEarningRates = {
  location: 10,      // Tokens for saving a location
  photo: 15,         // Tokens for uploading a photo
  video: 25,         // Tokens for uploading a video
  comment: 8,        // Tokens for adding a comment
  recommendation: 12 // Tokens for adding a recommendation
};

// Premium content viewing costs
export const PREMIUM_VIEW_COSTS = {
  photo: 3,    // Cost to view premium photo
  video: 5,    // Cost to view premium video
  comment: 2   // Cost to view premium comment/recommendation
};

export class TokenEconomyService {
  
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

  // Award tokens for content contribution
  async awardTokens(
    sessionId: string,
    contentType: keyof TokenEarningRates,
    contentId: number,
    reason: string,
    qualityMultiplier: number = 1.0
  ): Promise<number> {
    const baseTokens = TOKEN_RATES[contentType];
    const tokensAwarded = Math.floor(baseTokens * qualityMultiplier);

    // Record the transaction
    await db.insert(tokenTransactions).values({
      sessionId,
      transactionType: 'earn',
      amount: tokensAwarded,
      reason,
      relatedContentType: contentType,
      relatedContentId: contentId
    });

    // Update user's balance using SQL increment
    await db
      .update(sessionTokenBalances)
      .set({
        tokenBalance: sql`${sessionTokenBalances.tokenBalance} + ${tokensAwarded}`,
        totalTokensEarned: sql`${sessionTokenBalances.totalTokensEarned} + ${tokensAwarded}`
      })
      .where(eq(sessionTokenBalances.sessionId, sessionId));

    return tokensAwarded;
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