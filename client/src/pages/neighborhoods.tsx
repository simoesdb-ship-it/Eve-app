import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import BottomNavigation from "@/components/bottom-navigation";
import { Users, Ruler, Shield, Home, ArrowLeft, Sparkles, CheckCircle2 } from "lucide-react";

interface FormationGap {
  criterion: string;
  message: string;
  progress: number;
}

interface CandidateNeighborhood {
  clusterId: string;
  centerLat: number;
  centerLng: number;
  estimatedPopulation: number;
  populationTarget: number;
  extentMeters: number;
  maxExtentMeters: number;
  memberSessions: number;
  formationScore: number;
  trustScore: number;
  status: "forming" | "candidate" | "identifiable";
  whyItFormed: string;
  gaps: FormationGap[];
  nextActions: string[];
  patternAdherence: { patternNumber: number; patternName: string; adherence: number; note: string }[];
}

interface NeighborhoodsResponse {
  target: { population: number; maxExtentMeters: number };
  focusPatterns: { number: number; name: string; problem: string; solution: string }[];
  candidates: CandidateNeighborhood[];
}

const statusStyles: Record<string, string> = {
  identifiable: "bg-green-100 text-green-800 border-green-200",
  candidate: "bg-amber-100 text-amber-800 border-amber-200",
  forming: "bg-blue-100 text-blue-800 border-blue-200",
};

const statusLabels: Record<string, string> = {
  identifiable: "Identifiable Neighborhood",
  candidate: "Candidate Neighborhood",
  forming: "Forming",
};

export default function NeighborhoodsPage() {
  const { data, isLoading, isError } = useQuery<NeighborhoodsResponse>({
    queryKey: ["/api/neighborhoods"],
    queryFn: async () => {
      const res = await fetch("/api/neighborhoods");
      if (!res.ok) throw new Error("Failed to load candidate neighborhoods");
      return res.json();
    },
  });

  return (
    <div className="flex flex-col min-h-screen bg-neutral-50 pb-24">
      <header className="bg-primary text-white px-4 py-4">
        <div className="flex items-center gap-3">
          <Link href="/">
            <ArrowLeft className="w-5 h-5 cursor-pointer" data-testid="link-back" />
          </Link>
          <div>
            <h1 className="text-lg font-semibold">Neighborhood Formation</h1>
            <p className="text-xs opacity-80">
              Toward identifiable neighborhoods of ~500 people (Pattern #14)
            </p>
          </div>
        </div>
      </header>

      <div className="px-4 py-4 space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Home className="w-4 h-4 text-primary" />
              Why 500 people?
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-neutral-600">
            Christopher Alexander found that people only have a real democratic voice in
            groups small enough to know each other: an identifiable neighborhood of no more
            than 400–500 inhabitants, no more than ~300m across, with a recognizable
            boundary. The clusters below form from your community's shared activity and are
            validated through trusted local input — weighted votes and consensus — not just
            foot traffic.
          </CardContent>
        </Card>

        {isLoading && (
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-2/3 mb-3"></div>
                <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        )}

        {isError && (
          <Card>
            <CardContent className="pt-6 text-center text-neutral-600">
              Could not load candidate neighborhoods. Please try again later.
            </CardContent>
          </Card>
        )}

        {data && data.candidates.length === 0 && (
          <Card>
            <CardContent className="pt-6 text-center">
              <Sparkles className="w-10 h-10 mx-auto mb-3 text-neutral-300" />
              <p className="text-neutral-600 font-medium">No clusters detected yet</p>
              <p className="text-sm text-neutral-400 mt-1">
                Clusters form when several people track activity in the same area within a
                week. Keep discovering locations to seed your first candidate neighborhood.
              </p>
            </CardContent>
          </Card>
        )}

        {data?.candidates.map(candidate => (
          <Card key={candidate.clusterId} data-testid={`card-neighborhood-${candidate.clusterId}`}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base">
                  Cluster near {candidate.centerLat.toFixed(4)}, {candidate.centerLng.toFixed(4)}
                </CardTitle>
                <Badge className={statusStyles[candidate.status]}>
                  {statusLabels[candidate.status]}
                </Badge>
              </div>
              <CardDescription>{candidate.whyItFormed}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-xs text-neutral-500 mb-1">
                  <span>Formation score</span>
                  <span>{Math.round(candidate.formationScore * 100)}%</span>
                </div>
                <Progress value={candidate.formationScore * 100} />
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-neutral-50 rounded-lg p-2">
                  <Users className="w-4 h-4 mx-auto text-primary mb-1" />
                  <div className="text-sm font-semibold" data-testid={`text-population-${candidate.clusterId}`}>
                    {candidate.estimatedPopulation} / {candidate.populationTarget}
                  </div>
                  <div className="text-[10px] text-neutral-400">Est. people</div>
                </div>
                <div className="bg-neutral-50 rounded-lg p-2">
                  <Ruler className="w-4 h-4 mx-auto text-primary mb-1" />
                  <div className="text-sm font-semibold">
                    {candidate.extentMeters}m
                  </div>
                  <div className="text-[10px] text-neutral-400">Extent (max {candidate.maxExtentMeters}m)</div>
                </div>
                <div className="bg-neutral-50 rounded-lg p-2">
                  <Shield className="w-4 h-4 mx-auto text-primary mb-1" />
                  <div className="text-sm font-semibold">
                    {Math.round(candidate.trustScore * 100)}%
                  </div>
                  <div className="text-[10px] text-neutral-400">Trust validated</div>
                </div>
              </div>

              {candidate.gaps.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-neutral-500 uppercase mb-2">
                    What it needs
                  </h4>
                  <ul className="space-y-1.5">
                    {candidate.gaps.map((gap, i) => (
                      <li key={i} className="text-sm text-neutral-600 flex gap-2">
                        <span className="text-amber-500 mt-0.5">•</span>
                        <span>{gap.message}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <h4 className="text-xs font-semibold text-neutral-500 uppercase mb-2">
                  How to strengthen it
                </h4>
                <ul className="space-y-1.5">
                  {candidate.nextActions.map((action, i) => (
                    <li key={i} className="text-sm text-neutral-600 flex gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-neutral-500 uppercase mb-2">
                  Pattern adherence
                </h4>
                <div className="space-y-1.5">
                  {candidate.patternAdherence.map(pa => (
                    <div key={pa.patternNumber} className="flex items-center gap-2 text-sm">
                      <span className="text-neutral-600 flex-1 truncate">
                        #{pa.patternNumber} {pa.patternName}
                      </span>
                      <Progress value={pa.adherence * 100} className="w-20 h-1.5" />
                      <span className="text-xs text-neutral-400 w-9 text-right">
                        {Math.round(pa.adherence * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <BottomNavigation activeTab="discover" />
    </div>
  );
}
