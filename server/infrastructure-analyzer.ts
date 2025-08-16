import type { SavedLocation } from '@shared/schema';

export interface InfrastructureNode {
  id: string;
  type: 'transit_hub' | 'bus_stop' | 'rail_station' | 'parking' | 'bike_share' | 'commercial_center' | 'residential_cluster';
  name: string;
  coordinates: { lat: number; lng: number };
  capacity?: number;
  operatingHours?: string;
  connectivity: string[]; // Connected infrastructure IDs
  accessibility: 'high' | 'medium' | 'low';
  currentUtilization: number; // 0-1 scale
}

export interface ImplementationAction {
  id: string;
  description: string;
  actionType: 'infrastructure' | 'policy' | 'community' | 'funding' | 'technical';
  stakeholders: string[];
  timeframe: 'immediate' | 'short_term' | 'medium_term' | 'long_term';
  resources: {
    funding: 'low' | 'medium' | 'high';
    permits: boolean;
    community_support: boolean;
    technical_expertise: boolean;
  };
  dependencies: string[]; // Other action IDs this depends on
  successMetrics: string[];
}

export interface PatternImplementationRoadmap {
  patternNumber: number;
  patternName: string;
  locationContext: string;
  infrastructureAnalysis: {
    existingAssets: InfrastructureNode[];
    gaps: string[];
    opportunities: string[];
    criticalConnections: { from: string; to: string; benefit: string }[];
  };
  actionSequence: ImplementationAction[];
  timelineEstimate: string;
  communityBenefits: string[];
  feasibilityScore: number; // 0-1 scale
}

/**
 * Infrastructure Analyzer - Maps existing infrastructure and creates actionable
 * implementation roadmaps for Christopher Alexander patterns
 */
export class InfrastructureAnalyzer {
  
  /**
   * Analyzes existing infrastructure around a location for pattern implementation
   */
  async analyzeInfrastructure(location: SavedLocation): Promise<InfrastructureNode[]> {
    const lat = parseFloat(location.latitude);
    const lng = parseFloat(location.longitude);
    
    // Simulate infrastructure analysis based on Minnesota urban characteristics
    const infrastructure: InfrastructureNode[] = [];
    
    // Identify likely infrastructure based on coordinates and urban density
    if (this.isUrbanArea(lat, lng)) {
      // Urban transit infrastructure
      infrastructure.push({
        id: `transit_hub_${lat}_${lng}`,
        type: 'transit_hub',
        name: 'Downtown Transit Center',
        coordinates: { lat: lat + 0.005, lng: lng + 0.005 },
        capacity: 2000,
        operatingHours: '5:00 AM - 12:00 AM',
        connectivity: ['bus_route_1', 'light_rail_green', 'bike_share_station'],
        accessibility: 'high',
        currentUtilization: 0.7
      });
      
      infrastructure.push({
        id: `bus_stop_${lat}_${lng}_1`,
        type: 'bus_stop',
        name: 'Main Street Bus Stop',
        coordinates: { lat: lat + 0.002, lng: lng - 0.003 },
        operatingHours: '6:00 AM - 10:00 PM',
        connectivity: ['bus_route_7', 'bus_route_21'],
        accessibility: 'medium',
        currentUtilization: 0.4
      });
      
      infrastructure.push({
        id: `commercial_center_${lat}_${lng}`,
        type: 'commercial_center',
        name: 'Shopping District',
        coordinates: { lat: lat - 0.003, lng: lng + 0.002 },
        connectivity: ['parking_structure', 'pedestrian_plaza'],
        accessibility: 'high',
        currentUtilization: 0.6
      });
    }
    
    // Suburban infrastructure
    if (this.isSuburbanArea(lat, lng)) {
      infrastructure.push({
        id: `park_ride_${lat}_${lng}`,
        type: 'parking',
        name: 'Park & Ride Facility',
        coordinates: { lat: lat + 0.008, lng: lng - 0.012 },
        capacity: 500,
        operatingHours: '24/7',
        connectivity: ['express_bus_route'],
        accessibility: 'medium',
        currentUtilization: 0.8
      });
      
      infrastructure.push({
        id: `residential_cluster_${lat}_${lng}`,
        type: 'residential_cluster',
        name: 'Suburban Neighborhood',
        coordinates: { lat, lng },
        connectivity: ['local_bus_route'],
        accessibility: 'low',
        currentUtilization: 0.3
      });
    }
    
    return infrastructure;
  }
  
