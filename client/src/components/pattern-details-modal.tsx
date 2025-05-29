import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Utensils, Footprints, Users, MapPin, Route, Compass } from "lucide-react";
import type { Pattern, PatternWithVotes } from "@shared/schema";

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

interface PatternDetailsModalProps {
  pattern: Pattern | PatternWithVotes;
  isOpen: boolean;
  onClose: () => void;
}

export default function PatternDetailsModal({ pattern, isOpen, onClose }: PatternDetailsModalProps) {
  const IconComponent = iconMap[pattern.iconName] || Compass;
  const gradientClass = gradientMap[pattern.iconName] || "from-primary to-blue-300";
  const isPatternWithVotes = 'confidence' in pattern;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm mx-auto max-h-96 overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center space-x-3 mb-3">
            <div className={`w-12 h-12 bg-gradient-to-br ${gradientClass} rounded-lg flex items-center justify-center`}>
              <IconComponent className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-xl font-bold text-neutral-800">
                {pattern.name}
              </DialogTitle>
              <div className="flex items-center space-x-2 mt-1">
                <Badge variant="outline">#{pattern.number}</Badge>
                <Badge variant="secondary">{pattern.category}</Badge>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-sm text-neutral-800 mb-2">Description</h4>
            <p className="text-neutral-600 text-sm leading-relaxed">
              {pattern.fullDescription}
            </p>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-sm text-neutral-400">Pattern Number</div>
              <div className="font-semibold">#{pattern.number}</div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-sm text-neutral-400">Category</div>
              <div className="font-semibold">{pattern.category}</div>
            </div>
            {isPatternWithVotes && (
              <>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-sm text-neutral-400">Match Confidence</div>
                  <div className="font-semibold">{Math.round(pattern.confidence)}%</div>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-sm text-neutral-400">Community Votes</div>
                  <div className="font-semibold">
                    {pattern.upvotes}↑ {pattern.downvotes}↓
                  </div>
                </div>
              </>
            )}
          </div>

          <div>
            <h4 className="font-semibold text-sm text-neutral-800 mb-2">Keywords</h4>
            <div className="flex flex-wrap gap-1">
              {pattern.keywords.map((keyword, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {keyword}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
