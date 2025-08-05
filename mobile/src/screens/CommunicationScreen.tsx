import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useWebSocket } from '../services/WebSocketService';
import { useAuth } from '../services/AuthService';
import { useLocationTracking } from '../services/LocationTrackingService';

const CommunicationScreen: React.FC = () => {
  const { user } = useAuth();
  const { currentLocation } = useLocationTracking();
  const { isConnected, messages, sendMessage, connectToNearbyUsers, disconnect } = useWebSocket();
  
  const [messageText, setMessageText] = useState('');
  const [messageType, setMessageType] = useState<'location_share' | 'pattern_insight' | 'encrypted_message'>('encrypted_message');
  const flatListRef = useRef<FlatList>(null);

  const handleConnect = () => {
    if (!currentLocation) {
      Alert.alert('Location Required', 'Please enable location tracking to connect to nearby users.');
      return;
    }
    
    connectToNearbyUsers(currentLocation.latitude, currentLocation.longitude);
  };

  const handleSendMessage = () => {
    if (!messageText.trim()) return;
    
    const locationData = messageType === 'location_share' && currentLocation ? {
      latitude: currentLocation.latitude,
      longitude: currentLocation.longitude,
      placeName: 'Current Location',
    } : undefined;

    sendMessage(messageText.trim(), messageType, locationData);
    setMessageText('');
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getMessageTypeIcon = (type: string) => {
    switch (type) {
      case 'location_share':
        return 'location-on';
      case 'pattern_insight':
        return 'lightbulb';
      case 'encrypted_message':
        return 'lock';
      default:
        return 'message';
    }
  };

  const getMessageTypeColor = (type: string) => {
    switch (type) {
      case 'location_share':
        return '#10b981';
      case 'pattern_insight':
        return '#f59e0b';
      case 'encrypted_message':
        return '#2563eb';
      default:
        return '#6b7280';
    }
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isOwnMessage = item.senderId === user?.sessionId;
    
    return (
      <View style={[
        styles.messageContainer,
        isOwnMessage ? styles.ownMessage : styles.otherMessage
      ]}>
        <View style={styles.messageHeader}>
          <View style={styles.messageInfo}>
            <Icon 
              name={getMessageTypeIcon(item.messageType)} 
              size={12} 
              color={getMessageTypeColor(item.messageType)}
            />
            <Text style={styles.senderName}>
              {isOwnMessage ? 'You' : item.senderUsername}
            </Text>
            <Text style={styles.messageTime}>
              {formatTimestamp(item.timestamp)}
            </Text>
          </View>
          {item.encryptionLevel !== 'none' && (
            <Icon name="shield" size={12} color="#10b981" />
          )}
        </View>
        
        <Text style={[
          styles.messageText,
          isOwnMessage ? styles.ownMessageText : styles.otherMessageText
        ]}>
          {item.content}
        </Text>
        
        {item.locationData && (
          <View style={styles.locationShare}>
            <Icon name="location-on" size={14} color="#6b7280" />
            <Text style={styles.locationText}>
              {item.locationData.placeName || 'Shared Location'}
            </Text>
            <Text style={styles.locationCoords}>
              {item.locationData.latitude.toFixed(4)}, {item.locationData.longitude.toFixed(4)}
            </Text>
          </View>
        )}
        
        {item.tokenCost && (
          <Text style={styles.tokenCost}>
            Cost: {item.tokenCost} tokens
          </Text>
        )}
      </View>
    );
  };

  useEffect(() => {
    if (messages.length > 0) {
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages]);

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Connection Status */}
      <View style={styles.statusBar}>
        <View style={styles.statusInfo}>
          <View style={[
            styles.statusIndicator,
            { backgroundColor: isConnected ? '#10b981' : '#ef4444' }
          ]} />
          <Text style={styles.statusText}>
            {isConnected ? 'Connected to nearby users' : 'Disconnected'}
          </Text>
        </View>
        
        {!isConnected ? (
          <TouchableOpacity style={styles.connectButton} onPress={handleConnect}>
            <Text style={styles.connectButtonText}>Connect</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.disconnectButton} onPress={disconnect}>
            <Text style={styles.disconnectButtonText}>Disconnect</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Message Input */}
      {isConnected && (
        <View style={styles.messageInput}>
          {/* Message Type Selector */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.typeSelector}
          >
            <TouchableOpacity
              style={[
                styles.typeButton,
                messageType === 'encrypted_message' && styles.activeTypeButton
              ]}
              onPress={() => setMessageType('encrypted_message')}
            >
              <Icon name="lock" size={16} color={messageType === 'encrypted_message' ? 'white' : '#2563eb'} />
              <Text style={[
                styles.typeButtonText,
                messageType === 'encrypted_message' && styles.activeTypeButtonText
              ]}>
                Encrypted
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.typeButton,
                messageType === 'location_share' && styles.activeTypeButton
              ]}
              onPress={() => setMessageType('location_share')}
            >
              <Icon name="location-on" size={16} color={messageType === 'location_share' ? 'white' : '#10b981'} />
              <Text style={[
                styles.typeButtonText,
                messageType === 'location_share' && styles.activeTypeButtonText
              ]}>
                Location
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.typeButton,
                messageType === 'pattern_insight' && styles.activeTypeButton
              ]}
              onPress={() => setMessageType('pattern_insight')}
            >
              <Icon name="lightbulb" size={16} color={messageType === 'pattern_insight' ? 'white' : '#f59e0b'} />
              <Text style={[
                styles.typeButtonText,
                messageType === 'pattern_insight' && styles.activeTypeButtonText
              ]}>
                Pattern
              </Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Input Row */}
          <View style={styles.inputRow}>
            <TextInput
              style={styles.textInput}
              value={messageText}
              onChangeText={setMessageText}
              placeholder="Type your message..."
              multiline
              maxLength={500}
            />
            <TouchableOpacity 
              style={[
                styles.sendButton,
                { opacity: messageText.trim() ? 1 : 0.5 }
              ]}
              onPress={handleSendMessage}
              disabled={!messageText.trim()}
            >
              <Icon name="send" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Info Panel */}
      {!isConnected && (
        <View style={styles.infoPanel}>
          <Icon name="info" size={24} color="#2563eb" />
          <Text style={styles.infoTitle}>Bitcoin-Powered Messaging</Text>
          <Text style={styles.infoText}>
            Connect to nearby users to share encrypted messages, location data, and pattern insights. 
            Earn tokens for valuable contributions to the community.
          </Text>
          <View style={styles.features}>
            <Text style={styles.feature}>🔒 End-to-end encryption</Text>
            <Text style={styles.feature}>📍 Location-based connections</Text>
            <Text style={styles.feature}>🪙 Token-gated premium features</Text>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  connectButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  connectButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  disconnectButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ef4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  disconnectButtonText: {
    color: '#ef4444',
    fontWeight: '600',
    fontSize: 14,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingVertical: 16,
  },
  messageContainer: {
    marginHorizontal: 16,
    marginVertical: 4,
    padding: 12,
    borderRadius: 12,
    maxWidth: '80%',
  },
  ownMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#2563eb',
  },
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  messageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  messageTime: {
    fontSize: 10,
    color: '#9ca3af',
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  ownMessageText: {
    color: 'white',
  },
  otherMessageText: {
    color: '#111827',
  },
  locationShare: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 6,
    gap: 4,
  },
  locationText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  locationCoords: {
    fontSize: 10,
    color: '#9ca3af',
  },
  tokenCost: {
    fontSize: 10,
    color: '#f59e0b',
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'right',
  },
  messageInput: {
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    padding: 16,
  },
  typeSelector: {
    marginBottom: 12,
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginRight: 8,
    backgroundColor: 'white',
  },
  activeTypeButton: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  typeButtonText: {
    fontSize: 12,
    color: '#374151',
    marginLeft: 4,
    fontWeight: '500',
  },
  activeTypeButtonText: {
    color: 'white',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    maxHeight: 100,
    fontSize: 14,
    color: '#111827',
  },
  sendButton: {
    backgroundColor: '#2563eb',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoPanel: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  features: {
    alignItems: 'flex-start',
  },
  feature: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
  },
});

export default CommunicationScreen;