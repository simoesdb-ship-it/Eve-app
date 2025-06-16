# Data Architecture Guide: Location Tracking System

## Three Distinct Data Types

### 1. Background Tracking Points (`spatialPoints` with type='tracking')
**Purpose**: Continuous GPS logging to understand movement patterns
**Data**: Minimal GPS coordinates stored every 30 seconds - 3 minutes
**Usage**: 
- Forms movement patterns and spatial density analysis
- Used by community analysis algorithms to detect clusters
- Background data collection with no user interaction required
- Stored in `spatialPoints` table with `type='tracking'`

**Example**:
```json
{
  "latitude": "44.979970",
  "longitude": "-93.289326", 
  "type": "tracking",
  "sessionId": "anon_user123",
  "metadata": "{}",
  "createdAt": "2024-12-16T22:15:00Z"
}
```

### 2. Real-time Location Information (`locations` table)
**Purpose**: Rich contextual data about current location when user actively requests it
**Data**: Detailed location analysis with Alexander patterns, confidence scores, suggestions
**Usage**:
- User clicks "Analyze Current Location" or visits specific coordinates
- Triggers pattern analysis against Christopher Alexander's 253 patterns
- Creates pattern suggestions with ML confidence scores
- Enables voting and community interaction
- Stored in `locations` table

**Example**:
```json
{
  "latitude": "44.979970",
  "longitude": "-93.289326",
  "name": "Downtown Minneapolis",
  "sessionId": "anon_user123",
  "createdAt": "2024-12-16T22:15:00Z"
}
```
*Plus related pattern suggestions, votes, and analysis data*

### 3. User-Saved Locations (`savedLocations` table)  
**Purpose**: Places the user deliberately chooses to store and retrieve
**Data**: Rich metadata including elevation, land use, urban density, pattern evaluation
**Usage**:
- User manually saves interesting locations
- Can add custom names, descriptions, notes
- Persistent storage for future reference
- User-controlled retrieval and management
- Stored in `savedLocations` table

**Example**:
```json
{
  "sessionId": "anon_user123",
  "latitude": "44.979970", 
  "longitude": "-93.289326",
  "name": "My Favorite Coffee Shop",
  "description": "Great place for Pattern 88 - Street Café",
  "address": "123 Main St, Minneapolis, MN",
  "elevation": "260.5",
  "landUse": "mixed_commercial",
  "urbanDensity": "medium_high",
  "patternEvaluation": "Strong Street Café pattern with good pedestrian flow",
  "createdAt": "2024-12-16T22:15:00Z"
}
```

## Data Flow

1. **Background**: App continuously logs GPS to `spatialPoints` (tracking)
2. **Active Analysis**: User requests location info → creates `locations` entry with pattern analysis  
3. **Manual Saving**: User saves interesting places → creates `savedLocations` entry

## Current Implementation Issues

The stats calculation was incorrectly mixing these data types. Fixed to properly count:
- **Tracking Points**: Background GPS breadcrumbs
- **Visited Locations**: Places with pattern analysis
- **Saved Locations**: User-curated locations
- **Pattern Suggestions**: Generated from visited locations
- **Votes**: Cast on pattern suggestions
- **Hours Contributed**: Calculated from tracking activity

## API Endpoints

- `GET /api/tracking/:sessionId` - Get background tracking points
- `POST /api/tracking` - Add background tracking point
- `GET /api/locations/:id/patterns` - Get pattern analysis for visited location
- `POST /api/locations` - Analyze current location (creates visited location)
- `GET /api/saved-locations` - Get user's saved locations
- `POST /api/saved-locations` - Save a location manually
- `GET /api/stats` - Personal statistics across all data types