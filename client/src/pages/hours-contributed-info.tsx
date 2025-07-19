import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock, Timer, Award, Users } from "lucide-react";

export default function HoursContributedInfo() {
  const [, setLocation] = useLocation();

  return (
    <div className="flex flex-col min-h-screen bg-neutral-50">
      {/* Status Bar */}
      <div className="safe-area-top bg-primary text-white px-4 py-1 text-sm">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-secondary rounded-full animate-pulse"></div>
          <span>Hours Contributed Explained</span>
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
              <Clock className="text-white w-4 h-4" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-neutral-800">Hours Contributed</h1>
              <p className="text-xs text-neutral-400">Time-based participation</p>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 px-4 py-4 pb-24 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Timer className="w-5 h-5 text-primary" />
              <span>Time Accumulation</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-neutral-600">
              The app tracks how much time you spend at different locations, accumulating hours of real-world experience with architectural patterns.
            </p>
            <p className="text-sm text-neutral-600">
              Time spent at each location increases your voting weight for that place, ensuring decisions are made by people who truly know the area.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Award className="w-5 h-5 text-primary" />
              <span>Quality Participation</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-neutral-600">
              Hours contributed represent your investment in understanding places deeply, rather than making quick judgments.
            </p>
            <p className="text-sm text-neutral-600">
              This time-based approach ensures that pattern validation is based on genuine familiarity with locations.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-primary" />
              <span>Community Value</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-neutral-600">
              Your contributed hours help build a robust dataset of human spatial experience, valuable for urban planning and design.
            </p>
            <p className="text-sm text-neutral-600">
              The more hours the community contributes collectively, the more reliable and comprehensive the pattern analysis becomes.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}