import { pgTable, text, serial, integer, boolean, decimal, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
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
  confidence: decimal("confidence", { precision: 5, scale: 2 }).notNull(),
  mlAlgorithm: text("ml_algorithm").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const votes = pgTable("votes", {
  id: serial("id").primaryKey(),
  suggestionId: integer("suggestion_id").references(() => patternSuggestions.id).notNull(),
  sessionId: text("session_id").notNull(), // Anonymous voting
  voteType: text("vote_type").notNull(), // 'up' or 'down'
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
