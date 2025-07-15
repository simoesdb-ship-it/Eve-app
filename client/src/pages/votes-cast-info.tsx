import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Vote, Clock, Scale, TrendingUp } from "lucide-react";

export default function VotesCastInfo() {
  const [, setLocation] = useLocation();

  return (
    <div className="flex flex-col min-h-screen bg-neutral-50">
      {/* Status Bar */}
      <div className="safe-area-top bg-primary text-white px-4 py-1 text-sm">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-secondary rounded-full animate-pulse"></div>
          <span>Votes Cast Explained</span>
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
              <Vote className="text-white w-4 h-4" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-neutral-800">Votes Cast</h1>
              <p className="text-xs text-neutral-400">Democratic pattern validation</p>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 px-4 py-4 pb-24 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Scale className="w-5 h-5 text-primary" />
              <span>Democratic Validation</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-neutral-600">
              You can vote on pattern suggestions for locations you visit, helping validate whether AI suggestions accurately reflect the real-world environment.
            </p>
            <p className="text-sm text-neutral-600">
              Your votes contribute to community consensus on which architectural patterns best describe each location.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-primary" />
              <span>Time-Weighted Influence</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-neutral-600">
              Your voting power at each location increases based on the time you spend there, ensuring informed decisions from people who truly know the place.
            </p>
            <p className="text-sm text-neutral-600">
              The more time you spend at a location, the more weight your vote carries in determining pattern accuracy.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              <span>Collective Intelligence</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-neutral-600">
              Each vote you cast helps improve the system's understanding of architectural patterns and their real-world applications.
            </p>
            <p className="text-sm text-neutral-600">
              Your participation creates a valuable feedback loop that enhances pattern recognition for the entire community.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}