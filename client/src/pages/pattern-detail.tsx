import { useQuery } from "@tanstack/react-query";
import { Link, useLocation, useParams } from "wouter";
import { ArrowLeft, ExternalLink, Book } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import MobileContainer from "@/components/mobile-container";
import type { Pattern } from "@shared/schema";

export default function PatternDetailPage() {
  const [, navigate] = useLocation();
  const { id } = useParams();

  const { data: pattern, isLoading } = useQuery({
    queryKey: ['/api/patterns', id],
    queryFn: async () => {
      const response = await fetch(`/api/patterns/${id}`);
      if (!response.ok) throw new Error('Failed to fetch pattern');
      return response.json() as Pattern;
    },
    enabled: !!id
  });

  const { data: allPatterns = [] } = useQuery({
    queryKey: ['/api/patterns'],
    queryFn: async () => {
      const response = await fetch('/api/patterns');
      if (!response.ok) throw new Error('Failed to fetch patterns');
      return response.json() as Pattern[];
    }
  });

  // Get cross-referenced patterns based on pattern number relationships
  const getCrossReferences = () => {
    if (!pattern) return [];
    
    // Find patterns that are commonly related (simple heuristic based on category and keywords)
    return allPatterns
      .filter(p => p.id !== pattern.id)
      .filter(p => {
        // Same category
        if (p.category === pattern.category) return true;
        
        // Shared keywords
        const sharedKeywords = p.keywords.filter(k => pattern.keywords.includes(k));
        if (sharedKeywords.length >= 2) return true;
        
        // Sequential numbers (common in Alexander's pattern language)
        const numberDiff = Math.abs(p.number - pattern.number);
        if (numberDiff <= 3 && numberDiff > 0) return true;
        
        return false;
      })
      .sort((a, b) => {
        // Sort by relevance: same category first, then by number proximity
        if (a.category === pattern.category && b.category !== pattern.category) return -1;
        if (b.category === pattern.category && a.category !== pattern.category) return 1;
        return Math.abs(a.number - pattern.number) - Math.abs(b.number - pattern.number);
      })
      .slice(0, 8); // Limit to 8 most relevant
  };

  const crossReferences = getCrossReferences();

  if (isLoading) {
    return (
      <MobileContainer>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading pattern...</div>
        </div>
      </MobileContainer>
    );
  }

  if (!pattern) {
    return (
      <MobileContainer>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Pattern not found</div>
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
            onClick={() => navigate('/patterns')}
            className="p-2"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Book className="w-4 h-4" />
            <Badge variant="outline">#{pattern.number}</Badge>
          </div>
          <div className="w-9" />
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Pattern Header */}
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <h1 className="text-xl font-bold leading-tight">{pattern.name}</h1>
            <Badge 
              className="ml-2"
              style={{ 
                backgroundColor: `hsl(var(--${pattern.moodColor || 'primary'}))`,
                color: 'white'
              }}
            >
              {pattern.moodColor}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{pattern.category}</Badge>
            <Badge variant="outline">Pattern #{pattern.number}</Badge>
          </div>
        </div>

        {/* Description */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 leading-relaxed">{pattern.description}</p>
          </CardContent>
        </Card>

        {/* Full Description */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Full Pattern</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 leading-relaxed whitespace-pre-line">
              {pattern.fullDescription}
            </p>
          </CardContent>
        </Card>

        {/* Keywords */}
        {pattern.keywords.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Keywords</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {pattern.keywords.map(keyword => (
                  <Badge key={keyword} variant="secondary">
                    {keyword}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cross References */}
        {crossReferences.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Related Patterns</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {crossReferences.map(relatedPattern => (
                  <Link key={relatedPattern.id} href={`/patterns/${relatedPattern.id}`}>
                    <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            #{relatedPattern.number}
                          </Badge>
                          <span className="font-medium text-sm">{relatedPattern.name}</span>
                        </div>
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                          {relatedPattern.description}
                        </p>
                        <Badge variant="secondary" className="text-xs mt-1">
                          {relatedPattern.category}
                        </Badge>
                      </div>
                      <ExternalLink className="w-4 h-4 text-gray-400 ml-2 flex-shrink-0" />
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="space-y-3">
          <Separator />
          <div className="flex gap-3">
            <Link href="/patterns" className="flex-1">
              <Button variant="outline" className="w-full">
                Browse All Patterns
              </Button>
            </Link>
            <Link href="/" className="flex-1">
              <Button className="w-full">
                Back to Map
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </MobileContainer>
  );
}