  /**
   * Creates actionable implementation roadmap for Mini-Buses pattern (#20)
   */
  async createMiniBusImplementationRoadmap(
    location: SavedLocation, 
    infrastructure: InfrastructureNode[]
  ): Promise<PatternImplementationRoadmap> {
    const transitHubs = infrastructure.filter(node => 
      node.type === 'transit_hub' || node.type === 'rail_station'
    );
    const commercialCenters = infrastructure.filter(node => 
      node.type === 'commercial_center'
    );
    const residentialAreas = infrastructure.filter(node => 
      node.type === 'residential_cluster'
    );
    
    // Identify critical connections
    const criticalConnections = [];
    for (const hub of transitHubs) {
      for (const residential of residentialAreas) {
        const distance = this.calculateDistance(hub.coordinates, residential.coordinates);
        if (distance > 0.5 && distance < 3) { // 0.5-3 mile gap suitable for mini-buses
          criticalConnections.push({
            from: hub.id,
            to: residential.id,
            benefit: `Connect ${residential.name} to ${hub.name}, serving ${Math.round(distance * 1000)} residents`
          });
        }
      }
    }
    
    // Create action sequence
    const actions: ImplementationAction[] = [
      {
        id: 'community_needs_assessment',
        description: 'Conduct community survey to identify transportation gaps and mini-bus route preferences',
        actionType: 'community',
        stakeholders: ['Residents', 'Community Organizations', 'Transportation Planning'],
        timeframe: 'immediate',
        resources: {
          funding: 'low',
          permits: false,
          community_support: true,
          technical_expertise: false
        },
        dependencies: [],
        successMetrics: ['Survey response rate >40%', 'Identified top 3 priority routes']
      },
      {
        id: 'route_optimization',
        description: 'Design mini-bus routes connecting identified gaps using existing infrastructure',
        actionType: 'technical',
        stakeholders: ['Transportation Engineers', 'Urban Planners', 'GIS Specialists'],
        timeframe: 'short_term',
        resources: {
          funding: 'medium',
          permits: false,
          community_support: true,
          technical_expertise: true
        },
        dependencies: ['community_needs_assessment'],
        successMetrics: ['Routes cover 80% of identified gaps', 'Maximum 15-minute headways']
      },
      {
        id: 'pilot_program_approval',
        description: 'Secure permits and regulatory approval for 6-month pilot mini-bus program',
        actionType: 'policy',
        stakeholders: ['City Council', 'Transportation Authority', 'State DOT'],
        timeframe: 'short_term',
        resources: {
          funding: 'medium',
          permits: true,
          community_support: true,
          technical_expertise: true
        },
        dependencies: ['route_optimization'],
        successMetrics: ['All permits approved', 'Insurance coverage secured']
      },
      {
        id: 'fleet_procurement',
        description: 'Purchase or lease 3-5 mini-buses with accessibility features',
        actionType: 'infrastructure',
        stakeholders: ['Transportation Authority', 'Fleet Management', 'Accessibility Board'],
        timeframe: 'medium_term',
        resources: {
          funding: 'high',
          permits: true,
          community_support: true,
          technical_expertise: true
        },
        dependencies: ['pilot_program_approval'],
        successMetrics: ['Fleet operational', 'All vehicles ADA compliant']
      },
      {
        id: 'smart_stops_installation',
        description: 'Install smart bus stops with real-time arrival information at key connection points',
        actionType: 'infrastructure',
        stakeholders: ['Technology Vendors', 'Public Works', 'Telecommunications'],
        timeframe: 'medium_term',
        resources: {
          funding: 'medium',
          permits: true,
          community_support: true,
          technical_expertise: true
        },
        dependencies: ['fleet_procurement'],
        successMetrics: ['Real-time data 95% accurate', 'Mobile app integration']
      },
      {
        id: 'service_launch',
        description: 'Launch mini-bus service with community celebration and ridership promotion',
        actionType: 'community',
        stakeholders: ['Community Leaders', 'Media', 'Transportation Authority'],
        timeframe: 'medium_term',
        resources: {
          funding: 'low',
          permits: false,
          community_support: true,
          technical_expertise: false
        },
        dependencies: ['smart_stops_installation'],
        successMetrics: ['500+ riders in first month', 'Positive media coverage']
      }
    ];
    
    return {
      patternNumber: 20,
      patternName: 'Mini-Buses',
      locationContext: `${location.name} (${location.latitude}, ${location.longitude})`,
      infrastructureAnalysis: {
        existingAssets: infrastructure,
        gaps: [
          'Last-mile connections between transit hubs and residential areas',
          'Limited weekend/evening service coverage',
          'Accessibility gaps for elderly and disabled residents'
        ],
        opportunities: [
          'Existing transit hubs provide anchor points for mini-bus routes',
          'High-density residential areas create ridership demand',
          'Commercial centers offer destination clustering'
        ],
        criticalConnections
      },
      actionSequence: actions,
      timelineEstimate: '12-18 months from community assessment to full service',
      communityBenefits: [
        'Improved access to employment opportunities',
        'Reduced car dependency and parking demand',
        'Enhanced mobility for non-drivers',
        'Strengthened community connections',
        'Reduced traffic congestion on main corridors'
      ],
      feasibilityScore: this.calculateFeasibilityScore(infrastructure, actions)
    };
  }
  
