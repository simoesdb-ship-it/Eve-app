import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Search, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import MobileContainer from "@/components/mobile-container";
import type { Pattern } from "@shared/schema";

interface PatternWithCrossRefs extends Pattern {
  relatedPatterns?: number[];
}

export default function PatternsPage() {
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const { data: patterns = [], isLoading } = useQuery({
    queryKey: ['/api/patterns'],
    queryFn: async () => {
      const response = await fetch('/api/patterns');
      if (!response.ok) throw new Error('Failed to fetch patterns');
      return response.json() as Pattern[];
    }
  });

  const categories = ["All", ...Array.from(new Set(patterns.map(p => p.category)))];

  const filteredPatterns = patterns.filter(pattern => {
    const matchesSearch = searchQuery === "" || 
      pattern.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pattern.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pattern.keywords.some(k => k.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === "All" || pattern.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const groupedPatterns = filteredPatterns.reduce((acc, pattern) => {
    const category = pattern.category;
    if (!acc[category]) acc[category] = [];
    acc[category].push(pattern);
    return acc;
  }, {} as Record<string, Pattern[]>);

  // Sort patterns by number within each category
  Object.keys(groupedPatterns).forEach(category => {
    groupedPatterns[category].sort((a, b) => a.number - b.number);
  });

  const getPatternLink = (patternNumber: number) => {
    const targetPattern = patterns.find(p => p.number === patternNumber);
    return targetPattern ? `/patterns/${targetPattern.id}` : '#';
  };

  if (isLoading) {
    return (
      <MobileContainer>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading patterns...</div>
        </div>
      </MobileContainer>
    );
  }

  return (
    <MobileContainer>
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 z-10">
        <div className="flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate('/')}
            className="p-2"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold">Pattern Library</h1>
          <div className="w-9" />
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Search and Filter */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search patterns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2 overflow-x-auto pb-2">
            {categories.map(category => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className="whitespace-nowrap"
              >
                {category}
              </Button>
            ))}
          </div>
        </div>

        {/* Patterns by Category */}
        <div className="space-y-4">
          {Object.entries(groupedPatterns).map(([category, categoryPatterns]) => (
            <Card key={category}>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  {category}
                  <Badge variant="secondary">{categoryPatterns.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="multiple" className="w-full">
                  {categoryPatterns.map(pattern => (
                    <AccordionItem key={pattern.id} value={`pattern-${pattern.id}`}>
                      <AccordionTrigger className="text-left">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="text-xs">
                            #{pattern.number}
                          </Badge>
                          <span className="font-medium">{pattern.name}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-3 pt-2">
                          <p className="text-sm text-gray-600">{pattern.description}</p>
                          
                          {pattern.keywords.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {pattern.keywords.map(keyword => (
                                <Badge key={keyword} variant="secondary" className="text-xs">
                                  {keyword}
                                </Badge>
                              ))}
                            </div>
                          )}

                          <div className="flex justify-between items-center pt-2">
                            <Link href={`/patterns/${pattern.id}`}>
                              <Button size="sm" variant="outline">
                                <ExternalLink className="w-3 h-3 mr-1" />
                                View Details
                              </Button>
                            </Link>
                            
                            <Badge 
                              className="text-xs"
                              style={{ 
                                backgroundColor: `hsl(var(--${pattern.moodColor || 'primary'}))`,
                                color: 'white'
                              }}
                            >
                              {pattern.moodColor}
                            </Badge>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredPatterns.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No patterns found matching your search criteria.
          </div>
        )}
      </div>
    </MobileContainer>
  );
}