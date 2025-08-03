import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Target, MapPin, Brain, Users } from "lucide-react";

export default function PatternsSuggestedInfo() {
  const [, setLocation] = useLocation();

  return (
    <div className="flex flex-col min-h-screen bg-neutral-50">
      {/* Status Bar */}
      <div className="safe-area-top bg-primary text-white px-4 py-1 text-sm">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-secondary rounded-full animate-pulse"></div>
          <span>Patterns Suggested Explained</span>
        </div>
      </div>

      {/* Header */}
      <header className="bg-transparent px-4 py-3">
        <div className="flex items-center space-x-3">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setLocation("/insights")}
            className="p-2"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Target className="text-white w-4 h-4" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-neutral-800">Patterns Suggested</h1>
              <p className="text-xs text-neutral-400">How pattern suggestions work</p>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 px-4 py-4 pb-24 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Brain className="w-5 h-5 text-primary" />
              <span>AI Pattern Analysis</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-neutral-600">
              When you visit a location, our AI analyzes the area against Christopher Alexander's 253 architectural patterns from "A Pattern Language."
            </p>
            <p className="text-sm text-neutral-600">
              The system considers factors like population density, spatial layout, accessibility, and community structures to suggest patterns that best match the location.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MapPin className="w-5 h-5 text-primary" />
              <span>Location Context</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-neutral-600">
              Each suggestion is tailored to your specific GPS coordinates, taking into account the unique characteristics of that place.
            </p>
            <p className="text-sm text-neutral-600">
              The more locations you visit, the more pattern suggestions are generated, contributing to a comprehensive understanding of architectural patterns in your area.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-primary" />
              <span>Community Impact</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-neutral-600">
              Your pattern suggestions help build a collective understanding of how well real-world places align with proven architectural principles.
            </p>
            <p className="text-sm text-neutral-600">
              Each suggestion you generate becomes part of the community knowledge base for improving urban design and planning.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}