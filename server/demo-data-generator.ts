import { storage } from "./storage";

export async function generateTimeTrackingDemo(sessionId: string) {
  console.log("Generating time tracking demo data for session:", sessionId);
  
  // Create a realistic location in Minneapolis (from the fallback coordinates)
  const coffeeShopLocation = await storage.createLocation({
    name: "Community Coffee Shop",
    latitude: 44.97996520,
    longitude: -92.9594,
    sessionId,
  });

  const libraryLocation = await storage.createLocation({
    name: "Public Library",
    latitude: 44.97896520, // Slightly different coordinates
    longitude: -92.9584,
    sessionId,
  });

  const parkLocation = await storage.createLocation({
    name: "Neighborhood Park",
    latitude: 44.98096520,
    longitude: -92.9574,
    sessionId,
  });

  // Generate tracking points over several days to show time accumulation
  const now = new Date();
  const trackingPoints = [];

  // Coffee shop visits - multiple sessions building up voting power
  for (let day = 0; day < 7; day++) {
    const dayOffset = day * 24 * 60 * 60 * 1000;
    
    // Morning coffee visit (30-45 minutes)
    const morningStart = new Date(now.getTime() - dayOffset - (8 * 60 * 60 * 1000));
    const morningDuration = 30 + Math.random() * 15; // 30-45 minutes
    
    for (let i = 0; i < morningDuration; i += 3) {
      trackingPoints.push({
        sessionId,
        latitude: coffeeShopLocation.latitude + (Math.random() - 0.5) * 0.0001, // Small GPS variation
        longitude: coffeeShopLocation.longitude + (Math.random() - 0.5) * 0.0001,
        timestamp: new Date(morningStart.getTime() + (i * 60 * 1000)),
        accuracy: 5 + Math.random() * 10,
      });
    }

    // Library visits - working sessions (1-3 hours)
    if (day % 2 === 0) { // Every other day
      const libraryStart = new Date(now.getTime() - dayOffset - (2 * 60 * 60 * 1000));
      const libraryDuration = 60 + Math.random() * 120; // 1-3 hours
      
      for (let i = 0; i < libraryDuration; i += 3) {
        trackingPoints.push({
          sessionId,
          latitude: libraryLocation.latitude + (Math.random() - 0.5) * 0.0001,
          longitude: libraryLocation.longitude + (Math.random() - 0.5) * 0.0001,
          timestamp: new Date(libraryStart.getTime() + (i * 60 * 1000)),
          accuracy: 5 + Math.random() * 10,
        });
      }
    }

    // Park visits - shorter recreation breaks (15-30 minutes)
    if (day % 3 === 0) { // Every third day
      const parkStart = new Date(now.getTime() - dayOffset - (6 * 60 * 60 * 1000));
      const parkDuration = 15 + Math.random() * 15; // 15-30 minutes
      
      for (let i = 0; i < parkDuration; i += 3) {
        trackingPoints.push({
          sessionId,
          latitude: parkLocation.latitude + (Math.random() - 0.5) * 0.0001,
          longitude: parkLocation.longitude + (Math.random() - 0.5) * 0.0001,
          timestamp: new Date(parkStart.getTime() + (i * 60 * 1000)),
          accuracy: 5 + Math.random() * 10,
        });
      }
    }
  }

  // Create all tracking points
  for (const point of trackingPoints) {
    await storage.createTrackingPoint(point);
  }

  console.log(`Generated ${trackingPoints.length} tracking points for demo`);
  
  return {
    locations: [coffeeShopLocation, libraryLocation, parkLocation],
    trackingPointsCount: trackingPoints.length,
    timeSpanDays: 7,
  };
}

export async function getDemoVotingEligibility(sessionId: string) {
  const { timeTrackingService } = await import("./time-tracking-service");
  
  try {
    const eligibleLocations = await timeTrackingService.getVotingEligibleLocations(sessionId);
    return eligibleLocations;
  } catch (error) {
    console.error("Error getting voting eligibility:", error);
    return [];
  }
}