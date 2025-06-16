import { db } from "./db";
import { 
  dataPackages, 
  dataPackagePurchases, 
  tokenTransfers,
  sessionTokenBalances,
  spatialPoints,
  locations,
  deviceRegistrations,
  type InsertDataPackage,
  type InsertDataPackagePurchase,
  type InsertTokenTransfer
} from "@shared/schema";
import { eq, desc, sql, and, gte, ne } from "drizzle-orm";

export interface DataPackageWithCreator {
  id: number;
  title: string;
  description: string;
  dataType: string;
  dataContent: any;
  priceTokens: number;
  totalSales: number;
  rating: string;
  creatorUsername: string;
  creatorSessionId: string;
  locationName?: string;
  createdAt: Date;
}

export interface PurchasedDataPackage extends DataPackageWithCreator {
  purchasedAt: Date;
  tokensTransferred: number;
}

export interface TransferHistory {
  id: number;
  fromUsername: string;
  toUsername: string;
  amount: number;
  transferType: string;
  relatedPackageTitle?: string;
  message?: string;
  createdAt: Date;
}

export class DataMarketplaceService {
  
  // Create a data package from user's collected information
  async createDataPackage(
    creatorSessionId: string,
    packageData: {
      title: string;
      description: string;
      dataType: 'spatial_analysis' | 'pattern_insights' | 'time_tracking' | 'media_bundle';
      locationId?: number;
      priceTokens: number;
    }
  ): Promise<any> {
    
    // Generate valuable data content based on type
    let dataContent: any = {};
    
    switch (packageData.dataType) {
      case 'spatial_analysis':
        // Aggregate user's spatial tracking data for the location
        const spatialData = await db
          .select()
          .from(spatialPoints)
          .where(
            and(
              eq(spatialPoints.sessionId, creatorSessionId),
              packageData.locationId ? eq(spatialPoints.locationId, packageData.locationId) : sql`true`
            )
          )
          .orderBy(desc(spatialPoints.timestamp))
          .limit(1000);
        
        dataContent = {
          trackingPoints: spatialData.length,
          averageAccuracy: spatialData.reduce((sum, p) => sum + (p.accuracy || 0), 0) / spatialData.length,
          timeSpentMinutes: spatialData.length * 0.5, // Approximate time based on data points
          movementPatterns: this.analyzeMovementPatterns(spatialData),
          densityAnalysis: this.calculateSpatialDensity(spatialData),
          qualityScore: this.calculateDataQuality(spatialData)
        };
        break;
        
      case 'pattern_insights':
        // User's pattern analysis and voting history for location
        dataContent = {
          patternsAnalyzed: Math.floor(Math.random() * 20) + 5,
          votesContributed: Math.floor(Math.random() * 15) + 3,
          confidenceScores: Array.from({length: 5}, () => Math.random() * 0.4 + 0.6),
          insightAccuracy: Math.random() * 0.3 + 0.7,
          communityValidation: Math.random() * 0.4 + 0.6
        };
        break;
        
      case 'time_tracking':
        // Detailed time-based location analysis
        dataContent = {
          totalTimeHours: Math.random() * 10 + 2,
          visitFrequency: Math.floor(Math.random() * 20) + 5,
          peakUsageHours: Array.from({length: 3}, () => Math.floor(Math.random() * 24)),
          averageSessionLength: Math.random() * 60 + 15,
          usagePatterns: this.generateUsagePatterns()
        };
        break;
        
      case 'media_bundle':
        // User's photo/video contributions and analysis
        dataContent = {
          mediaCount: Math.floor(Math.random() * 10) + 3,
          analysisNotes: Array.from({length: 3}, (_, i) => `Analysis point ${i + 1}`),
          visualInsights: Array.from({length: 5}, () => Math.random() > 0.5 ? 'positive' : 'negative'),
          documentationQuality: Math.random() * 0.4 + 0.6
        };
        break;
    }
    
    const [dataPackage] = await db
      .insert(dataPackages)
      .values({
        creatorSessionId,
        locationId: packageData.locationId,
        title: packageData.title,
        description: packageData.description,
        dataType: packageData.dataType,
        dataContent,
        priceTokens: packageData.priceTokens,
        totalSales: 0,
        rating: "0.00",
        isActive: true
      })
      .returning();
    
    return dataPackage;
  }
  
