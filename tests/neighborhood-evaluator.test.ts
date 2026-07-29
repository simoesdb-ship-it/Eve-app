import { describe, it, expect } from "vitest";
import {
  evaluateCluster,
  computeTrustScore,
  computeExtentMeters,
  type ClusterInput,
  type ClusterTrustSignals,
} from "../server/neighborhood-evaluator";
import {
  focusPatternProfiles,
  getFocusPatternProfile,
  isFocusPattern,
  NEIGHBORHOOD_POPULATION_TARGET,
} from "../server/neighborhood-patterns";

const baseCluster: ClusterInput = {
  id: "cluster_test",
  centerLat: 44.95,
  centerLng: -93.09,
  population: 120,
  area: 0.05, // km² — compact
  memberSessions: 8,
  activityPatterns: { peakHours: [17, 18, 12], movementIntensity: 2.5 },
  extentMeters: 250,
};

const noTrust: ClusterTrustSignals = {
  totalVoteWeight: 0,
  voteCount: 0,
  localResidentEntries: 0,
  consensusEntries: 0,
  supportRatio: 0,
  totalTimeSpentMinutes: 0,
};

const strongLocalTrust: ClusterTrustSignals = {
  totalVoteWeight: 25,
  voteCount: 15,
  localResidentEntries: 12,
  consensusEntries: 14,
  supportRatio: 0.85,
  totalTimeSpentMinutes: 900,
};

describe("focus pattern library", () => {
  it("contains all seven focus patterns", () => {
    expect(focusPatternProfiles.map(p => p.number).sort((a, b) => a - b)).toEqual([
      1, 2, 8, 12, 13, 14, 15,
    ]);
  });

  it("Pattern #14 carries Alexander's quantitative criteria", () => {
    const p14 = getFocusPatternProfile(14)!;
    expect(p14.criteria.populationRange[1]).toBe(500);
    expect(p14.criteria.maxExtentMeters).toBe(300);
    expect(p14.criteria.requiresBoundary).toBe(true);
    expect(p14.relationships.some(r => r.pattern === 12)).toBe(true);
    expect(p14.relationships.some(r => r.pattern === 15)).toBe(true);
  });

  it("identifies focus patterns", () => {
    expect(isFocusPattern(14)).toBe(true);
    expect(isFocusPattern(88)).toBe(false);
  });
});

describe("evaluateCluster — population band", () => {
  it("flags a cluster below the population band with the exact shortfall", () => {
    const result = evaluateCluster({ ...baseCluster, population: 120 }, noTrust);
    const popGap = result.gaps.find(g => g.criterion === "population");
    expect(popGap).toBeDefined();
    expect(popGap!.message).toContain(`${NEIGHBORHOOD_POPULATION_TARGET - 120}`);
    expect(result.estimatedPopulation).toBe(120);
    expect(result.status).not.toBe("identifiable");
  });

  it("does not raise a population gap inside the 350-700 band", () => {
    const result = evaluateCluster({ ...baseCluster, population: 450 }, noTrust);
    expect(result.gaps.find(g => g.criterion === "population")).toBeUndefined();
  });

  it("flags an oversized cluster and suggests subdivision", () => {
    const result = evaluateCluster({ ...baseCluster, population: 1500 }, noTrust);
    const popGap = result.gaps.find(g => g.criterion === "population");
    expect(popGap).toBeDefined();
    expect(popGap!.message).toMatch(/subdivid/i);
  });
});

describe("evaluateCluster — spatial extent", () => {
  it("flags an oversized extent with Alexander's 300m guidance", () => {
    const result = evaluateCluster({ ...baseCluster, extentMeters: 900 }, noTrust);
    const extentGap = result.gaps.find(g => g.criterion === "extent");
    expect(extentGap).toBeDefined();
    expect(extentGap!.message).toContain("900m");
    expect(extentGap!.message).toContain("300m");
  });

  it("accepts a compact cluster", () => {
    const result = evaluateCluster({ ...baseCluster, extentMeters: 250 }, noTrust);
    expect(result.gaps.find(g => g.criterion === "extent")).toBeUndefined();
  });

  it("computes extent from points when not provided", () => {
    // ~two points 0.005 deg latitude apart ≈ 555m
    const extent = computeExtentMeters([
      { lat: 44.95, lng: -93.09 },
      { lat: 44.955, lng: -93.09 },
    ]);
    expect(extent).toBeGreaterThan(500);
    expect(extent).toBeLessThan(620);
  });
});

