import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import BottomNavigation from "@/components/bottom-navigation";
import PatternDetailsModal from "@/components/pattern-details-modal";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Compass, Users, MapPin, Route, Utensils, Footprints, Filter } from "lucide-react";
import { getPatternMoodColors, getPatternMoodDescription, getAllMoodColors } from "@/lib/pattern-colors";
import type { Pattern } from "@shared/schema";

const iconMap: { [key: string]: any } = {
  utensils: Utensils,
  walking: Footprints,
  users: Users,
  "map-pin": MapPin,
  route: Route,
  compass: Compass,
};

export default function PatternsPage() {
  const [selectedPattern, setSelectedPattern] = useState<Pattern | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMoodFilter, setSelectedMoodFilter] = useState<string | null>(null);

  // Fetch all patterns
  const { data: patterns = [], isLoading } = useQuery({
    queryKey: ['/api/patterns'],
    queryFn: async () => {
      const response = await fetch('/api/patterns');
      if (!response.ok) throw new Error('Failed to fetch patterns');
      return response.json();
    }
  });

  // Filter patterns based on search and mood color
  const filteredPatterns = patterns.filter((pattern: Pattern) => {
    const matchesSearch = pattern.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pattern.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pattern.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pattern.keywords.some(keyword => 
        keyword.toLowerCase().includes(searchQuery.toLowerCase())
      );
    
    const matchesMoodFilter = !selectedMoodFilter || pattern.moodColor === selectedMoodFilter;
    
    return matchesSearch && matchesMoodFilter;
  });

  // Group patterns by category
  const groupedPatterns = filteredPatterns.reduce((acc: { [key: string]: Pattern[] }, pattern: Pattern) => {
    if (!acc[pattern.category]) {
      acc[pattern.category] = [];
    }
    acc[pattern.category].push(pattern);
    return acc;
  }, {});

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      "Public Spaces": "bg-yellow-100 text-yellow-800",
      "Transportation": "bg-blue-100 text-blue-800",
      "Community": "bg-green-100 text-green-800",
      "Buildings": "bg-purple-100 text-purple-800",
      "Nature": "bg-emerald-100 text-emerald-800",
    };
    return colors[category] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="flex flex-col min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">P</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-neutral-800">Pattern Library</h1>
              <p className="text-xs text-neutral-400">Christopher Alexander Collection</p>
            </div>
          </div>
        </div>
      </header>

      {/* Search and Filters */}
      <div className="px-4 py-3 bg-white border-b border-gray-100">
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Search patterns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {/* Pattern Mood Filters */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedMoodFilter === null ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedMoodFilter(null)}
              className="text-xs"
            >
              All Moods
            </Button>
            {getAllMoodColors().map(({ color, description, colors }) => (
              <Button
                key={color}
                variant={selectedMoodFilter === color ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedMoodFilter(color)}
                className={`text-xs ${colors.badge}`}
              >
                {description}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Pattern Count */}
      <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
        <p className="text-sm text-gray-600">
          {filteredPatterns.length} patterns {searchQuery && `matching "${searchQuery}"`}
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-20">
        {isLoading ? (
          <div className="px-4 py-4 space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : Object.keys(groupedPatterns).length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-gray-600">No patterns found matching your search.</p>
          </div>
        ) : (
          Object.entries(groupedPatterns).map(([category, categoryPatterns]) => (
            <div key={category} className="px-4 py-4">
              <div className="flex items-center space-x-2 mb-3">
                <Badge className={getCategoryColor(category)}>
                  {category}
                </Badge>
                <span className="text-sm text-gray-500">
                  {categoryPatterns.length} patterns
                </span>
              </div>
              
              <div className="space-y-3">
                {categoryPatterns.map((pattern: Pattern) => {
                  const IconComponent = iconMap[pattern.iconName] || Compass;
                  
                  return (
                    <Card 
                      key={pattern.id} 
                      className="cursor-pointer hover:shadow-md transition-shadow pattern-card"
                      onClick={() => setSelectedPattern(pattern)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-neutral-800 mb-1">
                              {pattern.name}
                            </h3>
                            <p className="text-sm text-neutral-600 mb-2">
                              {pattern.description}
                            </p>
                            <div className="flex items-center space-x-2 text-xs text-neutral-400">
                              <span>#{pattern.number}</span>
                              <span>•</span>
                              <span>{pattern.category}</span>
                            </div>
                          </div>
                          <div className="ml-3">
                            <div className={`w-12 h-12 bg-gradient-to-br from-primary to-blue-300 rounded-lg flex items-center justify-center`}>
                              <IconComponent className="w-5 h-5 text-white" />
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <div className="flex flex-wrap gap-1">
                            {pattern.keywords.slice(0, 3).map((keyword, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {keyword}
                              </Badge>
                            ))}
                            {pattern.keywords.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{pattern.keywords.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation activeTab="patterns" />

      {/* Pattern Details Modal */}
      {selectedPattern && (
        <PatternDetailsModal
          pattern={selectedPattern}
          isOpen={!!selectedPattern}
          onClose={() => setSelectedPattern(null)}
        />
      )}
    </div>
  );
}
