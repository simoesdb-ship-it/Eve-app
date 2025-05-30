// Pattern Mood Color System
// This system provides visual categorization of Christopher Alexander patterns

export interface PatternMoodColors {
  background: string;
  border: string;
  text: string;
  icon: string;
  badge: string;
}

export const patternMoodColorMap: Record<string, PatternMoodColors> = {
  // Warm, social gathering (cafes, restaurants, social spaces)
  amber: {
    background: "bg-amber-50 dark:bg-amber-950",
    border: "border-amber-200 dark:border-amber-800",
    text: "text-amber-900 dark:text-amber-100",
    icon: "text-amber-600 dark:text-amber-400",
    badge: "bg-amber-100 text-amber-800 dark:bg-amber-800 dark:text-amber-100"
  },
  
  // Natural, movement, health (pedestrian areas, green spaces)
  green: {
    background: "bg-green-50 dark:bg-green-950",
    border: "border-green-200 dark:border-green-800", 
    text: "text-green-900 dark:text-green-100",
    icon: "text-green-600 dark:text-green-400",
    badge: "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100"
  },
  
  // Community, gathering, social (squares, meeting spaces)
  purple: {
    background: "bg-purple-50 dark:bg-purple-950",
    border: "border-purple-200 dark:border-purple-800",
    text: "text-purple-900 dark:text-purple-100", 
    icon: "text-purple-600 dark:text-purple-400",
    badge: "bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-100"
  },
  
  // Energy, activity, intensity (active nodes, busy areas)
  red: {
    background: "bg-red-50 dark:bg-red-950",
    border: "border-red-200 dark:border-red-800",
    text: "text-red-900 dark:text-red-100",
    icon: "text-red-600 dark:text-red-400", 
    badge: "bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100"
  },
  
  // Structure, connection, flow (transportation, networks)
  blue: {
    background: "bg-blue-50 dark:bg-blue-950",
    border: "border-blue-200 dark:border-blue-800",
    text: "text-blue-900 dark:text-blue-100",
    icon: "text-blue-600 dark:text-blue-400",
    badge: "bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100"
  },
  
  // Calm, residential, private (housing, quiet spaces)
  slate: {
    background: "bg-slate-50 dark:bg-slate-950",
    border: "border-slate-200 dark:border-slate-800",
    text: "text-slate-900 dark:text-slate-100",
    icon: "text-slate-600 dark:text-slate-400",
    badge: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100"
  }
};

export function getPatternMoodColors(moodColor: string): PatternMoodColors {
  return patternMoodColorMap[moodColor] || patternMoodColorMap.blue;
}

export function getPatternMoodDescription(moodColor: string): string {
  const descriptions: Record<string, string> = {
    amber: "Warm & Social",
    green: "Natural & Healthy", 
    purple: "Community Focused",
    red: "Active & Energetic",
    blue: "Structured & Connected",
    slate: "Calm & Private"
  };
  
  return descriptions[moodColor] || "General Pattern";
}

export function getAllMoodColors(): Array<{ color: string; description: string; colors: PatternMoodColors }> {
  return Object.keys(patternMoodColorMap).map(color => ({
    color,
    description: getPatternMoodDescription(color),
    colors: patternMoodColorMap[color]
  }));
}