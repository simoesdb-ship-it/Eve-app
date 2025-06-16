# GPS Tracking System Analysis

## Current State: What the App is Actually Doing

### Background Tracking (Not Working)
- **Intent**: Capture GPS breadcrumbs every 30 seconds for movement pattern analysis
- **Current Behavior**: Records 0 points because it requires 1+ meter movement threshold
- **Problem**: In static testing environments, no movement detected = no data saved
- **Storage**: Should go to `spatialPoints` table with `type='tracking'`

### Active Location Analysis (Working)
- **Intent**: Rich contextual data when user requests location analysis  
- **Current Behavior**: Creates pattern analysis with confidence scores
- **Storage**: Goes to `locations` table with pattern suggestions
- **Trigger**: User clicks "Analyze Current Location"

### Manual Location Saving (Working)
- **Intent**: User deliberately saves places with metadata
- **Current Behavior**: Saves locations with rich contextual information
- **Storage**: Goes to `savedLocations` table
- **Trigger**: User manually saves a location

## The Core Problem

Your vision is continuous background GPS logging to understand movement patterns, but the current implementation has a movement threshold that prevents data collection in static environments.

## What Should Happen

1. **Background Tracking**: Continuous GPS logging regardless of movement (time-based, not distance-based)
2. **Real-time Analysis**: On-demand rich location analysis with Alexander patterns
3. **User Saving**: Manual curation of interesting locations

## GPS Data Flow Issues

- Background tracker requires actual GPS movement to save points
- Testing environment uses static coordinates (44.979970, -93.289326)
- No movement detected = no tracking data = "Loaded 0 tracking points"
- Stats show 0 because tracking points aren't being created

## Solution Required

Modify background tracking to be time-based rather than movement-based for proper continuous logging that matches your architectural vision.