import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import MapView, { Marker, Circle } from 'react-native-maps';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useLocationTracking } from '../services/LocationTrackingService';
import { useAuth } from '../services/AuthService';
import { apiService, type Location, type Pattern } from '../services/ApiService';

const DiscoverScreen: React.FC = () => {
  const { user } = useAuth();
  const { currentLocation, isTracking, startTracking, stopTracking, requestLocationPermission } = useLocationTracking();
  const [nearbyLocations, setNearbyLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadNearbyLocations = async () => {
    if (!currentLocation) return;
    
    try {
      setLoading(true);
      const locations = await apiService.getNearbyLocations(
        currentLocation.latitude,
        currentLocation.longitude
      );
      setNearbyLocations(locations);
    } catch (error) {
      console.error('Error loading nearby locations:', error);
      Alert.alert('Error', 'Failed to load nearby locations');
    } finally {
      setLoading(false);
    }
  };

  const loadPatterns = async (locationId: number) => {
    try {
      const locationPatterns = await apiService.getLocationPatterns(locationId);
      const suggestions = await apiService.getPatternSuggestions(locationId);
      setPatterns([...locationPatterns, ...suggestions]);
    } catch (error) {
      console.error('Error loading patterns:', error);
    }
  };

  const handleLocationPress = (location: Location) => {
    setSelectedLocation(location);
    loadPatterns(location.id);
  };

  const handleStartTracking = async () => {
    const hasPermission = await requestLocationPermission();
    if (hasPermission) {
      await startTracking();
    } else {
      Alert.alert(
        'Location Permission Required',
        'Please enable location access to discover patterns near you.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleCreateLocation = async () => {
    if (!currentLocation || !user) return;

    try {
      const newLocation = await apiService.createLocation({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        name: 'Current Location',
        sessionId: user.sessionId,
      });
      
      setNearbyLocations(prev => [...prev, newLocation]);
      Alert.alert('Success', 'Location saved successfully!');
    } catch (error) {
      console.error('Error creating location:', error);
      Alert.alert('Error', 'Failed to save location');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNearbyLocations();
    setRefreshing(false);
  };

  useEffect(() => {
    if (currentLocation) {
      loadNearbyLocations();
    }
  }, [currentLocation]);

  const mapRegion = currentLocation ? {
    latitude: currentLocation.latitude,
    longitude: currentLocation.longitude,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  } : undefined;

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Location Status */}
      <View style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <Icon name="location-on" size={24} color="#2563eb" />
          <Text style={styles.statusTitle}>Location Tracking</Text>
        </View>
        
        {currentLocation ? (
          <View>
            <Text style={styles.locationText}>
              {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
            </Text>
            <Text style={styles.accuracyText}>
              Accuracy: {currentLocation.accuracy.toFixed(1)}m
            </Text>
          </View>
        ) : (
          <Text style={styles.noLocationText}>No location available</Text>
        )}

        <View style={styles.buttonRow}>
          {!isTracking ? (
            <TouchableOpacity style={styles.primaryButton} onPress={handleStartTracking}>
              <Icon name="play-arrow" size={20} color="white" />
              <Text style={styles.buttonText}>Start Tracking</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.secondaryButton} onPress={stopTracking}>
              <Icon name="stop" size={20} color="#2563eb" />
              <Text style={styles.secondaryButtonText}>Stop Tracking</Text>
            </TouchableOpacity>
          )}
          
          {currentLocation && (
            <TouchableOpacity style={styles.primaryButton} onPress={handleCreateLocation}>
              <Icon name="add-location" size={20} color="white" />
              <Text style={styles.buttonText}>Save Location</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Map View */}
      {mapRegion && (
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            region={mapRegion}
            showsUserLocation={true}
            showsMyLocationButton={true}
          >
            {currentLocation && (
              <Circle
                center={{
                  latitude: currentLocation.latitude,
                  longitude: currentLocation.longitude,
                }}
                radius={100}
                strokeColor="rgba(37, 99, 235, 0.5)"
                fillColor="rgba(37, 99, 235, 0.1)"
              />
            )}
            
            {nearbyLocations.map((location) => (
              <Marker
                key={location.id}
                coordinate={{
                  latitude: parseFloat(location.latitude),
                  longitude: parseFloat(location.longitude),
                }}
                title={location.name || location.placeName || 'Unnamed Location'}
                onPress={() => handleLocationPress(location)}
              />
            ))}
          </MapView>
        </View>
      )}

      {/* Nearby Locations */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Nearby Locations</Text>
        {loading ? (
          <ActivityIndicator size="large" color="#2563eb" style={styles.loader} />
        ) : nearbyLocations.length > 0 ? (
          nearbyLocations.map((location) => (
            <TouchableOpacity
              key={location.id}
              style={styles.locationCard}
              onPress={() => handleLocationPress(location)}
            >
              <View style={styles.locationHeader}>
                <Icon name="place" size={20} color="#2563eb" />
                <Text style={styles.locationName}>
                  {location.name || location.placeName || 'Unnamed Location'}
                </Text>
              </View>
              <Text style={styles.locationCoords}>
                {parseFloat(location.latitude).toFixed(4)}, {parseFloat(location.longitude).toFixed(4)}
              </Text>
              {location.patterns && location.patterns.length > 0 && (
                <Text style={styles.patternCount}>
                  {location.patterns.length} pattern{location.patterns.length !== 1 ? 's' : ''}
                </Text>
              )}
            </TouchableOpacity>
          ))
        ) : (
          <Text style={styles.noDataText}>No nearby locations found</Text>
        )}
      </View>

      {/* Selected Location Patterns */}
      {selectedLocation && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Patterns at {selectedLocation.name || selectedLocation.placeName || 'Selected Location'}
          </Text>
          {patterns.length > 0 ? (
            patterns.map((pattern) => (
              <View key={pattern.id} style={styles.patternCard}>
                <View style={styles.patternHeader}>
                  <Text style={styles.patternNumber}>#{pattern.number}</Text>
                  <Text style={styles.patternName}>{pattern.name}</Text>
                </View>
                <Text style={styles.patternDescription}>{pattern.description}</Text>
                <View style={styles.patternStats}>
                  <Text style={styles.statText}>Votes: {pattern.votes}</Text>
                  <Text style={styles.statText}>Confidence: {pattern.confidence}%</Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.noDataText}>No patterns found at this location</Text>
          )}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  statusCard: {
    backgroundColor: 'white',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 8,
  },
  locationText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
  },
  accuracyText: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 16,
  },
  noLocationText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  secondaryButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 4,
  },
  secondaryButtonText: {
    color: '#2563eb',
    fontWeight: '600',
    marginLeft: 4,
  },
  mapContainer: {
    height: 250,
    margin: 16,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  map: {
    flex: 1,
  },
  section: {
    backgroundColor: 'white',
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  locationCard: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  locationName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginLeft: 8,
  },
  locationCoords: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  patternCount: {
    fontSize: 12,
    color: '#2563eb',
    fontWeight: '500',
  },
  patternCard: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  patternHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  patternNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563eb',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  patternName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    flex: 1,
  },
  patternDescription: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
    lineHeight: 20,
  },
  patternStats: {
    flexDirection: 'row',
    gap: 16,
  },
  statText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  loader: {
    marginVertical: 20,
  },
  noDataText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginVertical: 20,
  },
});

export default DiscoverScreen;