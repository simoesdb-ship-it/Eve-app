import { ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Utensils, Footprints, Users, MapPin, Route, Compass } from "lucide-react";
import { getPatternMoodColors, getPatternMoodDescription } from "@/lib/pattern-colors";
import type { PatternWithVotes } from "@shared/schema";

const iconMap: { [key: string]: any } = {
  utensils: Utensils,
  walking: Footprints,
  users: Users,
  "map-pin": MapPin,
  route: Route,
  compass: Compass,
};

const gradientMap: { [key: string]: string } = {
  utensils: "from-accent to-yellow-300",
  walking: "from-primary to-blue-300",
  users: "from-secondary to-green-300",
  "map-pin": "from-purple-500 to-purple-300",
  route: "from-indigo-500 to-indigo-300",
  compass: "from-primary to-blue-300",
};

interface PatternCardProps {
  pattern: PatternWithVotes;
  onVote: (suggestionId: number, voteType: 'up' | 'down') => void;
  onViewDetails: () => void;
  isVoting: boolean;
}

export default function PatternCard({ pattern, onVote, onViewDetails, isVoting }: PatternCardProps) {
  const IconComponent = iconMap[pattern.iconName] || Compass;
  const gradientClass = gradientMap[pattern.iconName] || "from-primary to-blue-300";
  const moodColors = getPatternMoodColors(pattern.moodColor || 'blue');
  const moodDescription = getPatternMoodDescription(pattern.moodColor || 'blue');

  const handleUpvote = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!pattern.userVote && !isVoting) {
      onVote(pattern.suggestionId, 'up');
    }
  };

  const handleDownvote = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!pattern.userVote && !isVoting) {
      onVote(pattern.suggestionId, 'down');
    }
  };

  return (
    <Card className={`animate-slide-up pattern-card cursor-pointer ${moodColors.background} ${moodColors.border} border`} onClick={onViewDetails}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className={`font-semibold ${moodColors.text}`}>{pattern.name}</h3>
              <Badge variant="secondary" className={`text-xs ${moodColors.badge}`}>
                {moodDescription}
              </Badge>
            </div>
            <p className="text-sm text-neutral-600 mb-2">{pattern.description}</p>
            <div className="flex items-center space-x-2 text-xs text-neutral-400">
              <span>#{pattern.number}</span>
              <span>•</span>
              <span>{pattern.category}</span>
              <span>•</span>
              <span>{Math.round(pattern.confidence)}% match</span>
            </div>
          </div>
          <div className="ml-3">
            <div className={`w-12 h-12 bg-gradient-to-br ${gradientClass} rounded-lg flex items-center justify-center border-2 ${moodColors.border}`}>
              <IconComponent className={`w-5 h-5 text-white`} />
            </div>
          </div>
        </div>
        
        {/* Voting interface */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              className={`flex items-center space-x-1 px-3 py-1 rounded-full text-sm ${
                pattern.userVote === 'up' 
                  ? 'bg-secondary/20 text-secondary' 
                  : 'bg-gray-100 text-neutral-600 hover:bg-secondary/10 hover:text-secondary'
              }`}
              onClick={handleUpvote}
              disabled={!!pattern.userVote || isVoting}
            >
              <ThumbsUp className="w-3 h-3" />
              <span>{pattern.upvotes}</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`flex items-center space-x-1 px-3 py-1 rounded-full text-sm ${
                pattern.userVote === 'down'
                  ? 'bg-red-100 text-red-600'
                  : 'bg-gray-100 text-neutral-600 hover:bg-red-50 hover:text-red-600'
              }`}
              onClick={handleDownvote}
              disabled={!!pattern.userVote || isVoting}
            >
              <ThumbsDown className="w-3 h-3" />
              <span>{pattern.downvotes}</span>
            </Button>
          </div>
          <Button variant="ghost" size="sm" className="text-primary text-sm font-medium">
            Learn More
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
