// Neighborhood Candidate Evaluation Engine
//
// Takes the spatial clusters detected by the CommunityAnalysisAgent and scores
// each one against the focus-pattern criteria from Alexander's "A Pattern
// Language" (see neighborhood-patterns.ts), producing a formation score, a gap
// analysis, and a plain-language explanation of why the cluster exists and
// what it lacks to become an identifiable neighborhood of ~500 people.
//
// Trust weighting: weighted votes and consensus data (local-resident status,
// support levels, time spent) carry more influence on a cluster's neighborhood
// status than raw drive-by activity.

import { db } from "./db";
import { votes, consensusBuilding } from "@shared/schema";
import { inArray } from "drizzle-orm";
import { communityAgent, type CommunityCluster } from "./community-agent";
import {
  focusPatternProfiles,
  getFocusPatternProfile,
  NEIGHBORHOOD_POPULATION_TARGET,
  NEIGHBORHOOD_MAX_EXTENT_METERS,
} from "./neighborhood-patterns";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ClusterTrustSignals {
  /** Sum of vote weights cast by sessions active in this cluster. */
  totalVoteWeight: number;
  /** Number of votes from sessions in the cluster. */
  voteCount: number;
  /** Consensus entries from local residents. */
  localResidentEntries: number;
  /** Total consensus entries. */
  consensusEntries: number;
  /** Share of consensus entries that support or strongly support (0-1). */
  supportRatio: number;
  /** Total minutes spent at locations in the cluster (votes + consensus). */
  totalTimeSpentMinutes: number;
}

export interface FormationGap {
  criterion: "population" | "extent" | "boundary" | "cohesion" | "trust";
  message: string;
  /** 0-1: how close the cluster is to satisfying this criterion. */
  progress: number;
}

export interface CandidateNeighborhood {
  clusterId: string;
  centerLat: number;
  centerLng: number;
  estimatedPopulation: number;
  populationTarget: number;
  /** Longest span of the cluster, meters. */
  extentMeters: number;
  maxExtentMeters: number;
  memberSessions: number;
  /** 0-1 overall formation score. */
  formationScore: number;
  /** 0-1 trust-validation score derived from votes/consensus. */
  trustScore: number;
  status: "forming" | "candidate" | "identifiable";
  whyItFormed: string;
  gaps: FormationGap[];
  nextActions: string[];
  trust: ClusterTrustSignals;
  /** Focus-pattern adherence, keyed by pattern number. */
  patternAdherence: { patternNumber: number; patternName: string; adherence: number; note: string }[];
}

// ---------------------------------------------------------------------------
// Pure evaluation logic (unit-testable, no DB access)
// ---------------------------------------------------------------------------

export interface ClusterInput {
  id: string;
  centerLat: number;
  centerLng: number;
  population: number;
  /** km² */
  area: number;
  memberSessions: number;
  activityPatterns?: { peakHours: number[]; movementIntensity: number };
  /** Points used to compute extent; optional if extentMeters given. */
  points?: { lat: number; lng: number }[];
  extentMeters?: number;
}

const EMPTY_TRUST: ClusterTrustSignals = {
  totalVoteWeight: 0,
  voteCount: 0,
  localResidentEntries: 0,
  consensusEntries: 0,
  supportRatio: 0,
  totalTimeSpentMinutes: 0,
};

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function computeExtentMeters(points: { lat: number; lng: number }[]): number {
  if (!points || points.length < 2) return 0;
  let max = 0;
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const d = haversineMeters(points[i].lat, points[i].lng, points[j].lat, points[j].lng);
      if (d > max) max = d;
    }
  }
  return Math.round(max);
}

/**
 * Trust score (0-1). Local consensus carries far more weight than raw votes,
 * and raw votes more than mere activity (which contributes nothing here).
 */
export function computeTrustScore(trust: ClusterTrustSignals): number {
  // Local-resident consensus: strongest signal (up to 0.5)
  const localSignal = Math.min(trust.localResidentEntries / 10, 1) * 0.5;
  // Support ratio among consensus entries (up to 0.2)
  const supportSignal = trust.consensusEntries > 0 ? trust.supportRatio * 0.2 : 0;
  // Weighted votes (up to 0.2) — weight already encodes time-at-location
  const voteSignal = Math.min(trust.totalVoteWeight / 20, 1) * 0.2;
  // Time spent (up to 0.1)
  const timeSignal = Math.min(trust.totalTimeSpentMinutes / 600, 1) * 0.1;
  return Math.min(localSignal + supportSignal + voteSignal + timeSignal, 1);
}

