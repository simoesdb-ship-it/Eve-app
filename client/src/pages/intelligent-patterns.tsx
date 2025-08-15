import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Brain, MapPin, Users, ArrowRight, MessageSquare, ThumbsUp, ThumbsDown, Check, Clock, AlertTriangle } from "lucide-react";
import type { IntelligentSuggestion, UserComment } from "@shared/schema";

interface LocationWithComments {
  id: number;
  name: string;
  latitude: string;
  longitude: string;
  comments: UserComment[];
  suggestions: IntelligentSuggestion[];
}

export default function IntelligentPatterns() {
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);
  const [newComment, setNewComment] = useState("");
  const [commentType, setCommentType] = useState<"problem" | "observation" | "pattern_analysis">("problem");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Mock session ID for demo
  const sessionId = "demo_session_" + Date.now();

  // Fetch sample locations with their comments and suggestions
  const { data: locations = [], isLoading } = useQuery({
    queryKey: ["/api/locations"],
    select: (data: any[]) => data.slice(0, 5), // Show first 5 locations
  });

  // Fetch comments for selected location
  const { data: comments = [] } = useQuery({
    queryKey: ["/api/locations", selectedLocationId, "comments"],
    enabled: !!selectedLocationId,
  });

  // Fetch intelligent suggestions for selected location
  const { data: suggestions = [] } = useQuery({
    queryKey: ["/api/locations", selectedLocationId, "intelligent-suggestions"],
    enabled: !!selectedLocationId,
  });

  // Submit comment mutation
  const submitCommentMutation = useMutation({
    mutationFn: async (data: { locationId: number; content: string; commentType: string; sessionId: string }) => {
      return await apiRequest("POST", `/api/locations/${data.locationId}/comments`, data);
    },
    onSuccess: () => {
      toast({
        title: "Comment submitted",
        description: "Your feedback has been recorded and analyzed for pattern suggestions.",
      });
      setNewComment("");
      queryClient.invalidateQueries({ queryKey: ["/api/locations", selectedLocationId, "comments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/locations", selectedLocationId, "intelligent-suggestions"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Generate fresh suggestions mutation
  const generateSuggestionsMutation = useMutation({
    mutationFn: async (locationId: number) => {
      return await apiRequest("POST", `/api/locations/${locationId}/regenerate-suggestions`, {});
    },
    onSuccess: (data: any) => {
      toast({
        title: "New suggestions generated", 
        description: `Generated ${data.suggestions?.length || 0} intelligent pattern suggestions.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/locations", selectedLocationId, "intelligent-suggestions"] });
    },
  });

  const handleSubmitComment = () => {
    if (!selectedLocationId || !newComment.trim()) return;
    
    submitCommentMutation.mutate({
      locationId: selectedLocationId,
      content: newComment,
      commentType,
      sessionId,
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'immediate': return 'bg-red-100 text-red-800 border-red-200';
      case 'short_term': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium_term': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'long_term': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading intelligent pattern system...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Brain className="h-10 w-10 text-primary" />
          <h1 className="text-4xl font-bold">Intelligent Pattern Recommendations</h1>
        </div>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Describe urban problems and receive intelligent Christopher Alexander pattern suggestions 
          based on community feedback and consensus building.
        </p>
        <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            <span>Community Feedback</span>
          </div>
          <ArrowRight className="h-4 w-4" />
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            <span>AI Pattern Analysis</span>
          </div>
          <ArrowRight className="h-4 w-4" />
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>Consensus Building</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Location Selection */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <MapPin className="h-6 w-6" />
            Select Location
          </h2>
          <div className="space-y-2">
            {locations.map((location: any) => (
              <Card
                key={location.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedLocationId === location.id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => setSelectedLocationId(location.id)}
              >
                <CardContent className="p-4">
                  <h3 className="font-medium">{location.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {parseFloat(location.latitude).toFixed(4)}, {parseFloat(location.longitude).toFixed(4)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Comments & Feedback */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <MessageSquare className="h-6 w-6" />
            Community Feedback
          </h2>
          
          {selectedLocationId ? (
            <>
              {/* Submit new comment */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Share Your Observations</CardTitle>
                  <CardDescription>
                    Describe problems or observations to generate intelligent pattern suggestions.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Button
                      variant={commentType === "problem" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCommentType("problem")}
                    >
                      Problem
                    </Button>
                    <Button
                      variant={commentType === "observation" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCommentType("observation")}
                    >
                      Observation
                    </Button>
                    <Button
                      variant={commentType === "pattern_analysis" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCommentType("pattern_analysis")}
                    >
                      Analysis
                    </Button>
                  </div>
                  <Textarea
                    placeholder="Describe what you've observed about this location..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={3}
                  />
                  <Button 
                    onClick={handleSubmitComment}
                    disabled={!newComment.trim() || submitCommentMutation.isPending}
                    className="w-full"
                  >
                    {submitCommentMutation.isPending ? "Analyzing..." : "Submit Feedback"}
                  </Button>
                </CardContent>
              </Card>

              {/* Existing comments */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {(comments as UserComment[]).map((comment: UserComment) => (
                  <Card key={comment.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-sm">{comment.content}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-xs">
                              {comment.commentType}
                            </Badge>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <ThumbsUp className="h-3 w-3" />
                              {comment.upvotes}
                              <ThumbsDown className="h-3 w-3 ml-1" />
                              {comment.downvotes}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a location to view and submit feedback</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Intelligent Suggestions */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <Brain className="h-6 w-6" />
              Pattern Suggestions
            </h2>
            {selectedLocationId && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => generateSuggestionsMutation.mutate(selectedLocationId)}
                disabled={generateSuggestionsMutation.isPending}
              >
                {generateSuggestionsMutation.isPending ? "Generating..." : "Refresh"}
              </Button>
            )}
          </div>

          {selectedLocationId ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {(suggestions as IntelligentSuggestion[]).map((suggestion: IntelligentSuggestion) => (
                <Card key={suggestion.id}>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-medium text-sm">
                          Pattern #{suggestion.patternId}: {suggestion.reasoning?.split(' ')[0] || 'Pattern'}
                        </h3>
                        <Badge className={getPriorityColor(suggestion.implementationPriority)}>
                          {suggestion.implementationPriority.replace('_', ' ')}
                        </Badge>
                      </div>
                      
                      <p className="text-xs text-muted-foreground">
                        {suggestion.reasoning}
                      </p>
                      
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className={`font-medium ${getConfidenceColor(parseFloat(suggestion.relevanceScore))}`}>
                            {Math.round(parseFloat(suggestion.relevanceScore) * 100)}% confidence
                          </span>
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {suggestion.communitySupport} support
                          </div>
                        </div>
                        
                        {suggestion.isImplemented ? (
                          <div className="flex items-center gap-1 text-green-600">
                            <Check className="h-3 w-3" />
                            Implemented
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            Pending
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {(suggestions as IntelligentSuggestion[]).length === 0 && (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No pattern suggestions yet</p>
                    <p className="text-sm">Submit feedback to generate intelligent recommendations</p>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a location to view pattern suggestions</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Implementation Status */}
      {selectedLocationId && (suggestions as IntelligentSuggestion[]).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Implementation Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
              <div className="space-y-2">
                <div className="text-2xl font-bold text-red-600">
                  {(suggestions as IntelligentSuggestion[]).filter((s: IntelligentSuggestion) => s.implementationPriority === 'immediate').length}
                </div>
                <p className="text-sm text-muted-foreground">Immediate Priority</p>
              </div>
              <div className="space-y-2">
                <div className="text-2xl font-bold text-orange-600">
                  {(suggestions as IntelligentSuggestion[]).filter((s: IntelligentSuggestion) => s.implementationPriority === 'short_term').length}
                </div>
                <p className="text-sm text-muted-foreground">Short Term</p>
              </div>
              <div className="space-y-2">
                <div className="text-2xl font-bold text-yellow-600">
                  {(suggestions as IntelligentSuggestion[]).filter((s: IntelligentSuggestion) => s.implementationPriority === 'medium_term').length}
                </div>
                <p className="text-sm text-muted-foreground">Medium Term</p>
              </div>
              <div className="space-y-2">
                <div className="text-2xl font-bold text-green-600">
                  {(suggestions as IntelligentSuggestion[]).filter((s: IntelligentSuggestion) => s.isImplemented).length}
                </div>
                <p className="text-sm text-muted-foreground">Implemented</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}