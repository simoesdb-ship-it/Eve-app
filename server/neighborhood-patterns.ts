// Enriched profiles for the neighborhood-formation focus patterns from
// Christopher Alexander's "A Pattern Language".
//
// These seven patterns form the region → subculture mosaic → neighborhood
// hierarchy that guides users toward forming identifiable neighborhoods of
// roughly 500 people — Alexander's threshold for a group small enough for
// true democratic input (Pattern #14).

export interface QuantitativeCriteria {
  /** Ideal population band [min, max] in people. */
  populationRange: [number, number];
  /** Maximum spatial extent across, in meters (Alexander: ~300 yards ≈ 275m; we use 300m). */
  maxExtentMeters?: number;
  /** Whether the pattern requires a recognizable boundary. */
  requiresBoundary: boolean;
}

export interface FocusPatternProfile {
  number: number;
  name: string;
  /** The problem statement, condensed from the book. */
  problem: string;
  /** The solution ("Therefore ...") condensed from the book. */
  solution: string;
  criteria: QuantitativeCriteria;
  /** Where this pattern sits in the region → mosaic → neighborhood hierarchy. */
  hierarchyLevel: "region" | "town" | "community" | "neighborhood";
  /** Explicit relationships to the other focus patterns. */
  relationships: { pattern: number; relation: string }[];
}

export const FOCUS_PATTERN_NUMBERS = [1, 2, 8, 12, 13, 14, 15] as const;

export const focusPatternProfiles: FocusPatternProfile[] = [
  {
    number: 1,
    name: "Independent Regions",
    problem:
      "Metropolitan regions will not come to balance until each one is small and autonomous enough to be an independent sphere of culture.",
    solution:
      "Work toward the evolution of independent regions, each with a population between 2 and 10 million, its own natural boundaries, its own economy, autonomous and self-governing.",
    criteria: {
      populationRange: [2_000_000, 10_000_000],
      requiresBoundary: true,
    },
    hierarchyLevel: "region",
    relationships: [
      { pattern: 2, relation: "The region's population should be distributed across many small towns (#2)." },
      { pattern: 8, relation: "Within the region, encourage a mosaic of subcultures (#8)." },
    ],
  },
  {
    number: 2,
    name: "The Distribution of Towns",
    problem:
      "If the population of a region is weighted toward big cities, the region is top-heavy and unstable.",
    solution:
      "Encourage a birth-and-death process of towns so population distributes logarithmically: many small towns and villages, few large cities.",
    criteria: {
      populationRange: [5_000, 50_000],
      requiresBoundary: false,
    },
    hierarchyLevel: "town",
    relationships: [
      { pattern: 1, relation: "Towns distribute population within an independent region (#1)." },
      { pattern: 12, relation: "Each town is built from political communities of at most 7000 (#12)." },
    ],
  },
  {
    number: 8,
    name: "Mosaic of Subcultures",
    problem:
      "The homogeneous, undifferentiated character of modern cities kills all variety of lifestyles and arrests the growth of individual character.",
    solution:
      "Encourage a mosaic of subcultures, each strongly articulated with its own spatial territory, each small enough that people can shape its character, each at least partly surrounded by others.",
    criteria: {
      populationRange: [500, 7_000],
      requiresBoundary: true,
    },
    hierarchyLevel: "community",
    relationships: [
      { pattern: 13, relation: "Each subculture needs a boundary zone to protect its way of life (#13)." },
      { pattern: 14, relation: "Subcultures are made of identifiable neighborhoods (#14)." },
    ],
  },
  {
    number: 12,
    name: "Community of 7000",
    problem:
      "Individuals have no effective voice in any community of more than 5,000–10,000 persons; beyond this scale people are separated from the centers of decision.",
    solution:
      "Decentralize city governments into political communities of 500 to 7000 people, each with its own natural geographic and historical boundaries and substantial autonomy.",
    criteria: {
      populationRange: [500, 7_000],
      requiresBoundary: true,
    },
    hierarchyLevel: "community",
    relationships: [
      { pattern: 14, relation: "The community of 7000 is composed of identifiable neighborhoods of ~500 (#14)." },
      { pattern: 8, relation: "Communities gain identity when they coincide with subcultures (#8)." },
    ],
  },
  {
    number: 13,
    name: "Subculture Boundary",
    problem:
      "The mosaic of subcultures requires that hundreds of different cultures live in their own way, at full intensity, next door to one another — which only works if they are protected from each other.",
    solution:
      "Separate neighboring subcultures with a swath of land at least 200 feet wide — natural boundaries, water, parks, roads, industry — permeable enough for movement between them.",
    criteria: {
      populationRange: [0, 0], // a boundary is land, not people
      requiresBoundary: true,
    },
    hierarchyLevel: "community",
    relationships: [
      { pattern: 8, relation: "Boundaries make the mosaic of subcultures (#8) possible." },
      { pattern: 15, relation: "At the neighborhood scale the same role is played by the neighborhood boundary (#15)." },
    ],
  },
  {
    number: 14,
    name: "Identifiable Neighborhood",
    problem:
      "People need an identifiable spatial unit to belong to. Without one, they cannot know their neighbors or act together on shared concerns.",
    solution:
      "Help people define the neighborhoods they live in: not more than 300 yards (~275m) across, with no more than 400 or 500 inhabitants, protected from heavy traffic.",
    criteria: {
      populationRange: [350, 500],
      maxExtentMeters: 300,
      requiresBoundary: true,
    },
    hierarchyLevel: "neighborhood",
    relationships: [
      { pattern: 12, relation: "Neighborhoods federate into a community of 7000 (#12) for political voice." },
      { pattern: 15, relation: "The neighborhood needs a boundary (#15) so people know where they belong." },
      { pattern: 8, relation: "Neighborhoods with strong character form the tiles of the subculture mosaic (#8)." },
    ],
  },
  {
    number: 15,
    name: "Neighborhood Boundary",
    problem:
      "Where the boundary between neighborhoods is unclear, people don't know where they belong, and the neighborhood cannot maintain an identifiable character.",
    solution:
      "Encourage a boundary around each neighborhood — restricted access, gateways, narrow streets — keeping major roads outside so the interior stays calm.",
    criteria: {
      populationRange: [200, 600],
      maxExtentMeters: 400,
      requiresBoundary: true,
    },
    hierarchyLevel: "neighborhood",
    relationships: [
      { pattern: 14, relation: "The boundary gives the identifiable neighborhood (#14) its edge." },
      { pattern: 13, relation: "Neighborhood boundaries aggregate into subculture boundaries (#13)." },
    ],
  },
];

export function getFocusPatternProfile(patternNumber: number): FocusPatternProfile | undefined {
  return focusPatternProfiles.find(p => p.number === patternNumber);
}

export function isFocusPattern(patternNumber: number): boolean {
  return (FOCUS_PATTERN_NUMBERS as readonly number[]).includes(patternNumber);
}

/** Alexander's democratic neighborhood target (Pattern #14). */
export const NEIGHBORHOOD_POPULATION_TARGET = 500;
export const NEIGHBORHOOD_MAX_EXTENT_METERS = 300;