export function evaluateCluster(
  cluster: ClusterInput,
  trust: ClusterTrustSignals = EMPTY_TRUST,
): CandidateNeighborhood {
  const extentMeters =
    cluster.extentMeters ?? computeExtentMeters(cluster.points ?? []);
  const pop = Math.max(0, Math.round(cluster.population));
  const target = NEIGHBORHOOD_POPULATION_TARGET;
  const maxExtent = NEIGHBORHOOD_MAX_EXTENT_METERS;

  const gaps: FormationGap[] = [];
  const nextActions: string[] = [];

  // --- Population (Pattern #14: 400-500 inhabitants) ---
  const popProgress = Math.min(pop / target, 1);
  if (pop < 350) {
    gaps.push({
      criterion: "population",
      message: `Estimated ${pop} active people — ${target - pop} short of Alexander's ~${target}-person democratic threshold (Pattern #14).`,
      progress: popProgress,
    });
    nextActions.push("Invite neighbors to track locations and vote here — population is estimated from active participants.");
  } else if (pop > 700) {
    gaps.push({
      criterion: "population",
      message: `Estimated ${pop} people exceeds the ~500-person neighborhood scale; Alexander suggests subdividing into smaller identifiable neighborhoods (Pattern #14) federated under a Community of 7000 (Pattern #12).`,
      progress: Math.max(0, 1 - (pop - 700) / target),
    });
    nextActions.push("Consider recognizing distinct sub-areas as separate neighborhoods with their own boundaries.");
  }

  // --- Spatial extent (Pattern #14: max ~300m across) ---
  const extentOk = extentMeters === 0 || extentMeters <= maxExtent;
  const extentProgress = extentMeters === 0 ? 0.5 : Math.min(maxExtent / Math.max(extentMeters, 1), 1);
  if (!extentOk) {
    gaps.push({
      criterion: "extent",
      message: `This cluster spans ${extentMeters}m — Alexander suggests neighborhoods stay under ${maxExtent}m across so everyone is within a short walk (Pattern #14).`,
      progress: extentProgress,
    });
    nextActions.push("Focus activity around the cluster's core so a compact, walkable neighborhood emerges.");
  }

  // --- Boundary definition (Patterns #13, #15) ---
  // Approximated by spatial cohesion: a compact cluster with a clear core reads
  // as having an implicit boundary; a sprawling one does not.
  const areaMeters2 = cluster.area * 1_000_000;
  const idealArea = Math.PI * (maxExtent / 2) ** 2;
  const boundaryProgress = areaMeters2 > 0 ? Math.min(idealArea / areaMeters2, 1) : 0.5;
  if (boundaryProgress < 0.5) {
    gaps.push({
      criterion: "boundary",
      message: `Activity is spread over ~${cluster.area.toFixed(2)} km² with no clear edge — Alexander calls for a recognizable boundary around each neighborhood (Patterns #13, #15).`,
      progress: boundaryProgress,
    });
    nextActions.push("Identify natural edges (parks, major roads, water) that could serve as the neighborhood boundary.");
  }

  // --- Subculture cohesion (Pattern #8) ---
  // Signals: shared peak hours and repeat activity intensity.
  const intensity = cluster.activityPatterns?.movementIntensity ?? 0;
  const cohesionProgress = Math.min(intensity / 3, 1) * 0.5 + Math.min(cluster.memberSessions / 10, 1) * 0.5;
  if (cohesionProgress < 0.4) {
    gaps.push({
      criterion: "cohesion",
      message: `Few repeat visits and overlapping schedules so far — a strong subculture (Pattern #8) shows up as shared rhythms of daily life.`,
      progress: cohesionProgress,
    });
    nextActions.push("Return regularly and comment on locations here — repeated shared presence builds subculture cohesion.");
  }

  // --- Trust validation ---
  const trustScore = computeTrustScore(trust);
  if (trustScore < 0.4) {
    gaps.push({
      criterion: "trust",
      message:
        trust.consensusEntries === 0 && trust.voteCount === 0
          ? "No votes or consensus input from this area yet — neighborhood status is validated by trusted local input, not just foot traffic."
          : `Trust validation at ${Math.round(trustScore * 100)}% — more input from local residents (weighted votes, consensus) is needed to confirm this as a neighborhood.`,
      progress: trustScore,
    });
    nextActions.push("Vote on pattern suggestions and add consensus input as a local resident to validate the cluster.");
  }

  // --- Formation score: weighted blend, trust-heavy ---
  const formationScore = Math.min(
    popProgress * 0.3 +
      extentProgress * 0.15 +
      boundaryProgress * 0.15 +
      cohesionProgress * 0.1 +
      trustScore * 0.3,
    1,
  );

  // Pattern #14: identifiable requires being INSIDE the population band —
  // an oversized cluster must subdivide, no matter how strong other signals are.
  const status: CandidateNeighborhood["status"] =
    formationScore >= 0.75 && pop >= 350 && pop <= 700 && extentOk && trustScore >= 0.4
      ? "identifiable"
      : formationScore >= 0.4
        ? "candidate"
        : "forming";

  // --- Why it formed (plain language) ---
  const peakHours = cluster.activityPatterns?.peakHours ?? [];
  const peakDesc =
    peakHours.length > 0
      ? `with activity peaking around ${peakHours
          .slice(0, 2)
          .map(h => `${h}:00`)
          .join(" and ")}`
      : "";
  const whyItFormed =
    `This cluster formed because ${cluster.memberSessions} ${cluster.memberSessions === 1 ? "person" : "people"} ` +
    `repeatedly tracked activity within about ${extentMeters > 0 ? `${extentMeters}m` : `${cluster.area.toFixed(2)} km²`} ` +
    `of each other ${peakDesc}`.trim() +
    `. Shared locations and overlapping presence are the raw material of an identifiable neighborhood (Pattern #14).`;

  // --- Focus pattern adherence ---
  const patternAdherence = focusPatternProfiles
    .filter(p => ["neighborhood", "community"].includes(p.hierarchyLevel))
    .map(p => {
      let adherence = 0;
      let note = "";
      const [minP, maxP] = p.criteria.populationRange;
      if (maxP > 0) {
        adherence = pop >= minP && pop <= maxP ? 1 : pop < minP ? pop / Math.max(minP, 1) : Math.max(0, 1 - (pop - maxP) / maxP);
        note =
          pop < minP
            ? `Population ${pop} below the ${minP}–${maxP} band.`
            : pop > maxP
              ? `Population ${pop} above the ${minP}–${maxP} band.`
              : `Population ${pop} within the ${minP}–${maxP} band.`;
      } else {
        // Boundary patterns: use boundary progress
        adherence = boundaryProgress;
        note = boundaryProgress >= 0.5 ? "Cluster is compact enough to imply an edge." : "No clear boundary yet.";
      }
      if (p.criteria.maxExtentMeters && extentMeters > p.criteria.maxExtentMeters) {
        adherence *= 0.5;
        note += ` Extent ${extentMeters}m exceeds the ${p.criteria.maxExtentMeters}m guidance.`;
      }
      return {
        patternNumber: p.number,
        patternName: p.name,
        adherence: Math.round(Math.min(Math.max(adherence, 0), 1) * 100) / 100,
        note: note.trim(),
      };
    });

  if (nextActions.length === 0) {
    nextActions.push("Keep participating — this cluster meets Alexander's criteria for an identifiable neighborhood.");
  }

  return {
    clusterId: cluster.id,
    centerLat: cluster.centerLat,
    centerLng: cluster.centerLng,
    estimatedPopulation: pop,
    populationTarget: target,
    extentMeters,
    maxExtentMeters: maxExtent,
    memberSessions: cluster.memberSessions,
    formationScore: Math.round(formationScore * 100) / 100,
    trustScore: Math.round(trustScore * 100) / 100,
    status,
    whyItFormed,
    gaps,
    nextActions,
    trust,
    patternAdherence,
  };
}

