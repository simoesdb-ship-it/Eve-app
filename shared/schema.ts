import { pgTable, text, serial, integer, boolean, decimal, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  tokenBalance: integer("token_balance").default(100).notNull(), // Starting balance of 100 tokens
  totalTokensEarned: integer("total_tokens_earned").default(0).notNull(),
  totalTokensSpent: integer("total_tokens_spent").default(0).notNull(),
});

export const patterns = pgTable("patterns", {
  id: serial("id").primaryKey(),
  number: integer("number").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  fullDescription: text("full_description").notNull(),
  category: text("category").notNull(),
  keywords: text("keywords").array().notNull(),
  iconName: text("icon_name").notNull(),
  moodColor: text("mood_color").notNull().default("blue"), // Pattern mood color
});

export const locations = pgTable("locations", {
  id: serial("id").primaryKey(),
  latitude: decimal("latitude", { precision: 10, scale: 8 }).notNull(),
  longitude: decimal("longitude", { precision: 11, scale: 8 }).notNull(),
  name: text("name"),
  sessionId: text("session_id").notNull(), // Anonymous session tracking
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const patternSuggestions = pgTable("pattern_suggestions", {
  id: serial("id").primaryKey(),
  locationId: integer("location_id").references(() => locations.id).notNull(),
  patternId: integer("pattern_id").references(() => patterns.id).notNull(),
  confidence: text("confidence").notNull(),
  mlAlgorithm: text("ml_algorithm").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const votes = pgTable("votes", {
  id: serial("id").primaryKey(),
  suggestionId: integer("suggestion_id").references(() => patternSuggestions.id).notNull(),
  sessionId: text("session_id").notNull(), // Anonymous voting
  voteType: text("vote_type").notNull(), // 'up' or 'down'
  weight: decimal("weight", { precision: 5, scale: 2 }).default("1.00").notNull(), // voting weight based on time spent at location
  locationId: integer("location_id").references(() => locations.id), // location where vote was cast
  timeSpentMinutes: integer("time_spent_minutes").default(0).notNull(), // tracked time at this location
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const activity = pgTable("activity", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // 'vote', 'suggestion', 'visit'
  description: text("description").notNull(),
  locationId: integer("location_id").references(() => locations.id),
  sessionId: text("session_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const spatialPoints = pgTable("spatial_points", {
  id: serial("id").primaryKey(),
  latitude: decimal("latitude", { precision: 12, scale: 8 }).notNull(),
  longitude: decimal("longitude", { precision: 12, scale: 8 }).notNull(),
  type: text("type").notNull(), // 'tracking', 'analyzed', 'saved'
  sessionId: text("session_id").notNull(),
  metadata: text("metadata").default('{}').notNull(), // JSON string for patterns, analysis, etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
});

export const insertPatternSchema = createInsertSchema(patterns).omit({
  id: true,
});

export const insertLocationSchema = createInsertSchema(locations).omit({
  id: true,
  createdAt: true,
});

export const insertPatternSuggestionSchema = createInsertSchema(patternSuggestions).omit({
  id: true,
  createdAt: true,
});

export const insertVoteSchema = createInsertSchema(votes).omit({
  id: true,
  createdAt: true,
});

export const insertActivitySchema = createInsertSchema(activity).omit({
  id: true,
  createdAt: true,
});

export const insertSpatialPointSchema = createInsertSchema(spatialPoints).omit({
  id: true,
  createdAt: true,
});

export const savedLocations = pgTable("saved_locations", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 8 }).notNull(),
  longitude: decimal("longitude", { precision: 11, scale: 8 }).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  address: text("address"),
  elevation: decimal("elevation", { precision: 8, scale: 2 }),
  landUse: text("land_use"),
  urbanDensity: text("urban_density"),
  patternEvaluation: text("pattern_evaluation"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSavedLocationSchema = createInsertSchema(savedLocations).omit({
  id: true,
  createdAt: true,
});

// Token economy tables
export const tokenTransactions = pgTable("token_transactions", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  transactionType: text("transaction_type").notNull(), // 'earn' or 'spend'
  amount: integer("amount").notNull(),
  reason: text("reason").notNull(),
  relatedContentType: text("related_content_type"), // 'location', 'photo', 'video', 'comment'
  relatedContentId: integer("related_content_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userMedia = pgTable("user_media", {
  id: serial("id").primaryKey(),
  locationId: integer("location_id").references(() => locations.id).notNull(),
  sessionId: text("session_id").notNull(),
  mediaType: text("media_type").notNull(), // 'photo', 'video'
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size").notNull(),
  mimeType: text("mime_type").notNull(),
  caption: text("caption"),
  tokensEarned: integer("tokens_earned").default(0).notNull(),
  isPremium: boolean("is_premium").default(false).notNull(),
  viewCost: integer("view_cost").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userComments = pgTable("user_comments", {
  id: serial("id").primaryKey(),
  locationId: integer("location_id").references(() => locations.id).notNull(),
  sessionId: text("session_id").notNull(),
  content: text("content").notNull(),
  commentType: text("comment_type").notNull(), // 'recommendation', 'observation', 'pattern_analysis'
  tokensEarned: integer("tokens_earned").default(0).notNull(),
  isPremium: boolean("is_premium").default(false).notNull(),
  viewCost: integer("view_cost").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sessionTokenBalances = pgTable("session_token_balances", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull().unique(),
  tokenBalance: integer("token_balance").default(100).notNull(),
  totalTokensEarned: integer("total_tokens_earned").default(0).notNull(),
  totalTokensSpent: integer("total_tokens_spent").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const mediaViews = pgTable("media_views", {
  id: serial("id").primaryKey(),
  mediaId: integer("media_id").references(() => userMedia.id).notNull(),
  viewerSessionId: text("viewer_session_id").notNull(),
  tokensPaid: integer("tokens_paid").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Token economy insert schemas
export const insertTokenTransactionSchema = createInsertSchema(tokenTransactions).omit({
  id: true,
  createdAt: true,
});

export const insertUserMediaSchema = createInsertSchema(userMedia).omit({
  id: true,
  createdAt: true,
});

export const insertUserCommentSchema = createInsertSchema(userComments).omit({
  id: true,
  createdAt: true,
});

export const insertSessionTokenBalanceSchema = createInsertSchema(sessionTokenBalances).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMediaViewSchema = createInsertSchema(mediaViews).omit({
  id: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Pattern = typeof patterns.$inferSelect;
export type InsertPattern = z.infer<typeof insertPatternSchema>;

export type Location = typeof locations.$inferSelect;
export type InsertLocation = z.infer<typeof insertLocationSchema>;

export type PatternSuggestion = typeof patternSuggestions.$inferSelect;
export type InsertPatternSuggestion = z.infer<typeof insertPatternSuggestionSchema>;

export type Vote = typeof votes.$inferSelect;
export type InsertVote = z.infer<typeof insertVoteSchema>;

export type Activity = typeof activity.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;

export type SpatialPoint = typeof spatialPoints.$inferSelect;
export type InsertSpatialPoint = z.infer<typeof insertSpatialPointSchema>;

export type SavedLocation = typeof savedLocations.$inferSelect;
export type InsertSavedLocation = z.infer<typeof insertSavedLocationSchema>;

// Token economy types
export type TokenTransaction = typeof tokenTransactions.$inferSelect;
export type InsertTokenTransaction = z.infer<typeof insertTokenTransactionSchema>;

export type UserMedia = typeof userMedia.$inferSelect;
export type InsertUserMedia = z.infer<typeof insertUserMediaSchema>;

export type UserComment = typeof userComments.$inferSelect;
export type InsertUserComment = z.infer<typeof insertUserCommentSchema>;

export type SessionTokenBalance = typeof sessionTokenBalances.$inferSelect;
export type InsertSessionTokenBalance = z.infer<typeof insertSessionTokenBalanceSchema>;

export type MediaView = typeof mediaViews.$inferSelect;
export type InsertMediaView = z.infer<typeof insertMediaViewSchema>;

// Extended types for API responses
export type PatternWithVotes = Pattern & {
  upvotes: number;
  downvotes: number;
  confidence: number;
  suggestionId: number;
  userVote?: 'up' | 'down' | null;
};

export type LocationWithPatterns = Location & {
  patterns: PatternWithVotes[];
};
