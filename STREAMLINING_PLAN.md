# App Streamlining Plan - Alexander's Theory Applied

## Core Problem: Redundant Pattern Overlays
The current architecture creates multiple disconnected systems that duplicate functionality, violating Alexander's principle of pattern coherence.

## Phase 1: Consolidate Spatial Data (PRIORITY)
**Current Redundancy:**
- `locations` table (analyzed places)
- `trackingPoints` table (movement data) 
- `savedLocations` table (bookmarks)

**Solution:** Unified spatial model with type differentiation
```sql
CREATE TYPE spatial_point_type AS ENUM ('tracking', 'analyzed', 'saved');
CREATE TABLE spatial_points (
  id SERIAL PRIMARY KEY,
  latitude DECIMAL(12,8) NOT NULL,
  longitude DECIMAL(12,8) NOT NULL,
  type spatial_point_type NOT NULL,
  session_id TEXT NOT NULL,
  metadata JSONB, -- patterns, analysis results, bookmark info
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Phase 2: Eliminate Activity Table Redundancy
**Current Problem:** Activity events duplicate data already captured in core operations

**Solution:** Generate activity feed from actual data changes:
- Location analysis → derive from spatial_points where type='analyzed'
- Pattern suggestions → derive from spatial_points metadata
- Votes → derive from vote table changes
- Movement → derive from spatial_points where type='tracking'

## Phase 3: Simplify Pattern Discovery
**Current Complexity:** locations → patternSuggestions → patterns → votes

**Solution:** Direct pattern-location relationship:
```sql
CREATE TABLE pattern_applications (
  spatial_point_id INTEGER REFERENCES spatial_points(id),
  pattern_id INTEGER REFERENCES patterns(id),
  confidence DECIMAL(5,3),
  votes_up INTEGER DEFAULT 0,
  votes_down INTEGER DEFAULT 0,
  applied_at TIMESTAMP DEFAULT NOW()
);
```

## Phase 4: Centralized Session Context
**Current Problem:** Session IDs scattered across tables without relationship modeling

**Solution:** Session-centric data clustering with clear boundaries

## Phase 5: UI Pattern Consolidation
**Current Issue:** Feature explanations repeated in multiple interface sections

**Solution:** Single source of truth for feature descriptions, dynamic content rendering

## Implementation Priority:
1. Fix database precision errors (DONE)
2. Consolidate spatial data model
3. Remove activity table redundancy  
4. Simplify pattern relationships
5. Centralize session management
6. Consolidate UI patterns

## Expected Outcomes:
- 40% reduction in database complexity
- Elimination of data duplication
- Cleaner API surface
- More intuitive user interface
- Better performance through reduced joins