  /**
   * Creates implementation roadmap for any Christopher Alexander pattern
   */
  async createPatternImplementationRoadmap(
    patternNumber: number,
    location: SavedLocation,
    infrastructure: InfrastructureNode[]
  ): Promise<PatternImplementationRoadmap> {
    
    // Route to specific pattern implementations
    switch (patternNumber) {
      case 20: // Mini-Buses
        return this.createMiniBusImplementationRoadmap(location, infrastructure);
      
      case 30: // Activity Node
        return this.createActivityNodeRoadmap(location, infrastructure);
        
      case 31: // Promenade
        return this.createPromenadeRoadmap(location, infrastructure);
        
      case 88: // Street Cafe
        return this.createStreetCafeRoadmap(location, infrastructure);
        
      default:
        return this.createGenericImplementationRoadmap(patternNumber, location, infrastructure);
    }
  }
  
  private async createActivityNodeRoadmap(
    location: SavedLocation,
    infrastructure: InfrastructureNode[]
  ): Promise<PatternImplementationRoadmap> {
    const actions: ImplementationAction[] = [
      {
        id: 'site_analysis',
        description: 'Analyze foot traffic patterns and identify optimal activity node placement',
        actionType: 'technical',
        stakeholders: ['Urban Planners', 'Traffic Engineers', 'Community Groups'],
        timeframe: 'immediate',
        resources: { funding: 'low', permits: false, community_support: true, technical_expertise: true },
        dependencies: [],
        successMetrics: ['Peak hour pedestrian counts', 'Optimal placement identified']
      },
      {
        id: 'community_programming',
        description: 'Organize regular community events and activities at the proposed node',
        actionType: 'community',
        stakeholders: ['Community Organizations', 'Local Businesses', 'Event Coordinators'],
        timeframe: 'short_term',
        resources: { funding: 'low', permits: false, community_support: true, technical_expertise: false },
        dependencies: ['site_analysis'],
        successMetrics: ['Weekly events established', 'Community participation >50 people/event']
      }
    ];
    
    return {
      patternNumber: 30,
      patternName: 'Activity Node',
      locationContext: `${location.name}`,
      infrastructureAnalysis: {
        existingAssets: infrastructure.filter(node => 
          node.type === 'commercial_center' || node.type === 'transit_hub'
        ),
        gaps: ['Lack of central gathering space', 'Limited programming for community events'],
        opportunities: ['Existing foot traffic', 'Nearby commercial activity'],
        criticalConnections: []
      },
      actionSequence: actions,
      timelineEstimate: '3-6 months',
      communityBenefits: ['Enhanced social interaction', 'Increased local business activity'],
      feasibilityScore: 0.8
    };
  }
  
  private async createPromenadeRoadmap(
    location: SavedLocation,
    infrastructure: InfrastructureNode[]
  ): Promise<PatternImplementationRoadmap> {
    const actions: ImplementationAction[] = [
      {
        id: 'walkway_design',
        description: 'Design pedestrian promenade connecting key destinations',
        actionType: 'technical',
        stakeholders: ['Landscape Architects', 'Urban Planners', 'Public Works'],
        timeframe: 'short_term',
        resources: { funding: 'medium', permits: true, community_support: true, technical_expertise: true },
        dependencies: [],
        successMetrics: ['Design approval', 'ADA compliance verified']
      }
    ];
    
    return {
      patternNumber: 31,
      patternName: 'Promenade',
      locationContext: `${location.name}`,
      infrastructureAnalysis: {
        existingAssets: infrastructure,
        gaps: ['Disconnected pedestrian pathways'],
        opportunities: ['Existing destinations to connect'],
        criticalConnections: []
      },
      actionSequence: actions,
      timelineEstimate: '6-12 months',
      communityBenefits: ['Improved walkability', 'Enhanced community connection'],
      feasibilityScore: 0.7
    };
  }
  