// ---------------------------------------------------------------------------
// DB-backed orchestration
// ---------------------------------------------------------------------------

export class NeighborhoodEvaluator {
  /** Radius (km) around a cluster center considered "inside" the cluster. */
  private readonly CLUSTER_RADIUS_KM = 0.75;
  /** Evaluation cache: clustering + trust aggregation is expensive, so results
   *  are reused for a few minutes rather than recomputed on every request
   *  (POST /api/locations calls findCandidateForPoint on its hot path). */
  private readonly CACHE_TTL_MS = 5 * 60 * 1000;
  private cache: { at: number; results: CandidateNeighborhood[] } | null = null;
  private inflight: Promise<CandidateNeighborhood[]> | null = null;

  async evaluateAllClusters(): Promise<CandidateNeighborhood[]> {
    if (this.cache && Date.now() - this.cache.at < this.CACHE_TTL_MS) {
      return this.cache.results;
    }
    if (this.inflight) return this.inflight;
    this.inflight = this.computeAllClusters()
      .then(results => {
        this.cache = { at: Date.now(), results };
        return results;
      })
      .finally(() => {
        this.inflight = null;
      });
    return this.inflight;
  }

  private async computeAllClusters(): Promise<CandidateNeighborhood[]> {
    const clusters = await this.detectClusters();
    const results: CandidateNeighborhood[] = [];
    for (const cluster of clusters) {
      const trust = await this.gatherTrustSignals(cluster);
      results.push(
        evaluateCluster(
          {
            id: cluster.id,
            centerLat: cluster.centerLat,
            centerLng: cluster.centerLng,
            population: cluster.population,
            area: cluster.area,
            memberSessions: new Set((cluster.trackedCoordinates ?? []).map(c => c.sessionId)).size,
            activityPatterns: cluster.activityPatterns,
            points: (cluster.trackedCoordinates ?? []).map(c => ({ lat: c.lat, lng: c.lng })),
          },
          trust,
        ),
      );
    }
    return results.sort((a, b) => b.formationScore - a.formationScore);
  }