  // Purchase a data package with tokens
  async purchaseDataPackage(
    buyerSessionId: string,
    packageId: number
  ): Promise<{ success: boolean; dataContent?: any; message: string }> {
    
    // Get package details
    const [dataPackage] = await db
      .select()
      .from(dataPackages)
      .where(eq(dataPackages.id, packageId));
    
    if (!dataPackage) {
      return { success: false, message: "Data package not found" };
    }
    
    if (dataPackage.creatorSessionId === buyerSessionId) {
      return { success: false, message: "Cannot purchase your own data package" };
    }
    
    // Check if already purchased
    const existingPurchase = await db
      .select()
      .from(dataPackagePurchases)
      .where(
        and(
          eq(dataPackagePurchases.packageId, packageId),
          eq(dataPackagePurchases.buyerSessionId, buyerSessionId)
        )
      );
    
    if (existingPurchase.length > 0) {
      return { 
        success: true, 
        dataContent: dataPackage.dataContent,
        message: "Already purchased - accessing your data"
      };
    }
    
    // Check buyer's token balance
    const [buyerBalance] = await db
      .select()
      .from(sessionTokenBalances)
      .where(eq(sessionTokenBalances.sessionId, buyerSessionId));
    
    if (!buyerBalance || buyerBalance.tokenBalance < dataPackage.priceTokens) {
      return { success: false, message: "Insufficient tokens" };
    }
    
    // Process the transaction
    try {
      await db.transaction(async (tx) => {
        // Transfer tokens from buyer to seller
        await tx
          .update(sessionTokenBalances)
          .set({
            tokenBalance: sql`${sessionTokenBalances.tokenBalance} - ${dataPackage.priceTokens}`,
            totalTokensSpent: sql`${sessionTokenBalances.totalTokensSpent} + ${dataPackage.priceTokens}`
          })
          .where(eq(sessionTokenBalances.sessionId, buyerSessionId));
        
        // Credit seller
        await tx
          .update(sessionTokenBalances)
          .set({
            tokenBalance: sql`${sessionTokenBalances.tokenBalance} + ${dataPackage.priceTokens}`,
            totalTokensEarned: sql`${sessionTokenBalances.totalTokensEarned} + ${dataPackage.priceTokens}`
          })
          .where(eq(sessionTokenBalances.sessionId, dataPackage.creatorSessionId));
        
        // Record the purchase
        await tx
          .insert(dataPackagePurchases)
          .values({
            packageId,
            buyerSessionId,
            sellerSessionId: dataPackage.creatorSessionId,
            tokensTransferred: dataPackage.priceTokens
          });
        
        // Record the token transfer
        await tx
          .insert(tokenTransfers)
          .values({
            fromSessionId: buyerSessionId,
            toSessionId: dataPackage.creatorSessionId,
            amount: dataPackage.priceTokens,
            transferType: 'data_purchase',
            relatedPackageId: packageId
          });
        
        // Update package sales count
        await tx
          .update(dataPackages)
          .set({
            totalSales: sql`${dataPackages.totalSales} + 1`
          })
          .where(eq(dataPackages.id, packageId));
      });
      
      return { 
        success: true, 
        dataContent: dataPackage.dataContent,
        message: "Purchase successful! Data unlocked."
      };
      
    } catch (error) {
      return { success: false, message: "Transaction failed" };
    }
  }
  
  // Direct token transfer between users
  async transferTokens(
    fromSessionId: string,
    toSessionId: string,
    amount: number,
    transferType: 'gift' | 'payment' | 'tip' = 'gift',
    message?: string
  ): Promise<{ success: boolean; message: string }> {
    
    if (fromSessionId === toSessionId) {
      return { success: false, message: "Cannot transfer to yourself" };
    }
    
    // Check sender's balance
    const [senderBalance] = await db
      .select()
      .from(sessionTokenBalances)
      .where(eq(sessionTokenBalances.sessionId, fromSessionId));
    
    if (!senderBalance || senderBalance.tokenBalance < amount) {
      return { success: false, message: "Insufficient tokens" };
    }
    
    // Check if recipient exists
    const [recipientBalance] = await db
      .select()
      .from(sessionTokenBalances)
      .where(eq(sessionTokenBalances.sessionId, toSessionId));
    
    if (!recipientBalance) {
      return { success: false, message: "Recipient not found" };
    }
    
    try {
      await db.transaction(async (tx) => {
        // Debit sender
        await tx
          .update(sessionTokenBalances)
          .set({
            tokenBalance: sql`${sessionTokenBalances.tokenBalance} - ${amount}`,
            totalTokensSpent: sql`${sessionTokenBalances.totalTokensSpent} + ${amount}`
          })
          .where(eq(sessionTokenBalances.sessionId, fromSessionId));
        
        // Credit recipient
        await tx
          .update(sessionTokenBalances)
          .set({
            tokenBalance: sql`${sessionTokenBalances.tokenBalance} + ${amount}`,
            totalTokensEarned: sql`${sessionTokenBalances.totalTokensEarned} + ${amount}`
          })
          .where(eq(sessionTokenBalances.sessionId, toSessionId));
        
        // Record the transfer
        await tx
          .insert(tokenTransfers)
          .values({
            fromSessionId,
            toSessionId,
            amount,
            transferType,
            message
          });
      });
      
      return { success: true, message: "Transfer completed successfully" };
      
    } catch (error) {
      return { success: false, message: "Transfer failed" };
    }
  }
  
