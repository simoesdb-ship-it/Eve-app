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
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../services/AuthService';
import { apiService, type Pattern, type Location } from '../services/ApiService';

const PatternsScreen: React.FC = () => {
  const { user } = useAuth();
  const [savedLocations, setSavedLocations] = useState<Location[]>([]);
  const [selectedPatterns, setSelectedPatterns] = useState<Pattern[]>([]);
  const [suggestedPatterns, setSuggestedPatterns] = useState<Pattern[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);

  const loadSavedLocations = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      // This would be an API call to get user's saved locations
      // For now, we'll use nearby locations as a placeholder
      // const locations = await apiService.getUserSavedLocations(user.sessionId);
      setSavedLocations([]);
    } catch (error) {
      console.error('Error loading saved locations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadLocationPatterns = async (locationId: number) => {
    try {
      const [patterns, suggestions] = await Promise.all([
        apiService.getLocationPatterns(locationId),
        apiService.getPatternSuggestions(locationId)
      ]);
      
      setSelectedPatterns(patterns);
      setSuggestedPatterns(suggestions);
      setSelectedLocationId(locationId);
    } catch (error) {
      console.error('Error loading patterns:', error);
      Alert.alert('Error', 'Failed to load patterns');
    }
  };

  const handleVotePattern = async (patternId: number, vote: 'up' | 'down') => {
    if (!user || !selectedLocationId) return;

    try {
      await apiService.voteOnPattern({
        locationId: selectedLocationId,
        patternId,
        vote,
        sessionId: user.sessionId,
      });
      
      // Refresh patterns after voting
      await loadLocationPatterns(selectedLocationId);
      Alert.alert('Success', `Vote ${vote === 'up' ? 'cast' : 'recorded'} successfully!`);
    } catch (error) {
      console.error('Error voting on pattern:', error);
      Alert.alert('Error', 'Failed to cast vote');
    }
  };

  const handleAssignPattern = async (patternId: number) => {
    if (!user || !selectedLocationId) return;

    try {
      await apiService.assignPatternToLocation({
        locationId: selectedLocationId,
        patternId,
        sessionId: user.sessionId,
      });
      
      // Refresh patterns after assignment
      await loadLocationPatterns(selectedLocationId);
      Alert.alert('Success', 'Pattern assigned successfully!');
    } catch (error) {
      console.error('Error assigning pattern:', error);
      Alert.alert('Error', 'Failed to assign pattern');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSavedLocations();
    if (selectedLocationId) {
      await loadLocationPatterns(selectedLocationId);
    }
    setRefreshing(false);
  };

  useEffect(() => {
    loadSavedLocations();
  }, [user]);

  const renderPatternCard = (pattern: Pattern, isAssigned: boolean = false) => (
    <View key={pattern.id} style={styles.patternCard}>
      <View style={styles.patternHeader}>
        <View style={styles.patternInfo}>
          <Text style={styles.patternNumber}>#{pattern.number}</Text>
          <View style={styles.patternTitleContainer}>
            <Text style={styles.patternName}>{pattern.name}</Text>
            {isAssigned && (
              <View style={styles.assignedBadge}>
                <Icon name="check-circle" size={12} color="#10b981" />
                <Text style={styles.assignedText}>Assigned</Text>
              </View>
            )}
          </View>
        </View>
        
        <View style={styles.patternStats}>
          <Text style={styles.statText}>Votes: {pattern.votes}</Text>
          <Text style={styles.statText}>Confidence: {pattern.confidence}%</Text>
        </View>
      </View>

      <Text style={styles.patternDescription}>{pattern.description}</Text>

      <View style={styles.patternActions}>
        {!isAssigned && (
          <TouchableOpacity
            style={styles.assignButton}
            onPress={() => handleAssignPattern(pattern.id)}
          >
            <Icon name="add" size={16} color="white" />
            <Text style={styles.buttonText}>Assign</Text>
          </TouchableOpacity>
        )}
        
        <View style={styles.voteButtons}>
          <TouchableOpacity
            style={styles.voteButton}
            onPress={() => handleVotePattern(pattern.id, 'up')}
          >
            <Icon name="thumb-up" size={16} color="#10b981" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.voteButton}
            onPress={() => handleVotePattern(pattern.id, 'down')}
          >
            <Icon name="thumb-down" size={16} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* User Info */}
      <View style={styles.userCard}>
        <View style={styles.userInfo}>
          <Icon name="person" size={24} color="#2563eb" />
          <View>
            <Text style={styles.username}>{user?.username || 'Anonymous User'}</Text>
            <Text style={styles.userStats}>
              Tokens: {user?.tokensEarned || 0} earned, {user?.tokensSpent || 0} spent
            </Text>
          </View>
        </View>
      </View>

      {/* Saved Locations */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>My Saved Locations</Text>
        {loading ? (
          <ActivityIndicator size="large" color="#2563eb" style={styles.loader} />
        ) : savedLocations.length > 0 ? (
          savedLocations.map((location) => (
            <TouchableOpacity
              key={location.id}
              style={[
                styles.locationCard,
                selectedLocationId === location.id && styles.selectedLocationCard
              ]}
              onPress={() => loadLocationPatterns(location.id)}
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
          <View style={styles.emptyState}>
            <Icon name="location-off" size={48} color="#9ca3af" />
            <Text style={styles.emptyStateTitle}>No Saved Locations</Text>
            <Text style={styles.emptyStateText}>
              Go to the Discover tab to find and save locations with architectural patterns.
            </Text>
          </View>
        )}
      </View>

      {/* Assigned Patterns */}
      {selectedPatterns.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Assigned Patterns</Text>
          {selectedPatterns.map((pattern) => renderPatternCard(pattern, true))}
        </View>
      )}

      {/* Pattern Suggestions */}
      {suggestedPatterns.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pattern Suggestions</Text>
          <Text style={styles.sectionSubtitle}>
            AI-suggested patterns for this location
          </Text>
          {suggestedPatterns.map((pattern) => renderPatternCard(pattern, false))}
        </View>
      )}

      {/* Pattern Library Info */}
      <View style={styles.infoSection}>
        <Icon name="library-books" size={24} color="#2563eb" />
        <Text style={styles.infoTitle}>Christopher Alexander's Pattern Language</Text>
        <Text style={styles.infoText}>
          This app uses Christopher Alexander's 253 architectural patterns to analyze 
          real-world spaces. Each pattern represents a recurring design solution that 
          contributes to the quality of built environments.
        </Text>
        <View style={styles.patternStats}>
          <Text style={styles.statItem}>253 Total Patterns</Text>
          <Text style={styles.statItem}>Community-Driven Analysis</Text>
          <Text style={styles.statItem}>ML-Powered Suggestions</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  userCard: {
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
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  username: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 12,
  },
  userStats: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 12,
    marginTop: 2,
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
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  locationCard: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  selectedLocationCard: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
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
    padding: 16,
    marginBottom: 12,
  },
  patternHeader: {
    marginBottom: 12,
  },
  patternInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
    marginRight: 12,
  },
  patternTitleContainer: {
    flex: 1,
  },
  patternName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  assignedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  assignedText: {
    fontSize: 10,
    color: '#10b981',
    fontWeight: '600',
    marginLeft: 2,
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
  patternDescription: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 16,
  },
  patternActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  assignButton: {
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 4,
    fontSize: 12,
  },
  voteButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  voteButton: {
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  infoSection: {
    backgroundColor: 'white',
    margin: 16,
    marginTop: 0,
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    alignItems: 'center',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  infoText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  patternStats: {
    alignItems: 'center',
  },
  statItem: {
    fontSize: 12,
    color: '#2563eb',
    fontWeight: '500',
    marginBottom: 4,
  },
  loader: {
    marginVertical: 20,
  },
});

export default PatternsScreen;