describe("trust weighting", () => {
  it("local consensus outweighs transient activity", () => {
    // Transient: lots of votes but no local residents / consensus
    const transient: ClusterTrustSignals = {
      ...noTrust,
      totalVoteWeight: 40,
      voteCount: 40,
    };
    expect(computeTrustScore(strongLocalTrust)).toBeGreaterThan(computeTrustScore(transient));
    expect(computeTrustScore(transient)).toBeLessThanOrEqual(0.3);
  });

  it("raises the formation score for the same cluster when trust is strong", () => {
    const withoutTrust = evaluateCluster(baseCluster, noTrust);
    const withTrust = evaluateCluster(baseCluster, strongLocalTrust);
    expect(withTrust.formationScore).toBeGreaterThan(withoutTrust.formationScore);
    expect(withTrust.trustScore).toBeGreaterThan(0.7);
  });

  it("reports a trust gap when no votes or consensus exist", () => {
    const result = evaluateCluster(baseCluster, noTrust);
    const trustGap = result.gaps.find(g => g.criterion === "trust");
    expect(trustGap).toBeDefined();
    expect(trustGap!.message).toMatch(/trusted local input|No votes/i);
  });
});

describe("status classification", () => {
  it("marks a compliant, trusted cluster as identifiable", () => {
    const result = evaluateCluster(
      {
        ...baseCluster,
        population: 480,
        extentMeters: 280,
        area: 0.06,
        memberSessions: 20,
        activityPatterns: { peakHours: [8, 17, 19], movementIntensity: 4 },
      },
      strongLocalTrust,
    );
    expect(result.status).toBe("identifiable");
    expect(result.formationScore).toBeGreaterThanOrEqual(0.75);
  });

  it("never marks an oversized cluster as identifiable, even with strong trust", () => {
    const result = evaluateCluster(
      {
        ...baseCluster,
        population: 1500,
        extentMeters: 280,
        area: 0.06,
        memberSessions: 40,
        activityPatterns: { peakHours: [8, 17, 19], movementIntensity: 5 },
      },
      strongLocalTrust,
    );
    expect(result.status).not.toBe("identifiable");
  });

  it("marks a sparse, untrusted cluster as forming", () => {
    const result = evaluateCluster(
      {
        ...baseCluster,
        population: 10,
        memberSessions: 2,
        extentMeters: 1500,
        area: 2,
        activityPatterns: { peakHours: [], movementIntensity: 0.5 },
      },
      noTrust,
    );
    expect(result.status).toBe("forming");
  });
});

describe("narratives", () => {
  it("explains why the cluster formed in plain language", () => {
    const result = evaluateCluster(baseCluster, noTrust);
    expect(result.whyItFormed).toContain("8 people");
    expect(result.whyItFormed).toMatch(/Pattern #14/);
  });

  it("always provides at least one next action", () => {
    const good = evaluateCluster(
      { ...baseCluster, population: 480, extentMeters: 280, memberSessions: 20, activityPatterns: { peakHours: [8], movementIntensity: 4 } },
      strongLocalTrust,
    );
    expect(good.nextActions.length).toBeGreaterThan(0);
  });

  it("includes focus-pattern adherence for neighborhood/community patterns", () => {
    const result = evaluateCluster(baseCluster, noTrust);
    const numbers = result.patternAdherence.map(p => p.patternNumber);
    expect(numbers).toContain(14);
    expect(numbers).toContain(15);
    expect(numbers).toContain(12);
    expect(numbers).toContain(8);
    result.patternAdherence.forEach(pa => {
      expect(pa.adherence).toBeGreaterThanOrEqual(0);
      expect(pa.adherence).toBeLessThanOrEqual(1);
    });
  });
});