  /** Find the candidate neighborhood (if any) containing the given point. */
  async findCandidateForPoint(lat: number, lng: number): Promise<CandidateNeighborhood | null> {
    const all = await this.evaluateAllClusters();
    for (const c of all) {
      const dKm = haversineMeters(lat, lng, c.centerLat, c.centerLng) / 1000;
      const radiusKm = Math.max(this.CLUSTER_RADIUS_KM, c.extentMeters / 2000);
      if (dKm <= radiusKm) return c;
    }
    return null;
  }

  private async detectClusters(): Promise<CommunityCluster[]> {
    // Reuse the community agent's DBSCAN clustering via its public analysis.
    // analyzePattern(14) detects clusters and scores them against Pattern #14;
    // we only need the detected communities.
    const interpretation = await communityAgent.analyzePattern(14);
    return interpretation?.detectedCommunities ?? [];
  }

  private async gatherTrustSignals(cluster: CommunityCluster): Promise<ClusterTrustSignals> {
    const sessionIds = Array.from(
      new Set((cluster.trackedCoordinates ?? []).map(c => c.sessionId)),
    );
    if (sessionIds.length === 0) return { ...EMPTY_TRUST };

    try {
      // Votes by cluster members
      const voteRows = await db
        .select({
          weight: votes.weight,
          timeSpent: votes.timeSpentMinutes,
        })
        .from(votes)
        .where(inArray(votes.sessionId, sessionIds));

      // Consensus by cluster members
      const consensusRows = await db
        .select({
          supportLevel: consensusBuilding.supportLevel,
          isLocalResident: consensusBuilding.isLocalResident,
          timeSpent: consensusBuilding.timeSpentAtLocation,
        })
        .from(consensusBuilding)
        .where(inArray(consensusBuilding.sessionId, sessionIds));

      const totalVoteWeight = voteRows.reduce((s, v) => s + Number(v.weight || 1), 0);
      const supportive = consensusRows.filter(c =>
        ["support", "strongly_support"].includes(c.supportLevel),
      ).length;

      return {
        totalVoteWeight,
        voteCount: voteRows.length,
        localResidentEntries: consensusRows.filter(c => c.isLocalResident).length,
        consensusEntries: consensusRows.length,
        supportRatio: consensusRows.length > 0 ? supportive / consensusRows.length : 0,
        totalTimeSpentMinutes:
          voteRows.reduce((s, v) => s + (v.timeSpent || 0), 0) +
          consensusRows.reduce((s, c) => s + (c.timeSpent || 0), 0),
      };
    } catch (error) {
      console.error("Failed to gather trust signals for cluster", cluster.id, error);
      return { ...EMPTY_TRUST };
    }
  }
}

export const neighborhoodEvaluator = new NeighborhoodEvaluator();
