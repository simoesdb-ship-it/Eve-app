import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Plus, X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface PatternSelectorProps {
  savedLocationId: number;
  sessionId: string;
  trigger: React.ReactNode;
}

export function PatternSelector({ savedLocationId, sessionId, trigger }: PatternSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all patterns for selection
  const { data: allPatterns = [], isLoading: patternsLoading } = useQuery({
    queryKey: ['/api/patterns'],
    queryFn: async () => {
      const response = await fetch('/api/patterns');
      if (!response.ok) throw new Error('Failed to fetch patterns');
      return response.json();
    }
  });

  // Fetch currently assigned patterns
  const { data: assignedPatterns = [] } = useQuery({
    queryKey: [`/api/saved-locations/${savedLocationId}/patterns`],
    queryFn: async () => {
      const response = await fetch(`/api/saved-locations/${savedLocationId}/patterns`);
      if (!response.ok) throw new Error('Failed to fetch assigned patterns');
      return response.json();
    },
    enabled: open
  });

  // Assign pattern mutation
  const assignPatternMutation = useMutation({
    mutationFn: async (patternId: number) => {
      return await apiRequest("POST", `/api/saved-locations/${savedLocationId}/patterns`, {
        patternId,
        sessionId
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/saved-locations/${savedLocationId}/patterns`] });
      toast({
        title: "Pattern Assigned",
        description: "Pattern successfully assigned to location",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to assign pattern",
        variant: "destructive"
      });
    }
  });

  // Remove pattern mutation
  const removePatternMutation = useMutation({
    mutationFn: async (patternId: number) => {
      return await apiRequest("DELETE", `/api/saved-locations/${savedLocationId}/patterns/${patternId}?sessionId=${sessionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/saved-locations/${savedLocationId}/patterns`] });
      toast({
        title: "Pattern Removed",
        description: "Pattern successfully removed from location",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove pattern",
        variant: "destructive"
      });
    }
  });

  // Filter patterns based on search term
  const filteredPatterns = allPatterns.filter((pattern: any) =>
    pattern && pattern.name && (
      pattern.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pattern.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (pattern.keywords && pattern.keywords.some((keyword: string) => keyword.toLowerCase().includes(searchTerm.toLowerCase())))
    )
  );

  // Get assigned pattern IDs for easy checking
  const assignedPatternIds = new Set(assignedPatterns.map((ap: any) => ap.id));

  const handleAssignPattern = (patternId: number) => {
    assignPatternMutation.mutate(patternId);
  };

  const handleRemovePattern = (patternId: number) => {
    removePatternMutation.mutate(patternId);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Select Patterns for Location</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search patterns..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Currently Assigned Patterns */}
          {assignedPatterns.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Currently Assigned Patterns</h4>
              <div className="flex flex-wrap gap-2">
                {assignedPatterns.map((ap: any) => (
                  <Badge key={ap.id} variant="default" className="flex items-center gap-1">
                    #{ap.number} {ap.name}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => handleRemovePattern(ap.id)}
                      disabled={removePatternMutation.isPending}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Available Patterns */}
          <div>
            <h4 className="text-sm font-medium mb-2">Available Patterns</h4>
            <ScrollArea className="h-96">
              <div className="space-y-2">
                {patternsLoading ? (
                  <div className="text-center py-4 text-muted-foreground">Loading patterns...</div>
                ) : filteredPatterns.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">No patterns found</div>
                ) : (
                  filteredPatterns.map((pattern: any) => {
                    if (!pattern) return null;
                    const isAssigned = assignedPatternIds.has(pattern.id);
                    return (
                      <Card key={pattern.id} className={`transition-colors ${isAssigned ? 'bg-muted' : 'hover:bg-muted/50'}`}>
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="text-xs">
                                  #{pattern.number}
                                </Badge>
                                <h5 className="font-medium">{pattern.name}</h5>
                              </div>
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {pattern.description}
                              </p>
                              <div className="flex flex-wrap gap-1 mt-2">
                                {pattern.keywords && pattern.keywords.slice(0, 3).map((keyword: string) => (
                                  <Badge key={keyword} variant="secondary" className="text-xs">
                                    {keyword}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <div className="ml-4">
                              {isAssigned ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleRemovePattern(pattern.id)}
                                  disabled={removePatternMutation.isPending}
                                >
                                  <X className="h-4 w-4 mr-1" />
                                  Remove
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  onClick={() => handleAssignPattern(pattern.id)}
                                  disabled={assignPatternMutation.isPending}
                                >
                                  <Plus className="h-4 w-4 mr-1" />
                                  Assign
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}