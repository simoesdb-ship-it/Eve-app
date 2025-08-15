import type { Express } from "express";
import { storage } from "./storage";
import { intelligentPatternCurator } from "./intelligent-pattern-curator";
import { insertUserCommentSchema, insertConsensusBuildingSchema } from "@shared/schema";

/**
 * API routes for intelligent pattern suggestions based on user feedback
 */
export function registerIntelligentPatternRoutes(app: Express) {
  
  // Submit user comment about a location
  app.post("/api/locations/:locationId/comments", async (req, res) => {
    try {
      const locationId = parseInt(req.params.locationId);
      const commentData = insertUserCommentSchema.parse({
        ...req.body,
        locationId
      });
      
      const comment = await storage.createUserComment(commentData);
      
      // If it's a problem comment, trigger intelligent suggestions
      if (comment.commentType === 'problem') {
        await intelligentPatternCurator.generateIntelligentSuggestions(
          locationId, 
          [comment]
        );
      }
      
      res.json(comment);
    } catch (error: any) {
      console.error("Error creating comment:", error);
      res.status(400).json({ message: error.message });
    }
  });

  // Get all comments for a location
  app.get("/api/locations/:locationId/comments", async (req, res) => {
    try {
      const locationId = parseInt(req.params.locationId);
      const comments = await storage.getUserCommentsForLocation(locationId);
      res.json(comments);
    } catch (error: any) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Vote on a comment (upvote/downvote)
  app.post("/api/comments/:commentId/vote", async (req, res) => {
    try {
      const commentId = parseInt(req.params.commentId);
      const { isUpvote, sessionId } = req.body;
      
      await storage.voteOnComment(commentId, sessionId, isUpvote);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error voting on comment:", error);
      res.status(400).json({ message: error.message });
    }
  });

  // Get intelligent pattern suggestions for a location
  app.get("/api/locations/:locationId/intelligent-suggestions", async (req, res) => {
    try {
      const locationId = parseInt(req.params.locationId);
      const suggestions = await storage.getIntelligentSuggestionsForLocation(locationId);
      res.json(suggestions);
    } catch (error: any) {
      console.error("Error fetching intelligent suggestions:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get suggestions by implementation priority
  app.get("/api/intelligent-suggestions/priority/:priority", async (req, res) => {
    try {
      const priority = req.params.priority;
      const suggestions = await storage.getIntelligentSuggestionsByPriority(priority);
      res.json(suggestions);
    } catch (error: any) {
      console.error("Error fetching suggestions by priority:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Submit community consensus vote on a pattern suggestion
  app.post("/api/suggestions/:suggestionId/consensus", async (req, res) => {
    try {
      const suggestionId = parseInt(req.params.suggestionId);
      const consensusData = insertConsensusBuildingSchema.parse({
        ...req.body,
        suggestionId
      });
      
      const vote = await storage.createConsensusVote(consensusData);
      res.json(vote);
    } catch (error: any) {
      console.error("Error creating consensus vote:", error);
      res.status(400).json({ message: error.message });
    }
  });

  // Get consensus report for a suggestion
  app.get("/api/suggestions/:suggestionId/consensus-report", async (req, res) => {
    try {
      const suggestionId = parseInt(req.params.suggestionId);
      const report = await intelligentPatternCurator.generateConsensusReport(suggestionId);
      res.json(report);
    } catch (error: any) {
      console.error("Error generating consensus report:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Mark a suggestion as implemented
  app.post("/api/suggestions/:suggestionId/implement", async (req, res) => {
    try {
      const suggestionId = parseInt(req.params.suggestionId);
      const { implementationNotes } = req.body;
      
      await storage.markSuggestionImplemented(suggestionId, implementationNotes);
      res.json({ success: true, message: "Suggestion marked as implemented" });
    } catch (error: any) {
      console.error("Error marking suggestion as implemented:", error);
      res.status(400).json({ message: error.message });
    }
  });

  // Generate fresh intelligent suggestions for a location based on existing comments
  app.post("/api/locations/:locationId/regenerate-suggestions", async (req, res) => {
    try {
      const locationId = parseInt(req.params.locationId);
      const comments = await storage.getUserCommentsForLocation(locationId);
      const problemComments = comments.filter(c => c.commentType === 'problem');
      
      if (problemComments.length === 0) {
        return res.json({ message: "No problem comments found to generate suggestions from" });
      }
      
      const suggestions = await intelligentPatternCurator.generateIntelligentSuggestions(
        locationId, 
        problemComments
      );
      
      res.json({
        message: `Generated ${suggestions.length} intelligent pattern suggestions`,
        suggestions: suggestions.slice(0, 5) // Return top 5
      });
    } catch (error: any) {
      console.error("Error regenerating suggestions:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get implementation-ready suggestions (high community support)
  app.get("/api/suggestions/ready-for-implementation", async (req, res) => {
    try {
      const allSuggestions = await storage.getIntelligentSuggestionsByPriority('immediate');
      const readySuggestions = [];
      
      for (const suggestion of allSuggestions) {
        const report = await intelligentPatternCurator.generateConsensusReport(suggestion.id!);
        if (report.implementationReadiness === 'ready') {
          readySuggestions.push({
            ...suggestion,
            consensusReport: report
          });
        }
      }
      
      res.json(readySuggestions);
    } catch (error: any) {
      console.error("Error fetching implementation-ready suggestions:", error);
      res.status(500).json({ message: error.message });
    }
  });
}