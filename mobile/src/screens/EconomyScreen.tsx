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
import { apiService, type TokenTransaction } from '../services/ApiService';

const EconomyScreen: React.FC = () => {
  const { user, updateTokens } = useAuth();
  const [transactions, setTransactions] = useState<TokenTransaction[]>([]);
  const [tokenBalance, setTokenBalance] = useState({ earned: 0, spent: 0, balance: 0 });
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadTokenData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const [balance, transactionHistory] = await Promise.all([
        apiService.getTokenBalance(user.sessionId),
        apiService.getTokenTransactions(user.sessionId)
      ]);
      
      setTokenBalance(balance);
      setTransactions(transactionHistory);
    } catch (error) {
      console.error('Error loading token data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTokenData();
    setRefreshing(false);
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getTransactionIcon = (type: string) => {
    return type === 'earned' ? 'add-circle' : 'remove-circle';
  };

  const getTransactionColor = (type: string) => {
    return type === 'earned' ? '#10b981' : '#ef4444';
  };

  const handleEarnTokens = () => {
    Alert.alert(
      'Earn Tokens',
      'You can earn tokens by:\n\n• Discovering and confirming patterns\n• Contributing location data\n• Participating in community voting\n• Sharing valuable insights',
      [{ text: 'Got it!' }]
    );
  };

  const handleMarketplace = () => {
    Alert.alert(
      'Data Marketplace',
      'Coming soon! You\'ll be able to:\n\n• Sell location insights\n• Purchase premium pattern data\n• Trade spatial analysis reports\n• Access exclusive community features',
      [{ text: 'Exciting!' }]
    );
  };

  useEffect(() => {
    loadTokenData();
  }, [user]);

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Wallet Overview */}
      <View style={styles.walletCard}>
        <View style={styles.walletHeader}>
          <Icon name="account-balance-wallet" size={32} color="#2563eb" />
          <View style={styles.walletInfo}>
            <Text style={styles.walletTitle}>Token Wallet</Text>
            <Text style={styles.walletSubtitle}>{user?.username || 'Anonymous User'}</Text>
          </View>
        </View>

        <View style={styles.balanceSection}>
          <View style={styles.balanceItem}>
            <Text style={styles.balanceLabel}>Current Balance</Text>
            <Text style={styles.balanceValue}>
              {tokenBalance.balance || ((user?.tokensEarned || 0) - (user?.tokensSpent || 0))}
            </Text>
            <Text style={styles.balanceUnit}>PDT</Text>
          </View>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Icon name="trending-up" size={20} color="#10b981" />
            <Text style={styles.summaryLabel}>Total Earned</Text>
            <Text style={styles.summaryValue}>
              {tokenBalance.earned || user?.tokensEarned || 0}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Icon name="trending-down" size={20} color="#ef4444" />
            <Text style={styles.summaryLabel}>Total Spent</Text>
            <Text style={styles.summaryValue}>
              {tokenBalance.spent || user?.tokensSpent || 0}
            </Text>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsSection}>
        <TouchableOpacity style={styles.actionButton} onPress={handleEarnTokens}>
          <Icon name="add-circle" size={24} color="#10b981" />
          <Text style={styles.actionText}>Earn Tokens</Text>
          <Text style={styles.actionSubtext}>Discover patterns, vote, contribute</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleMarketplace}>
          <Icon name="store" size={24} color="#2563eb" />
          <Text style={styles.actionText}>Marketplace</Text>
          <Text style={styles.actionSubtext}>Buy & sell data insights</Text>
        </TouchableOpacity>
      </View>

      {/* Token Economics Info */}
      <View style={styles.infoSection}>
        <Text style={styles.sectionTitle}>Bitcoin-Powered Economy</Text>
        <View style={styles.infoGrid}>
          <View style={styles.infoCard}>
            <Icon name="security" size={24} color="#f59e0b" />
            <Text style={styles.infoCardTitle}>Secure</Text>
            <Text style={styles.infoCardText}>
              Blockchain-secured token system with transparent transactions
            </Text>
          </View>

          <View style={styles.infoCard}>
            <Icon name="group" size={24} color="#10b981" />
            <Text style={styles.infoCardTitle}>Community-Driven</Text>
            <Text style={styles.infoCardText}>
              Earn tokens by contributing valuable data to the community
            </Text>
          </View>

          <View style={styles.infoCard}>
            <Icon name="trending-up" size={24} color="#2563eb" />
            <Text style={styles.infoCardTitle}>Deflationary</Text>
            <Text style={styles.infoCardText}>
              Limited supply with halving mechanism like Bitcoin
            </Text>
          </View>

          <View style={styles.infoCard}>
            <Icon name="swap-horiz" size={24} color="#8b5cf6" />
            <Text style={styles.infoCardTitle}>Tradeable</Text>
            <Text style={styles.infoCardText}>
              Trade tokens for premium features and data insights
            </Text>
          </View>
        </View>
      </View>

      {/* Transaction History */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Transaction History</Text>
        {loading ? (
          <ActivityIndicator size="large" color="#2563eb" style={styles.loader} />
        ) : transactions.length > 0 ? (
          transactions.map((transaction) => (
            <View key={transaction.id} style={styles.transactionItem}>
              <View style={styles.transactionIcon}>
                <Icon 
                  name={getTransactionIcon(transaction.type)} 
                  size={20} 
                  color={getTransactionColor(transaction.type)} 
                />
              </View>
              
              <View style={styles.transactionContent}>
                <Text style={styles.transactionDescription}>
                  {transaction.description}
                </Text>
                <Text style={styles.transactionTime}>
                  {formatTimestamp(transaction.timestamp)}
                </Text>
              </View>
              
              <View style={styles.transactionAmount}>
                <Text style={[
                  styles.amountText,
                  { color: getTransactionColor(transaction.type) }
                ]}>
                  {transaction.type === 'earned' ? '+' : '-'}{transaction.amount}
                </Text>
                <Text style={styles.amountUnit}>PDT</Text>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Icon name="receipt" size={48} color="#9ca3af" />
            <Text style={styles.emptyStateTitle}>No Transactions Yet</Text>
            <Text style={styles.emptyStateText}>
              Start discovering patterns and contributing to earn your first tokens!
            </Text>
          </View>
        )}
      </View>

      {/* Earning Opportunities */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ways to Earn Tokens</Text>
        
        <View style={styles.opportunityItem}>
          <Icon name="lightbulb" size={24} color="#f59e0b" />
          <View style={styles.opportunityContent}>
            <Text style={styles.opportunityTitle}>Pattern Discovery</Text>
            <Text style={styles.opportunityDesc}>
              Use AI to identify architectural patterns in real locations
            </Text>
            <Text style={styles.opportunityReward}>Up to 10 PDT per pattern</Text>
          </View>
        </View>

        <View style={styles.opportunityItem}>
          <Icon name="how-to-vote" size={24} color="#2563eb" />
          <View style={styles.opportunityContent}>
            <Text style={styles.opportunityTitle}>Community Voting</Text>
            <Text style={styles.opportunityDesc}>
              Vote on pattern suggestions to validate community contributions
            </Text>
            <Text style={styles.opportunityReward}>1-3 PDT per vote</Text>
          </View>
        </View>

        <View style={styles.opportunityItem}>
          <Icon name="location-on" size={24} color="#10b981" />
          <View style={styles.opportunityContent}>
            <Text style={styles.opportunityTitle}>Location Data</Text>
            <Text style={styles.opportunityDesc}>
              Share valuable location insights and movement patterns
            </Text>
            <Text style={styles.opportunityReward}>5-15 PDT per location</Text>
          </View>
        </View>

        <View style={styles.opportunityItem}>
          <Icon name="message" size={24} color="#8b5cf6" />
          <View style={styles.opportunityContent}>
            <Text style={styles.opportunityTitle}>Quality Insights</Text>
            <Text style={styles.opportunityDesc}>
              Share high-quality architectural and urban planning insights
            </Text>
            <Text style={styles.opportunityReward}>20+ PDT per insight</Text>
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
  walletCard: {
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
  walletHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  walletInfo: {
    marginLeft: 16,
    flex: 1,
  },
  walletTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  walletSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  balanceSection: {
    alignItems: 'center',
    paddingVertical: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e5e7eb',
  },
  balanceItem: {
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  balanceValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
  },
  balanceUnit: {
    fontSize: 16,
    color: '#2563eb',
    fontWeight: '600',
    marginTop: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginTop: 2,
  },
  actionsSection: {
    flexDirection: 'row',
    margin: 16,
    marginTop: 0,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginTop: 8,
  },
  actionSubtext: {
    fontSize: 11,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 2,
  },
  infoSection: {
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
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  infoCard: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
  },
  infoCardTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
    marginTop: 8,
    marginBottom: 4,
  },
  infoCardText: {
    fontSize: 10,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 14,
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
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  transactionContent: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
    marginBottom: 2,
  },
  transactionTime: {
    fontSize: 12,
    color: '#6b7280',
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 16,
    fontWeight: '600',
  },
  amountUnit: {
    fontSize: 10,
    color: '#6b7280',
    marginTop: 2,
  },
  opportunityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  opportunityContent: {
    flex: 1,
    marginLeft: 12,
  },
  opportunityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  opportunityDesc: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 16,
    marginBottom: 4,
  },
  opportunityReward: {
    fontSize: 11,
    color: '#10b981',
    fontWeight: '600',
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

export default EconomyScreen;