  private async createStreetCafeRoadmap(
    location: SavedLocation,
    infrastructure: InfrastructureNode[]
  ): Promise<PatternImplementationRoadmap> {
    const actions: ImplementationAction[] = [
      {
        id: 'sidewalk_cafe_permits',
        description: 'Secure permits for outdoor dining and street cafe operations',
        actionType: 'policy',
        stakeholders: ['Restaurant Owners', 'City Planning', 'Health Department'],
        timeframe: 'short_term',
        resources: { funding: 'low', permits: true, community_support: true, technical_expertise: false },
        dependencies: [],
        successMetrics: ['Permits approved', 'Safety requirements met']
      }
    ];
    
    return {
      patternNumber: 88,
      patternName: 'Street Cafe',
      locationContext: `${location.name}`,
      infrastructureAnalysis: {
        existingAssets: infrastructure.filter(node => node.type === 'commercial_center'),
        gaps: ['Limited outdoor dining options'],
        opportunities: ['Existing restaurants', 'Foot traffic'],
        criticalConnections: []
      },
      actionSequence: actions,
      timelineEstimate: '2-4 months',
      communityBenefits: ['Vibrant street life', 'Economic development'],
      feasibilityScore: 0.9
    };
  }
  
  private async createGenericImplementationRoadmap(
    patternNumber: number,
    location: SavedLocation,
    infrastructure: InfrastructureNode[]
  ): Promise<PatternImplementationRoadmap> {
    // Generic implementation template
    const actions: ImplementationAction[] = [
      {
        id: 'feasibility_study',
        description: `Conduct feasibility study for implementing pattern ${patternNumber}`,
        actionType: 'technical',
        stakeholders: ['Urban Planners', 'Community Representatives'],
        timeframe: 'short_term',
        resources: { funding: 'medium', permits: false, community_support: true, technical_expertise: true },
        dependencies: [],
        successMetrics: ['Study completed', 'Implementation plan approved']
      }
    ];
    
    return {
      patternNumber,
      patternName: `Pattern ${patternNumber}`,
      locationContext: `${location.name}`,
      infrastructureAnalysis: {
        existingAssets: infrastructure,
        gaps: ['Requires detailed analysis'],
        opportunities: ['Community-driven implementation'],
        criticalConnections: []
      },
      actionSequence: actions,
      timelineEstimate: '6-12 months',
      communityBenefits: ['Improved urban environment'],
      feasibilityScore: 0.6
    };
  }
  
  private isUrbanArea(lat: number, lng: number): boolean {
    // Minneapolis-St. Paul urban core approximation
    return (lat >= 44.85 && lat <= 45.05) && (lng >= -93.35 && lng <= -93.1);
  }
  
  private isSuburbanArea(lat: number, lng: number): boolean {
    // Suburban ring around Twin Cities
    return (lat >= 44.7 && lat <= 45.2) && (lng >= -93.5 && lng <= -92.8) && 
           !this.isUrbanArea(lat, lng);
  }
  
  private calculateDistance(coord1: { lat: number; lng: number }, coord2: { lat: number; lng: number }): number {
    // Simple distance calculation in miles
    const latDiff = coord1.lat - coord2.lat;
    const lngDiff = coord1.lng - coord2.lng;
    return Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 69; // Rough miles conversion
  }
  
  private calculateFeasibilityScore(infrastructure: InfrastructureNode[], actions: ImplementationAction[]): number {
    let score = 0.5; // Base feasibility
    
    // Infrastructure readiness
    const highAccessibilityNodes = infrastructure.filter(node => node.accessibility === 'high').length;
    score += (highAccessibilityNodes / infrastructure.length) * 0.3;
    
    // Action complexity
    const immediateActions = actions.filter(action => action.timeframe === 'immediate').length;
    score += (immediateActions / actions.length) * 0.2;
    
    return Math.min(1, Math.max(0, score));
  }
}

export const infrastructureAnalyzer = new InfrastructureAnalyzer();