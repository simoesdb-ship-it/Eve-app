// Demo Tracking Data Generator
// Generates sample tracking points to demonstrate the three-tier location architecture

import { storage } from "./storage-clean";
import type { InsertSpatialPoint, InsertLocation, InsertSavedLocation } from "@shared/schema";

export async function generateDemoTrackingData(sessionId: string) {
  console.log(`Generating demo tracking data for session: ${sessionId}`);

  // 1. Background Tracking Points - GPS breadcrumbs over time
  const trackingPoints: InsertSpatialPoint[] = [
    {
      latitude: "44.979970",
      longitude: "-93.289326", 
      type: "tracking",
      sessionId,
      metadata: JSON.stringify({ accuracy: 8, speed: 0 })
    },
    {
      latitude: "44.980120",
      longitude: "-93.289456",
      type: "tracking", 
      sessionId,
      metadata: JSON.stringify({ accuracy: 6, speed: 2.3 })
    },
    {
      latitude: "44.980345",
      longitude: "-93.289632",
      type: "tracking",
      sessionId,
      metadata: JSON.stringify({ accuracy: 5, speed: 1.8 })
    },
    {
      latitude: "44.980567",
      longitude: "-93.289834",
      type: "tracking",
      sessionId,
      metadata: JSON.stringify({ accuracy: 7, speed: 2.1 })
    },
    {
      latitude: "44.980789",
      longitude: "-93.290012",
      type: "tracking",
      sessionId,
      metadata: JSON.stringify({ accuracy: 4, speed: 1.5 })
    }
  ];

  // Create background tracking points
  for (const point of trackingPoints) {
    await storage.createTrackingPoint(point);
  }

  // 2. Real-time Location Analysis - Rich contextual data with pattern analysis  
  const analysisLocation: InsertLocation = {
    latitude: "44.980345",
    longitude: "-93.289632",
    name: "Downtown Analysis Point",
    sessionId
  };

  const location = await storage.createLocation(analysisLocation);

  // 3. User-Saved Location - Manually saved with rich metadata
  const savedLocation: InsertSavedLocation = {
    sessionId,
    latitude: "44.980567", 
    longitude: "-93.289834",
    name: "Interesting Street Corner",
    description: "Great example of Pattern 88 - Street Café potential",
    address: "Near Nicollet Mall, Minneapolis",
    elevation: "260.5",
    landUse: "mixed_commercial",
    urbanDensity: "medium_high",
    patternEvaluation: "Strong pedestrian flow with good sight lines"
  };

  await storage.createSavedLocation(savedLocation);

  console.log(`Created ${trackingPoints.length} tracking points, 1 analyzed location, and 1 saved location`);
  
  return {
    trackingPoints: trackingPoints.length,
    analyzedLocations: 1,
    savedLocations: 1
  };
}