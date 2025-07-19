// WebSocket-based communication server for Bitcoin-powered location sharing
import { WebSocketServer, WebSocket } from 'ws';
import { storage } from './storage-clean';

interface ConnectedUser {
  userId: string;
  username: string;
  ws: WebSocket;
  publicKey?: string;
  isActive: boolean;
}

interface CommunicationMessage {
  type: 'user_connect' | 'discover_peers' | 'key_exchange' | 'send_message' | 'share_location' | 'share_path';
  userId?: string;
  username?: string;
  data?: any;
}

export class CommunicationServer {
  private wss: WebSocketServer;
  private connectedUsers = new Map<string, ConnectedUser>();

  constructor(httpServer: any) {
    this.wss = new WebSocketServer({ 
      server: httpServer, 
      path: '/communication' 
    });
    this.setupWebSocketHandlers();
    console.log('WebSocket communication server initialized on /communication');
  }

  private setupWebSocketHandlers() {
    this.wss.on('connection', (ws, req) => {
      console.log('New WebSocket connection established');
      
      ws.on('message', async (data) => {
        try {
          const message: CommunicationMessage = JSON.parse(data.toString());
          await this.handleMessage(ws, message);
        } catch (error) {
          console.error('Invalid message format:', error);
          this.sendError(ws, 'Invalid message format');
        }
      });

      ws.on('close', () => {
        this.handleDisconnection(ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });
    });
  }

  private async handleMessage(ws: WebSocket, message: CommunicationMessage) {
    switch (message.type) {
      case 'user_connect':
        await this.handleUserConnect(ws, message);
        break;
      case 'discover_peers':
        await this.handlePeerDiscovery(ws, message);
        break;
      case 'key_exchange':
        await this.handleKeyExchange(ws, message);
        break;
      case 'send_message':
        await this.handleSendMessage(ws, message);
        break;
      case 'share_location':
        await this.handleLocationShare(ws, message);
        break;
      case 'share_path':
        await this.handlePathShare(ws, message);
        break;
      default:
        this.sendError(ws, 'Unknown message type');
    }
  }

  private async handleUserConnect(ws: WebSocket, message: CommunicationMessage) {
    const { userId, username } = message;
    
    if (!userId || !username) {
      this.sendError(ws, 'Missing userId or username');
      return;
    }

    // Generate mock cryptographic keys for this user
    const publicKey = this.generateMockPublicKey(userId);
    
    const user: ConnectedUser = {
      userId,
      username,
      ws,
      publicKey,
      isActive: true
    };

    this.connectedUsers.set(userId, user);

    // Send connection confirmation with public key
    this.sendMessage(ws, {
      type: 'connection_established',
      publicKey,
      fingerprint: this.generateKeyFingerprint(publicKey)
    });

    // Broadcast updated peer list
    this.broadcastPeerList();
    
    console.log(`User ${username} (${userId}) connected with key fingerprint: ${this.generateKeyFingerprint(publicKey)}`);
  }

  private async handlePeerDiscovery(ws: WebSocket, message: CommunicationMessage) {
    const { userId } = message;
    const user = this.connectedUsers.get(userId!);
    
    if (!user) {
      this.sendError(ws, 'User not connected');
      return;
    }

    // Get nearby peers (for now, all connected users except self)
    const peers = Array.from(this.connectedUsers.values())
      .filter(peer => peer.userId !== userId && peer.isActive)
      .map(peer => ({
        userId: peer.userId,
        username: peer.username,
        publicKey: peer.publicKey,
        trustLevel: 0, // TODO: Get from database
        isOnline: true
      }));

    this.sendMessage(ws, {
      type: 'peers_discovered',
      peers
    });
  }

  private async handleKeyExchange(ws: WebSocket, message: CommunicationMessage) {
    const { userId, data } = message;
    const { targetUserId, publicKey } = data;

    const targetUser = this.connectedUsers.get(targetUserId);
    if (!targetUser) {
      this.sendError(ws, 'Target user not found');
      return;
    }

    // Create or update peer connection in database
    try {
      await storage.createPeerConnection({
        localUserId: userId!,
        peerUserId: targetUserId,
        peerUsername: targetUser.username,
        connectionType: 'websocket',
        publicKey: publicKey,
        trustLevel: 0
      });

      // Notify target user of key exchange
      this.sendMessage(targetUser.ws, {
        type: 'key_exchange_request',
        fromUserId: userId,
        fromUsername: this.connectedUsers.get(userId!)?.username,
        publicKey: publicKey
      });

      this.sendMessage(ws, {
        type: 'key_exchange_initiated',
        targetUserId: targetUserId
      });

    } catch (error) {
      console.error('Key exchange error:', error);
      this.sendError(ws, 'Failed to establish connection');
    }
  }

  private async handleSendMessage(ws: WebSocket, message: CommunicationMessage) {
    const { userId, data } = message;
    const { recipientId, content, messageType = 'text' } = data;

    // Calculate token cost
    const tokenCost = this.calculateMessageCost(messageType, content);
    
    // Check user has enough tokens
    const senderBalance = await storage.getUserTokenBalance(userId!);
    if (senderBalance < tokenCost) {
      this.sendError(ws, 'Insufficient tokens');
      return;
    }

    try {
      // Create message hash for integrity
      const messageHash = this.generateMessageHash(content, Date.now().toString());

      // Store encrypted message in database
      const storedMessage = await storage.createMessage({
        senderId: userId!,
        recipientId,
        messageType,
        encryptedContent: content, // TODO: Add actual encryption
        messageHash,
        transmissionMethod: 'websocket',
        tokenCost
      });

      // Deduct tokens from sender
      await storage.deductTokens(userId!, tokenCost);
      
      // Award small amount to recipient
      await storage.awardTokens(recipientId, Math.floor(tokenCost * 0.1));

      // Send to recipient if online
      const recipient = this.connectedUsers.get(recipientId);
      if (recipient) {
        this.sendMessage(recipient.ws, {
          type: 'new_message',
          message: {
            id: storedMessage.id,
            senderId: userId,
            senderUsername: this.connectedUsers.get(userId!)?.username,
            content,
            messageType,
            tokenCost,
            timestamp: storedMessage.createdAt
          }
        });
      }

      // Confirm to sender
      this.sendMessage(ws, {
        type: 'message_sent',
        messageId: storedMessage.id,
        tokensSpent: tokenCost,
        newBalance: senderBalance - tokenCost
      });

    } catch (error) {
      console.error('Send message error:', error);
      this.sendError(ws, 'Failed to send message');
    }
  }

  private async handleLocationShare(ws: WebSocket, message: CommunicationMessage) {
    const { userId, data } = message;
    const { recipientId, locationData } = data;

    const tokenCost = this.calculateLocationShareCost(locationData);
    
    // Check balance
    const balance = await storage.getUserTokenBalance(userId!);
    if (balance < tokenCost) {
      this.sendError(ws, 'Insufficient tokens for location share');
      return;
    }

    try {
      // Store as message with location data
      const storedMessage = await storage.createMessage({
        senderId: userId!,
        recipientId,
        messageType: 'location',
        encryptedContent: JSON.stringify(locationData),
        messageHash: this.generateMessageHash(JSON.stringify(locationData), Date.now().toString()),
        transmissionMethod: 'websocket',
        tokenCost,
        locationData
      });

      await storage.deductTokens(userId!, tokenCost);
      await storage.awardTokens(recipientId, Math.floor(tokenCost * 0.2));

      // Send to recipient
      const recipient = this.connectedUsers.get(recipientId);
      if (recipient) {
        this.sendMessage(recipient.ws, {
          type: 'location_shared',
          message: {
            id: storedMessage.id,
            senderId: userId,
            senderUsername: this.connectedUsers.get(userId!)?.username,
            locationData,
            tokenCost,
            timestamp: storedMessage.createdAt
          }
        });
      }

      this.sendMessage(ws, {
        type: 'location_share_sent',
        messageId: storedMessage.id,
        tokensSpent: tokenCost
      });

    } catch (error) {
      console.error('Location share error:', error);
      this.sendError(ws, 'Failed to share location');
    }
  }

  private async handlePathShare(ws: WebSocket, message: CommunicationMessage) {
    const { userId, data } = message;
    const { pathName, pathData, accessType, tokenCost } = data;

    try {
      // Extract pattern insights from path data
      const patternInsights = this.extractPatternInsights(pathData);

      const sharedPath = await storage.createSharedPath({
        sharerId: userId!,
        pathName,
        pathData,
        accessType,
        tokenCost,
        patternInsights
      });

      this.sendMessage(ws, {
        type: 'path_shared',
        pathId: sharedPath.id,
        pathName,
        tokenCost
      });

      // Broadcast to other users that new path is available
      this.broadcastNewPath(sharedPath, userId!);

    } catch (error) {
      console.error('Path share error:', error);
      this.sendError(ws, 'Failed to share path');
    }
  }

  private handleDisconnection(ws: WebSocket) {
    // Find and remove user
    for (const [userId, user] of this.connectedUsers.entries()) {
      if (user.ws === ws) {
        user.isActive = false;
        console.log(`User ${user.username} (${userId}) disconnected`);
        this.connectedUsers.delete(userId);
        this.broadcastPeerList();
        break;
      }
    }
  }

  private broadcastPeerList() {
    const peerList = Array.from(this.connectedUsers.values())
      .filter(user => user.isActive)
      .map(user => ({
        userId: user.userId,
        username: user.username,
        publicKey: user.publicKey,
        isOnline: true
      }));

    this.broadcast({
      type: 'peers_update',
      peers: peerList
    });
  }

  private broadcastNewPath(path: any, excludeUserId: string) {
    this.broadcast({
      type: 'new_path_available',
      path: {
        id: path.id,
        pathName: path.pathName,
        tokenCost: path.tokenCost,
        sharerId: path.sharerId,
        sharerUsername: this.connectedUsers.get(path.sharerId)?.username
      }
    }, excludeUserId);
  }

  private broadcast(message: any, excludeUserId?: string) {
    for (const [userId, user] of this.connectedUsers.entries()) {
      if (user.isActive && userId !== excludeUserId && user.ws.readyState === WebSocket.OPEN) {
        this.sendMessage(user.ws, message);
      }
    }
  }

  private sendMessage(ws: WebSocket, message: any) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  private sendError(ws: WebSocket, error: string) {
    this.sendMessage(ws, {
      type: 'error',
      message: error
    });
  }

  private calculateMessageCost(messageType: string, content: string): number {
    switch (messageType) {
      case 'text': return 1;
      case 'location': return 3;
      case 'path_share': return 10;
      default: return 1;
    }
  }

  private calculateLocationShareCost(locationData: any): number {
    // Base cost for location sharing
    let cost = 3;
    
    // Add cost based on accuracy (higher accuracy costs more)
    if (locationData.accuracy && locationData.accuracy < 10) {
      cost += 2; // High accuracy location
    }
    
    return cost;
  }

  private extractPatternInsights(pathData: any): any {
    // Extract Christopher Alexander pattern insights from path data
    return {
      patternsObserved: pathData.patterns || [],
      architecturalInsights: pathData.insights || [],
      qualityScore: this.calculatePathQuality(pathData)
    };
  }

  private calculatePathQuality(pathData: any): number {
    const baseScore = 0.5;
    const patternBonus = (pathData.patterns?.length || 0) * 0.1;
    const insightBonus = (pathData.insights?.length || 0) * 0.05;
    return Math.min(1.0, baseScore + patternBonus + insightBonus);
  }

  private generateMockPublicKey(userId: string): string {
    // Generate a mock public key based on userId
    return `pk_${userId.slice(-8)}_${Date.now().toString(36)}`;
  }

  private generateKeyFingerprint(publicKey: string): string {
    // Generate a mock fingerprint for the public key
    return publicKey.slice(-16).toUpperCase();
  }

  private generateMessageHash(content: string, timestamp: string): string {
    // Generate a simple hash for message integrity
    return `hash_${content.length}_${timestamp.slice(-8)}`;
  }

  getConnectionCount(): number {
    return Array.from(this.connectedUsers.values()).filter(user => user.isActive).length;
  }
}

export default CommunicationServer;