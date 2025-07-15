import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowLeft, MapPin, Building, Users, Car, Trees, Wifi, Clock, CheckCircle, XCircle, AlertCircle, Save, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { generateSessionId } from "@/lib/geolocation";
import { getConsistentUserId } from "@/lib/device-fingerprint";
import MobileContainer from "@/components/mobile-container";

interface LocationData {
  coordinates: {
    latitude: number;
    longitude: number;
  };
  address: string;
  neighborhood: string;
  city: string;
  country: string;
  elevation: number;
  timezone: string;
}

interface ContextualData {
  // Basic characteristics
  landUse: string;
  urbanDensity: 'low' | 'medium' | 'high';
  walkabilityScore: number;
  publicTransportAccess: boolean;
  trafficLevel: 'low' | 'medium' | 'high';
  
  // Building analysis
  buildingCount: number;
  buildingTypes: string[];
  averageBuildingHeight: number | null;
  averageNumberOfStories: number | null;
  buildingHeightCategory: string;
  buildingsWithHeightData: number;
  buildingsWithLevelData: number;
  
  // Architectural details
  architecturalStyles: string[];
  buildingMaterials: string[];
  roofShapes: string[];
  
  // Land use breakdown
  residentialTypes: string[];
  commercialTypes: string[];
  
  // Infrastructure and amenities
  nearbyAmenities: string[];
  transportNodes: string[];
  naturalFeatures: string[];
  historicalFeatures: string[];
  
  // Environmental factors
  hasGreenSpace: boolean;
  hasWaterFeature: boolean;
  hasHistoricalSites: boolean;
  greenSpaceDistance: number;
  
  // Derived metrics
  populationDensity: number;
  noiseLevel: 'quiet' | 'moderate' | 'loud';
  
  // Alexander pattern adherence
  alexanderPatternIndicators: {
    fourStoryLimit: boolean | null;
    humanScale: boolean;
    mixedUse: boolean;
    pedestrianFriendly: boolean;
    greenSpaceAccess: boolean;
    publicTransportAccess: boolean;
    communitySpaces: boolean;
    architecturalDiversity: boolean;
  };
  
  // Summary metrics
  diversityScore: number;
  livabilityScore: number;
}

interface PatternCriteria {
  id: string;
  name: string;
  question: string;
  patternReferences: number[];
  evaluation: 'positive' | 'negative' | 'neutral' | null;
}

