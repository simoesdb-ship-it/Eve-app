import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../services/AuthService';
import { apiService, type ActivityItem } from '../services/ApiService';

const ActivityScreen: React.FC = () => {
  const { user } = useAuth();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [stats, setStats] = useState({
    suggestedPatterns: 0,
    votesContributed: 0,
    offlineLocations: 0,
    hoursContributed: 0,
    locationsTracked: 0,
    patternsFound: 0,
    votesCast: 0,
  });
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadActivityData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const [activityData, statsData] = await Promise.all([
        apiService.getUserActivity(user.sessionId),
        apiService.getStats()
      ]);
      
      setActivities(activityData);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading activity data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadActivityData();
    setRefreshing(false);
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'pattern_found':
        return 'lightbulb';
      case 'location_saved':
        return 'add-location';
      case 'vote_cast':
        return 'how-to-vote';
      case 'tokens_earned':
        return 'monetization-on';
      default:
        return 'timeline';
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'pattern_found':
        return '#f59e0b';
      case 'location_saved':
        return '#10b981';
      case 'vote_cast':
        return '#2563eb';
      case 'tokens_earned':
        return '#8b5cf6';
      default:
        return '#6b7280';
    }
  };

  useEffect(() => {
    loadActivityData();
  }, [user]);

  const StatCard = ({ icon, title, value, subtitle }: {
    icon: string;
    title: string;
    value: string | number;
    subtitle?: string;
  }) => (
    <View style={styles.statCard}>
      <Icon name={icon} size={24} color="#2563eb" />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </View>
  );

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* User Overview */}
      <View style={styles.userCard}>
        <View style={styles.userHeader}>
          <Icon name="person" size={32} color="#2563eb" />
          <View style={styles.userInfo}>
            <Text style={styles.username}>{user?.username || 'Anonymous User'}</Text>
            <Text style={styles.userSubtitle}>Pattern Discovery Contributor</Text>
          </View>
        </View>
        
        <View style={styles.tokenInfo}>
          <View style={styles.tokenItem}>
            <Icon name="account-balance-wallet" size={16} color="#10b981" />
            <Text style={styles.tokenText}>Earned: {user?.tokensEarned || 0}</Text>
          </View>
          <View style={styles.tokenItem}>
            <Icon name="shopping-cart" size={16} color="#ef4444" />
            <Text style={styles.tokenText}>Spent: {user?.tokensSpent || 0}</Text>
          </View>
          <View style={styles.tokenItem}>
            <Icon name="account-balance" size={16} color="#2563eb" />
            <Text style={styles.tokenText}>
              Balance: {(user?.tokensEarned || 0) - (user?.tokensSpent || 0)}
            </Text>
          </View>
        </View>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsSection}>
        <Text style={styles.sectionTitle}>Your Contributions</Text>
        <View style={styles.statsGrid}>
          <StatCard
            icon="pattern"
            title="Patterns Found"
            value={stats.patternsFound}
            subtitle="AI suggestions confirmed"
          />
          <StatCard
            icon="how-to-vote"
            title="Votes Cast"
            value={stats.votesCast}
            subtitle="Community validation"
          />
          <StatCard
            icon="location-on"
            title="Locations"
            value={stats.locationsTracked}
            subtitle="Places discovered"
          />
          <StatCard
            icon="schedule"
            title="Hours"
            value={stats.hoursContributed}
            subtitle="Time contributed"
          />
        </View>
      </View>

      {/* Activity Feed */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        {loading ? (
          <ActivityIndicator size="large" color="#2563eb" style={styles.loader} />
        ) : activities.length > 0 ? (
          activities.map((activity) => (
            <View key={activity.id} style={styles.activityItem}>
              <View style={styles.activityIconContainer}>
                <View style={[
                  styles.activityIcon,
                  { backgroundColor: getActivityColor(activity.type) }
                ]}>
                  <Icon 
                    name={getActivityIcon(activity.type)} 
                    size={16} 
                    color="white" 
                  />
                </View>
                <View style={styles.activityLine} />
              </View>
              
              <View style={styles.activityContent}>
                <Text style={styles.activityDescription}>
                  {activity.description}
                </Text>
                <Text style={styles.activityTime}>
                  {formatTimestamp(activity.timestamp)}
                </Text>
                
                {activity.details && (
                  <View style={styles.activityDetails}>
                    {activity.details.patternName && (
                      <Text style={styles.detailText}>
                        Pattern: {activity.details.patternName}
                      </Text>
                    )}
                    {activity.details.locationName && (
                      <Text style={styles.detailText}>
                        Location: {activity.details.locationName}
                      </Text>
                    )}
                    {activity.details.tokensEarned && (
                      <Text style={styles.tokenDetail}>
                        +{activity.details.tokensEarned} tokens
                      </Text>
                    )}
                  </View>
                )}
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Icon name="timeline" size={48} color="#9ca3af" />
            <Text style={styles.emptyStateTitle}>No Activity Yet</Text>
            <Text style={styles.emptyStateText}>
              Start discovering patterns and saving locations to see your activity here.
            </Text>
          </View>
        )}
      </View>

      {/* Achievement Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Achievements</Text>
        <View style={styles.achievementGrid}>
          <View style={[
            styles.achievementCard,
            stats.patternsFound >= 5 && styles.achievementUnlocked
          ]}>
            <Icon 
              name="star" 
              size={24} 
              color={stats.patternsFound >= 5 ? "#f59e0b" : "#d1d5db"} 
            />
            <Text style={styles.achievementName}>Pattern Explorer</Text>
            <Text style={styles.achievementDesc}>Find 5 patterns</Text>
            <Text style={styles.achievementProgress}>
              {stats.patternsFound}/5
            </Text>
          </View>

          <View style={[
            styles.achievementCard,
            stats.votesCast >= 10 && styles.achievementUnlocked
          ]}>
            <Icon 
              name="thumb-up" 
              size={24} 
              color={stats.votesCast >= 10 ? "#10b981" : "#d1d5db"} 
            />
            <Text style={styles.achievementName}>Community Helper</Text>
            <Text style={styles.achievementDesc}>Cast 10 votes</Text>
            <Text style={styles.achievementProgress}>
              {stats.votesCast}/10
            </Text>
          </View>

          <View style={[
            styles.achievementCard,
            stats.locationsTracked >= 20 && styles.achievementUnlocked
          ]}>
            <Icon 
              name="map" 
              size={24} 
              color={stats.locationsTracked >= 20 ? "#2563eb" : "#d1d5db"} 
            />
            <Text style={styles.achievementName}>Explorer</Text>
            <Text style={styles.achievementDesc}>Visit 20 locations</Text>
            <Text style={styles.achievementProgress}>
              {stats.locationsTracked}/20
            </Text>
          </View>

          <View style={[
            styles.achievementCard,
            (user?.tokensEarned || 0) >= 100 && styles.achievementUnlocked
          ]}>
            <Icon 
              name="monetization-on" 
              size={24} 
              color={(user?.tokensEarned || 0) >= 100 ? "#8b5cf6" : "#d1d5db"} 
            />
            <Text style={styles.achievementName}>Token Collector</Text>
            <Text style={styles.achievementDesc}>Earn 100 tokens</Text>
            <Text style={styles.achievementProgress}>
              {user?.tokensEarned || 0}/100
            </Text>
          </View>
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
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  userInfo: {
    marginLeft: 16,
    flex: 1,
  },
  username: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  userSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  tokenInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  tokenItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tokenText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
    marginLeft: 4,
  },
  statsSection: {
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginTop: 8,
  },
  statTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginTop: 4,
    textAlign: 'center',
  },
  statSubtitle: {
    fontSize: 10,
    color: '#6b7280',
    marginTop: 2,
    textAlign: 'center',
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
  activityItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  activityIconContainer: {
    alignItems: 'center',
    marginRight: 12,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#e5e7eb',
    marginTop: 8,
  },
  activityContent: {
    flex: 1,
  },
  activityDescription: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
    marginBottom: 4,
  },
  activityTime: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
  },
  activityDetails: {
    backgroundColor: '#f8fafc',
    padding: 8,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#2563eb',
  },
  detailText: {
    fontSize: 12,
    color: '#374151',
    marginBottom: 2,
  },
  tokenDetail: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '600',
  },
  achievementGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  achievementCard: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  achievementUnlocked: {
    borderColor: '#10b981',
    backgroundColor: '#f0fdf4',
  },
  achievementName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
    marginTop: 8,
    textAlign: 'center',
  },
  achievementDesc: {
    fontSize: 10,
    color: '#6b7280',
    marginTop: 2,
    textAlign: 'center',
  },
  achievementProgress: {
    fontSize: 10,
    color: '#2563eb',
    fontWeight: '600',
    marginTop: 4,
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
  loader: {
    marginVertical: 20,
  },
});

export default ActivityScreen;