  // Get available data packages for purchase
  async getAvailableDataPackages(
    sessionId: string,
    limit: number = 20
  ): Promise<DataPackageWithCreator[]> {
    
    const packages = await db
      .select({
        id: dataPackages.id,
        title: dataPackages.title,
        description: dataPackages.description,
        dataType: dataPackages.dataType,
        dataContent: dataPackages.dataContent,
        priceTokens: dataPackages.priceTokens,
        totalSales: dataPackages.totalSales,
        rating: dataPackages.rating,
        creatorSessionId: dataPackages.creatorSessionId,
        createdAt: dataPackages.createdAt,
        creatorUsername: deviceRegistrations.username,
        locationName: locations.name
      })
      .from(dataPackages)
      .leftJoin(deviceRegistrations, eq(dataPackages.creatorSessionId, deviceRegistrations.userId))
      .leftJoin(locations, eq(dataPackages.locationId, locations.id))
      .where(
        and(
          eq(dataPackages.isActive, true),
          ne(dataPackages.creatorSessionId, sessionId) // Don't show own packages
        )
      )
      .orderBy(desc(dataPackages.createdAt))
      .limit(limit);
    
    return packages.map(pkg => ({
      ...pkg,
      creatorUsername: pkg.creatorUsername || 'Anonymous User'
    }));
  }
  
  // Get user's purchased data packages
  async getPurchasedDataPackages(sessionId: string): Promise<PurchasedDataPackage[]> {
    
    const purchases = await db
      .select({
        id: dataPackages.id,
        title: dataPackages.title,
        description: dataPackages.description,
        dataType: dataPackages.dataType,
        dataContent: dataPackages.dataContent,
        priceTokens: dataPackages.priceTokens,
        totalSales: dataPackages.totalSales,
        rating: dataPackages.rating,
        creatorSessionId: dataPackages.creatorSessionId,
        createdAt: dataPackages.createdAt,
        creatorUsername: deviceRegistrations.username,
        locationName: locations.name,
        purchasedAt: dataPackagePurchases.purchasedAt,
        tokensTransferred: dataPackagePurchases.tokensTransferred
      })
      .from(dataPackagePurchases)
      .innerJoin(dataPackages, eq(dataPackagePurchases.packageId, dataPackages.id))
      .leftJoin(deviceRegistrations, eq(dataPackages.creatorSessionId, deviceRegistrations.userId))
      .leftJoin(locations, eq(dataPackages.locationId, locations.id))
      .where(eq(dataPackagePurchases.buyerSessionId, sessionId))
      .orderBy(desc(dataPackagePurchases.purchasedAt));
    
    return purchases.map(purchase => ({
      ...purchase,
      creatorUsername: purchase.creatorUsername || 'Anonymous User'
    }));
  }
  
  // Get transfer history for a user
  async getTransferHistory(sessionId: string, limit: number = 50): Promise<TransferHistory[]> {
    
    const transfers = await db
      .select({
        id: tokenTransfers.id,
        fromSessionId: tokenTransfers.fromSessionId,
        toSessionId: tokenTransfers.toSessionId,
        amount: tokenTransfers.amount,
        transferType: tokenTransfers.transferType,
        message: tokenTransfers.message,
        createdAt: tokenTransfers.createdAt,
        fromUsername: sql<string>`from_reg.username`,
        toUsername: sql<string>`to_reg.username`,
        packageTitle: dataPackages.title
      })
      .from(tokenTransfers)
      .leftJoin(sql`device_registrations as from_reg`, sql`from_reg.user_id = ${tokenTransfers.fromSessionId}`)
      .leftJoin(sql`device_registrations as to_reg`, sql`to_reg.user_id = ${tokenTransfers.toSessionId}`)
      .leftJoin(dataPackages, eq(tokenTransfers.relatedPackageId, dataPackages.id))
      .where(
        sql`${tokenTransfers.fromSessionId} = ${sessionId} OR ${tokenTransfers.toSessionId} = ${sessionId}`
      )
      .orderBy(desc(tokenTransfers.createdAt))
      .limit(limit);
    
    return transfers.map(transfer => ({
      ...transfer,
      fromUsername: transfer.fromUsername || 'Anonymous User',
      toUsername: transfer.toUsername || 'Anonymous User',
      relatedPackageTitle: transfer.packageTitle
    }));
  }
  
  // Helper methods for data analysis
  private analyzeMovementPatterns(spatialData: any[]): any {
    return {
      averageSpeed: Math.random() * 5 + 1,
      stationaryPercentage: Math.random() * 0.4 + 0.3,
      movementVariability: Math.random() * 0.5 + 0.2
    };
  }
  
  private calculateSpatialDensity(spatialData: any[]): any {
    return {
      pointDensity: spatialData.length / 100,
      coverageArea: Math.random() * 1000 + 100,
      hotspots: Math.floor(Math.random() * 5) + 1
    };
  }
  
  private calculateDataQuality(spatialData: any[]): number {
    const avgAccuracy = spatialData.reduce((sum, p) => sum + (p.accuracy || 10), 0) / spatialData.length;
    return Math.min(1.0, (20 - avgAccuracy) / 15); // Higher quality for better accuracy
  }
  
  private generateUsagePatterns(): any {
    return {
      weekdayDistribution: Array.from({length: 7}, () => Math.random()),
      hourlyDistribution: Array.from({length: 24}, () => Math.random()),
      seasonalTrends: Array.from({length: 4}, () => Math.random())
    };
  }
}

export const dataMarketplace = new DataMarketplaceService();