export default function LocationAnalysisPage() {
  const [location, navigate] = useLocation();
  const [coordinates, setCoordinates] = useState<{lat: number, lng: number} | null>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [locationName, setLocationName] = useState("");
  const [locationDescription, setLocationDescription] = useState("");
  const { toast } = useToast();
  const [persistentUserId, setPersistentUserId] = useState<string>('');
  const [openSections, setOpenSections] = useState<{[key: string]: boolean}>({
    geographic: true,
    contextual: false,
    patterns: false,
    evaluation: false
  });
  const [patternEvaluations, setPatternEvaluations] = useState<{[key: string]: 'positive' | 'negative' | 'neutral'}>({});

  // Load persistent user ID
  useEffect(() => {
    async function loadUserId() {
      try {
        const userId = await getConsistentUserId();
        setPersistentUserId(userId);
      } catch (error) {
        console.error('Failed to get user ID:', error);
        // Fallback to session-based ID
        setPersistentUserId(generateSessionId());
      }
    }
    loadUserId();
  }, []);

  // Parse coordinates from URL query params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const lat = urlParams.get('lat');
    const lng = urlParams.get('lng');
    
    if (lat && lng) {
      setCoordinates({
        lat: parseFloat(lat),
        lng: parseFloat(lng)
      });
    }
  }, [location]);

  // Fetch location data
  const { data: locationData, isLoading: locationLoading } = useQuery({
    queryKey: ['location-data', coordinates?.lat, coordinates?.lng],
    queryFn: async () => {
      if (!coordinates) return null;
      
      const response = await fetch(`/api/location-analysis?lat=${coordinates.lat}&lng=${coordinates.lng}`);
      if (!response.ok) throw new Error('Failed to fetch location data');
      const data = await response.json();
      return data as LocationData;
    },
    enabled: !!coordinates
  });

  // Fetch contextual analysis
  const { data: contextualData, isLoading: contextualLoading } = useQuery({
    queryKey: ['contextual-data', coordinates?.lat, coordinates?.lng],
    queryFn: async () => {
      if (!coordinates) return null;
      
      const response = await fetch(`/api/contextual-analysis?lat=${coordinates.lat}&lng=${coordinates.lng}`);
      if (!response.ok) throw new Error('Failed to fetch contextual data');
      const data = await response.json();
      return data as ContextualData;
    },
    enabled: !!coordinates
  });

  const patternCriteria: PatternCriteria[] = [
    {
      id: 'pedestrian_access',
      name: 'Pedestrian Accessibility',
      question: 'Is this location easily accessible on foot with safe walkways?',
      patternReferences: [52, 100],
      evaluation: null
    },
    {
      id: 'public_space',
      name: 'Public Space Quality',
      question: 'Does this location provide meaningful public gathering spaces?',
      patternReferences: [61, 106],
      evaluation: null
    },
    {
      id: 'social_activity',
      name: 'Social Activity Potential',
      question: 'Can this location support cafés, street life, and social interaction?',
      patternReferences: [88],
      evaluation: null
    },
    {
      id: 'mixed_use',
      name: 'Mixed Use Integration',
      question: 'Does this location blend residential, commercial, and public uses effectively?',
      patternReferences: [52, 88],
      evaluation: null
    },
    {
      id: 'human_scale',
      name: 'Human Scale Design',
      question: 'Are buildings and spaces designed at a comfortable human scale?',
      patternReferences: [61, 106],
      evaluation: null
    },
    {
      id: 'natural_integration',
      name: 'Natural Elements',
      question: 'Does this location integrate natural elements and green spaces?',
      patternReferences: [106],
      evaluation: null
    }
  ];

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Save location mutation
  const saveLocationMutation = useMutation({
    mutationFn: async (saveData: any) => {
      const response = await apiRequest('POST', '/api/saved-locations', saveData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Location Saved",
        description: "This location has been saved to your collection",
      });
      setSaveDialogOpen(false);
      setLocationName("");
      setLocationDescription("");
      // Invalidate all saved-locations queries including those with persistentUserId
      queryClient.invalidateQueries({ 
        queryKey: ['/api/saved-locations'],
        exact: false // This will invalidate all queries that start with this key
      });
    },
    onError: () => {
      toast({
        title: "Save Failed",
        description: "Unable to save location. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleSaveLocation = () => {
    if (!coordinates || !locationData || !persistentUserId) return;
    
    const saveData = {
      sessionId: persistentUserId,
      latitude: coordinates.lat.toString(),
      longitude: coordinates.lng.toString(),
      name: locationName || `Location at ${coordinates.lat.toFixed(4)}, ${coordinates.lng.toFixed(4)}`,
      description: locationDescription,
      address: locationData.address || "",
      elevation: locationData.elevation?.toString() || null,
      landUse: contextualData?.landUse || null,
      urbanDensity: contextualData?.urbanDensity || null,
      patternEvaluation: JSON.stringify(patternCriteria.map(c => ({
        id: c.id,
        name: c.name,
        evaluation: c.evaluation
      })))
    };
    
    saveLocationMutation.mutate(saveData);
  };

  const updatePatternEvaluation = (criteriaId: string, evaluation: 'positive' | 'negative' | 'neutral') => {
    setPatternEvaluations(prev => ({
      ...prev,
      [criteriaId]: evaluation
    }));
  };

  const getEvaluationIcon = (evaluation: 'positive' | 'negative' | 'neutral' | null) => {
    switch (evaluation) {
      case 'positive': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'negative': return <XCircle className="w-5 h-5 text-red-600" />;
      case 'neutral': return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      default: return <div className="w-5 h-5 border-2 border-gray-300 rounded-full" />;
    }
  };

  if (!coordinates) {
    return (
      <MobileContainer>
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">No location coordinates provided</p>
        </div>
      </MobileContainer>
    );
  }

  return (
    <MobileContainer>
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 z-10">
        <div className="flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate('/')}
            className="p-2"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold">Location Analysis</h1>
          <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="p-2">
                <Heart className="w-5 h-5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Save Location</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <label htmlFor="name" className="text-sm font-medium">
                    Location Name
                  </label>
                  <Input
                    id="name"
                    value={locationName}
                    onChange={(e) => setLocationName(e.target.value)}
                    placeholder="Enter a name for this location"
                  />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="description" className="text-sm font-medium">
                    Description (Optional)
                  </label>
                  <Textarea
                    id="description"
                    value={locationDescription}
                    onChange={(e) => setLocationDescription(e.target.value)}
                    placeholder="Add notes about this location"
                    rows={3}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveLocation}
                  disabled={saveLocationMutation.isPending}
                >
                  {saveLocationMutation.isPending ? "Saving..." : "Save Location"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Coordinates Header */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <MapPin className="w-6 h-6 text-blue-600" />
              <div>
                <h2 className="font-semibold">Current Location</h2>
                <p className="text-sm text-gray-600">
                  {coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Geographic Information */}
        <Card>
          <Collapsible open={openSections.geographic} onOpenChange={() => toggleSection('geographic')}>
            <CollapsibleTrigger className="w-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building className="w-5 h-5" />
                  Geographic Information
                </CardTitle>
                <Button variant="ghost" size="sm">
                  {openSections.geographic ? '−' : '+'}
                </Button>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                {locationLoading ? (
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded animate-pulse" />
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2" />
                  </div>
                ) : locationData ? (
                  <div className="space-y-3">
                    <div>
                      <span className="font-medium">Address:</span>
                      <p className="text-sm text-gray-600">{locationData.address}</p>
                    </div>
                    <div>
                      <span className="font-medium">Area:</span>
                      <p className="text-sm text-gray-600">{locationData.neighborhood}, {locationData.city}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Elevation:</span>
                        <p className="text-gray-600">{locationData.elevation}m</p>
                      </div>
                      <div>
                        <span className="font-medium">Timezone:</span>
                        <p className="text-gray-600">{locationData.timezone}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500">Unable to load geographic data</p>
                )}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* Contextual Analysis */}
        <Card>
          <Collapsible open={openSections.contextual} onOpenChange={() => toggleSection('contextual')}>
            <CollapsibleTrigger className="w-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Contextual Analysis
                </CardTitle>
                <Button variant="ghost" size="sm">
                  {openSections.contextual ? '−' : '+'}
                </Button>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                {contextualLoading ? (
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded animate-pulse" />
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2" />
                  </div>
                ) : contextualData ? (
                  <div className="space-y-6">
                    {/* Basic Urban Characteristics */}
                    <div>
                      <h3 className="font-medium text-sm mb-3 text-gray-800">Basic Characteristics</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="font-medium">Land Use:</span>
                          <p className="text-sm text-gray-600">{contextualData.landUse}</p>
                        </div>
                        <div>
                          <span className="font-medium">Urban Density:</span>
                          <Badge variant={contextualData.urbanDensity === 'high' ? 'destructive' : 'secondary'}>
                            {contextualData.urbanDensity}
                          </Badge>
                        </div>
                        <div>
                          <span className="font-medium">Walkability:</span>
                          <p className="text-sm text-gray-600">{contextualData.walkabilityScore}/100</p>
                        </div>
                        <div>
                          <span className="font-medium">Traffic Level:</span>
                          <Badge variant={contextualData.trafficLevel === 'high' ? 'destructive' : 'outline'}>
                            {contextualData.trafficLevel}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Building Analysis */}
                    <div>
                      <h3 className="font-medium text-sm mb-3 text-gray-800">Building Analysis</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="font-medium">Building Count:</span>
                          <p className="text-sm text-gray-600">{contextualData.buildingCount}</p>
                        </div>
                        <div>
                          <span className="font-medium">Height Category:</span>
                          <p className="text-sm text-gray-600">{contextualData.buildingHeightCategory}</p>
                        </div>
                        {contextualData.averageNumberOfStories && (
                          <div>
                            <span className="font-medium">Average Stories:</span>
                            <p className="text-sm text-gray-600">{contextualData.averageNumberOfStories} floors</p>
                          </div>
                        )}
                        {contextualData.averageBuildingHeight && (
                          <div>
                            <span className="font-medium">Average Height:</span>
                            <p className="text-sm text-gray-600">{contextualData.averageBuildingHeight}m</p>
                          </div>
                        )}
                      </div>
                      {contextualData.buildingTypes.length > 0 && (
                        <div className="mt-3">
                          <span className="font-medium">Building Types:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {contextualData.buildingTypes.map((type, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {type}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Architectural Details */}
                    {(contextualData.architecturalStyles.length > 0 || contextualData.buildingMaterials.length > 0) && (
                      <div>
                        <h3 className="font-medium text-sm mb-3 text-gray-800">Architectural Details</h3>
                        <div className="space-y-3">
                          {contextualData.architecturalStyles.length > 0 && (
                            <div>
                              <span className="font-medium">Architectural Styles:</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {contextualData.architecturalStyles.map((style, index) => (
                                  <Badge key={index} variant="outline" className="text-xs">
                                    {style}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          {contextualData.buildingMaterials.length > 0 && (
                            <div>
                              <span className="font-medium">Building Materials:</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {contextualData.buildingMaterials.map((material, index) => (
                                  <Badge key={index} variant="outline" className="text-xs">
                                    {material}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Land Use Breakdown */}
                    {(contextualData.residentialTypes.length > 0 || contextualData.commercialTypes.length > 0) && (
                      <div>
                        <h3 className="font-medium text-sm mb-3 text-gray-800">Land Use Breakdown</h3>
                        <div className="space-y-3">
                          {contextualData.residentialTypes.length > 0 && (
                            <div>
                              <span className="font-medium">Residential Types:</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {contextualData.residentialTypes.map((type, index) => (
                                  <Badge key={index} variant="outline" className="text-xs">
                                    {type}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          {contextualData.commercialTypes.length > 0 && (
                            <div>
                              <span className="font-medium">Commercial Types:</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {contextualData.commercialTypes.map((type, index) => (
                                  <Badge key={index} variant="outline" className="text-xs">
                                    {type}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Infrastructure & Amenities */}
                    <div>
                      <h3 className="font-medium text-sm mb-3 text-gray-800">Infrastructure & Amenities</h3>
                      <div className="space-y-3">
                        <div>
                          <span className="font-medium">Public Transport:</span>
                          <p className="text-sm text-gray-600">
                            {contextualData.publicTransportAccess ? 'Available' : 'Limited'}
                          </p>
                        </div>
                        {contextualData.nearbyAmenities.length > 0 && (
                          <div>
                            <span className="font-medium">Nearby Amenities:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {contextualData.nearbyAmenities.map((amenity, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {amenity}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {contextualData.transportNodes.length > 0 && (
                          <div>
                            <span className="font-medium">Transport Infrastructure:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {contextualData.transportNodes.map((node, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {node}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Environmental Features */}
                    <div>
                      <h3 className="font-medium text-sm mb-3 text-gray-800">Environmental Features</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="font-medium">Green Space:</span>
                          <p className="text-sm text-gray-600">
                            {contextualData.hasGreenSpace ? 'Available' : 'Limited'}
                          </p>
                        </div>
                        <div>
                          <span className="font-medium">Water Features:</span>
                          <p className="text-sm text-gray-600">
                            {contextualData.hasWaterFeature ? 'Present' : 'None'}
                          </p>
                        </div>
                        <div>
                          <span className="font-medium">Noise Level:</span>
                          <Badge variant={contextualData.noiseLevel === 'loud' ? 'destructive' : 'outline'}>
                            {contextualData.noiseLevel}
                          </Badge>
                        </div>
                        <div>
                          <span className="font-medium">Historical Sites:</span>
                          <p className="text-sm text-gray-600">
                            {contextualData.hasHistoricalSites ? 'Present' : 'None'}
                          </p>
                        </div>
                      </div>
                      {contextualData.naturalFeatures.length > 0 && (
                        <div className="mt-3">
                          <span className="font-medium">Natural Features:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {contextualData.naturalFeatures.map((feature, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {feature}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Alexander Pattern Analysis */}
                    <div>
                      <h3 className="font-medium text-sm mb-3 text-gray-800">Alexander Pattern Analysis</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="font-medium">Diversity Score:</span>
                          <p className="text-sm text-gray-600">{contextualData.diversityScore}/100</p>
                        </div>
                        <div>
                          <span className="font-medium">Livability Score:</span>
                          <p className="text-sm text-gray-600">{contextualData.livabilityScore}/100</p>
                        </div>
                      </div>
                      <div className="mt-3">
                        <span className="font-medium">Pattern Adherence:</span>
                        <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                          <div className="flex items-center gap-2">
                            {contextualData.alexanderPatternIndicators.fourStoryLimit === null ? (
                              <AlertCircle className="w-4 h-4 text-gray-400" />
                            ) : contextualData.alexanderPatternIndicators.fourStoryLimit ? (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-600" />
                            )}
                            <span>Four-Story Limit</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {contextualData.alexanderPatternIndicators.humanScale ? (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-600" />
                            )}
                            <span>Human Scale</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {contextualData.alexanderPatternIndicators.mixedUse ? (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-600" />
                            )}
                            <span>Mixed Use</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {contextualData.alexanderPatternIndicators.pedestrianFriendly ? (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-600" />
                            )}
                            <span>Pedestrian Friendly</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500">Unable to load contextual data</p>
                )}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* Pattern Language Evaluation */}
        <Card>
          <Collapsible open={openSections.patterns} onOpenChange={() => toggleSection('patterns')}>
            <CollapsibleTrigger className="w-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Trees className="w-5 h-5" />
                  Pattern Language Criteria
                </CardTitle>
                <Button variant="ghost" size="sm">
                  {openSections.patterns ? '−' : '+'}
                </Button>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <div className="space-y-4">
                  {patternCriteria.map((criteria, index) => (
                    <div key={criteria.id} className="border-b border-gray-100 pb-4 last:border-b-0">
                      <div className="flex items-start gap-3">
                        {getEvaluationIcon(patternEvaluations[criteria.id] || null)}
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">{criteria.name}</h4>
                          <p className="text-xs text-gray-600 mt-1">{criteria.question}</p>
                          <div className="flex items-center gap-1 mt-2">
                            <span className="text-xs text-gray-500">Patterns:</span>
                            {criteria.patternReferences.map(ref => (
                              <Badge key={ref} variant="outline" className="text-xs">
                                #{ref}
                              </Badge>
                            ))}
                          </div>
                          <div className="flex gap-2 mt-3">
                            <Button
                              size="sm"
                              variant={patternEvaluations[criteria.id] === 'positive' ? 'default' : 'outline'}
                              onClick={() => updatePatternEvaluation(criteria.id, 'positive')}
                              className="text-xs h-7"
                            >
                              Good
                            </Button>
                            <Button
                              size="sm"
                              variant={patternEvaluations[criteria.id] === 'neutral' ? 'default' : 'outline'}
                              onClick={() => updatePatternEvaluation(criteria.id, 'neutral')}
                              className="text-xs h-7"
                            >
                              Neutral
                            </Button>
                            <Button
                              size="sm"
                              variant={patternEvaluations[criteria.id] === 'negative' ? 'destructive' : 'outline'}
                              onClick={() => updatePatternEvaluation(criteria.id, 'negative')}
                              className="text-xs h-7"
                            >
                              Poor
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* Overall Evaluation Summary */}
        <Card>
          <Collapsible open={openSections.evaluation} onOpenChange={() => toggleSection('evaluation')}>
            <CollapsibleTrigger className="w-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Evaluation Summary
                </CardTitle>
                <Button variant="ghost" size="sm">
                  {openSections.evaluation ? '−' : '+'}
                </Button>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-lg font-semibold text-green-600">
                        {Object.values(patternEvaluations).filter(e => e === 'positive').length}
                      </div>
                      <div className="text-xs text-gray-600">Positive</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-yellow-600">
                        {Object.values(patternEvaluations).filter(e => e === 'neutral').length}
                      </div>
                      <div className="text-xs text-gray-600">Neutral</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-red-600">
                        {Object.values(patternEvaluations).filter(e => e === 'negative').length}
                      </div>
                      <div className="text-xs text-gray-600">Poor</div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h4 className="font-medium text-sm mb-2">Recommendations:</h4>
                    <div className="text-xs text-gray-600 space-y-1">
                      {Object.values(patternEvaluations).filter(e => e === 'positive').length >= 4 && (
                        <p>• This location shows strong alignment with Pattern Language principles</p>
                      )}
                      {Object.values(patternEvaluations).filter(e => e === 'negative').length >= 3 && (
                        <p>• Consider improvements to pedestrian access and public space quality</p>
                      )}
                      {Object.keys(patternEvaluations).length < 3 && (
                        <p>• Complete the evaluation to see detailed recommendations</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      </div>
    </MobileContainer>
  );
}