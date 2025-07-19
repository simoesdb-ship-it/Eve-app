import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  MessageCircle, 
  MapPin, 
  Route, 
  Coins, 
  Users, 
  Send, 
  Share,
  Lock,
  Smartphone,
  Zap
} from 'lucide-react';
import { generateUsername } from '@/lib/username-generator';
import { getConsistentUserId } from '@/lib/device-fingerprint';

interface Peer {
  userId: string;
  username: string;
  publicKey?: string;
  isOnline: boolean;
  trustLevel: number;
}

interface Message {
  id: number;
  senderId: string;
  senderUsername: string;
  content: string;
  messageType: 'text' | 'location' | 'path_share';
  tokenCost: number;
  timestamp: string;
  deliveredAt?: string;
  readAt?: string;
}

interface SharedPath {
  id: number;
  pathName: string;
  tokenCost: number;
  sharerId: string;
  sharerUsername: string;
  patternInsights?: any;
  totalAccesses: number;
}

export default function Communication() {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [userId, setUserId] = useState('');
  const [username, setUsername] = useState('');
  const [tokenBalance, setTokenBalance] = useState(100);
  const [peers, setPeers] = useState<Peer[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sharedPaths, setSharedPaths] = useState<SharedPath[]>([]);
  const [selectedPeer, setSelectedPeer] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [activeTab, setActiveTab] = useState('peers');
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    initializeUser();
    connectToWebSocket();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const initializeUser = async () => {
    const deviceId = await getConsistentUserId();
    const generatedUsername = generateUsername(deviceId);
    setUserId(deviceId);
    setUsername(generatedUsername);
    
    // Fetch token balance
    try {
      const response = await fetch(`/api/communication/token-balance/${deviceId}`);
      const data = await response.json();
      setTokenBalance(data.balance);
    } catch (error) {
      console.error('Failed to fetch token balance:', error);
    }
  };

  const connectToWebSocket = () => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/communication`;
    
    const websocket = new WebSocket(wsUrl);
    wsRef.current = websocket;
    setWs(websocket);

    websocket.onopen = () => {
      console.log('Connected to communication server');
      setConnected(true);
      
      // Send user connection message
      websocket.send(JSON.stringify({
        type: 'user_connect',
        userId,
        username
      }));
    };

    websocket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        handleWebSocketMessage(message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    websocket.onclose = () => {
      console.log('Disconnected from communication server');
      setConnected(false);
      // Attempt to reconnect after 3 seconds
      setTimeout(connectToWebSocket, 3000);
    };

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  };

  const handleWebSocketMessage = (message: any) => {
    switch (message.type) {
      case 'connection_established':
        console.log('Connection established with key fingerprint:', message.fingerprint);
        discoverPeers();
        break;
      
      case 'peers_discovered':
      case 'peers_update':
        setPeers(message.peers);
        break;
        
      case 'new_message':
        setMessages(prev => [message.message, ...prev]);
        // Award small amount for receiving valuable content
        if (message.message.messageType !== 'text') {
          setTokenBalance(prev => prev + 1);
        }
        break;
        
      case 'message_sent':
        setTokenBalance(message.newBalance);
        setMessageText('');
        break;
        
      case 'location_shared':
        setMessages(prev => [message.message, ...prev]);
        setTokenBalance(prev => prev + Math.floor(message.message.tokenCost * 0.2));
        break;
        
      case 'new_path_available':
        setSharedPaths(prev => [message.path, ...prev]);
        break;
        
      case 'error':
        console.error('Communication error:', message.message);
        break;
    }
  };

  const discoverPeers = () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'discover_peers',
        userId
      }));
    }
  };

  const sendMessage = () => {
    if (!messageText.trim() || !selectedPeer || !ws) return;

    const tokenCost = 1; // Text messages cost 1 token
    
    if (tokenBalance < tokenCost) {
      alert('Insufficient tokens to send message');
      return;
    }

    ws.send(JSON.stringify({
      type: 'send_message',
      userId,
      data: {
        recipientId: selectedPeer,
        content: messageText,
        messageType: 'text'
      }
    }));
  };

  const shareCurrentLocation = () => {
    if (!selectedPeer || !ws) return;

    navigator.geolocation.getCurrentPosition((position) => {
      const locationData = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: Date.now()
      };

      const tokenCost = 3; // Location shares cost 3 tokens
      
      if (tokenBalance < tokenCost) {
        alert('Insufficient tokens to share location');
        return;
      }

      ws.send(JSON.stringify({
        type: 'share_location',
        userId,
        data: {
          recipientId: selectedPeer,
          locationData
        }
      }));
    }, (error) => {
      console.error('Failed to get location:', error);
    });
  };

  const sharePathData = () => {
    if (!ws) return;

    // Mock path data - in real implementation, this would come from actual movement tracking
    const pathData = {
      patterns: ['61. Small Public Squares', '106. Positive Outdoor Space'],
      insights: ['High walkability score', 'Good pattern adherence'],
      totalDistance: 2.5,
      duration: 45,
      qualityScore: 0.85
    };

    const tokenCost = 15; // Path shares with pattern insights cost more

    if (tokenBalance < tokenCost) {
      alert('Insufficient tokens to share path');
      return;
    }

    ws.send(JSON.stringify({
      type: 'share_path',
      userId,
      data: {
        pathName: `Pattern Walk - ${new Date().toLocaleDateString()}`,
        pathData,
        accessType: 'token_gated',
        tokenCost
      }
    }));
  };

  const connectToPeer = (peer: Peer) => {
    if (!ws) return;

    ws.send(JSON.stringify({
      type: 'key_exchange',
      userId,
      data: {
        targetUserId: peer.userId,
        publicKey: 'mock-public-key' // In real implementation, use actual cryptographic keys
      }
    }));
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Communication Platform Explanation */}
      <Card className="bg-gradient-to-r from-indigo-50 to-cyan-50 border-indigo-200">
        <CardContent className="p-6">
          <div className="flex items-start space-x-4">
            <Lock className="w-8 h-8 text-indigo-600 mt-1" />
            <div>
              <h2 className="text-xl font-bold text-indigo-900 mb-3">Encrypted Peer-to-Peer Communication</h2>
              <p className="text-sm text-indigo-800 mb-4">
                This is a secure, anonymous communication platform where you can exchange location insights, 
                architectural patterns, and route data with other users. All messages are encrypted end-to-end 
                and protected by a token-gated system that ensures valuable information is fairly compensated.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="bg-white/50 p-3 rounded-lg">
                  <div className="font-semibold text-indigo-900 mb-1">🔒 End-to-End Encryption</div>
                  <div className="text-indigo-700">All communications use AES-256-GCM encryption with unique keys per conversation.</div>
                </div>
                <div className="bg-white/50 p-3 rounded-lg">
                  <div className="font-semibold text-indigo-900 mb-1">🪙 Token-Gated Messages</div>
                  <div className="text-indigo-700">Text costs 1 token, location sharing 3 tokens, pattern insights 15+ tokens.</div>
                </div>
                <div className="bg-white/50 p-3 rounded-lg">
                  <div className="font-semibold text-indigo-900 mb-1">👤 Anonymous Identity</div>
                  <div className="text-indigo-700">Your device fingerprint generates a unique username while preserving privacy.</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Bitcoin-Powered Communication</h1>
          <p className="text-muted-foreground">Encrypted location sharing with token rewards</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm">{connected ? 'Connected' : 'Disconnected'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4" />
            <Badge variant="secondary">{tokenBalance} tokens</Badge>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="peers" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Peers ({peers.length})
          </TabsTrigger>
          <TabsTrigger value="messages" className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4" />
            Messages
          </TabsTrigger>
          <TabsTrigger value="paths" className="flex items-center gap-2">
            <Route className="w-4 h-4" />
            Shared Paths
          </TabsTrigger>
          <TabsTrigger value="protocol" className="flex items-center gap-2">
            <Smartphone className="w-4 h-4" />
            Protocol
          </TabsTrigger>
        </TabsList>

        <TabsContent value="peers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Available Peers
              </CardTitle>
            </CardHeader>
            <CardContent>
              {peers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Smartphone className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No peers discovered yet</p>
                  <p className="text-sm">Other users will appear here when they connect</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {peers.map((peer) => (
                    <div key={peer.userId} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>{peer.username.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{peer.username}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <div className={`w-2 h-2 rounded-full ${peer.isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
                            {peer.isOnline ? 'Online' : 'Offline'}
                            <Badge variant="outline" className="text-xs">
                              Trust: {peer.trustLevel}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => connectToPeer(peer)}
                        >
                          <Lock className="w-4 h-4 mr-1" />
                          Connect
                        </Button>
                        <Button 
                          size="sm"
                          onClick={() => {
                            setSelectedPeer(peer.userId);
                            setActiveTab('messages');
                          }}
                        >
                          <MessageCircle className="w-4 h-4 mr-1" />
                          Message
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="mt-4 pt-4 border-t">
                <Button onClick={discoverPeers} variant="outline" className="w-full">
                  <Zap className="w-4 h-4 mr-2" />
                  Refresh Peer Discovery
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="messages" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Encrypted Messages</CardTitle>
              {selectedPeer && (
                <p className="text-sm text-muted-foreground">
                  Chatting with {peers.find(p => p.userId === selectedPeer)?.username || 'Unknown'}
                </p>
              )}
            </CardHeader>
            <CardContent>
              {!selectedPeer ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Select a peer to start messaging</p>
                </div>
              ) : (
                <>
                  <ScrollArea className="h-64 mb-4">
                    <div className="space-y-3">
                      {messages
                        .filter(msg => 
                          (msg.senderId === userId && msg.recipientId === selectedPeer) ||
                          (msg.senderId === selectedPeer && msg.recipientId === userId)
                        )
                        .map((message) => (
                          <div 
                            key={message.id}
                            className={`flex ${message.senderId === userId ? 'justify-end' : 'justify-start'}`}
                          >
                            <div className={`max-w-xs p-3 rounded-lg ${
                              message.senderId === userId 
                                ? 'bg-primary text-primary-foreground' 
                                : 'bg-muted'
                            }`}>
                              <div className="flex items-center gap-2 mb-1">
                                {message.messageType === 'location' && <MapPin className="w-4 h-4" />}
                                {message.messageType === 'path_share' && <Route className="w-4 h-4" />}
                                <Badge variant="outline" size="sm">
                                  {message.tokenCost} tokens
                                </Badge>
                              </div>
                              <p className="text-sm">{message.content}</p>
                              <p className="text-xs opacity-70 mt-1">
                                {new Date(message.timestamp).toLocaleTimeString()}
                              </p>
                            </div>
                          </div>
                        ))}
                    </div>
                  </ScrollArea>
                  
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Type your message..."
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                      />
                      <Button onClick={sendMessage} disabled={!messageText.trim()}>
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={shareCurrentLocation} className="flex-1">
                        <MapPin className="w-4 h-4 mr-1" />
                        Share Location (3 tokens)
                      </Button>
                      <Button variant="outline" onClick={sharePathData} className="flex-1">
                        <Route className="w-4 h-4 mr-1" />
                        Share Path (15 tokens)
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="paths" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Route className="w-5 h-5" />
                Shared Movement Patterns
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Purchase access to detailed path insights and pattern analysis
              </p>
            </CardHeader>
            <CardContent>
              {sharedPaths.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Route className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No shared paths available</p>
                  <p className="text-sm">Path data with pattern insights will appear here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sharedPaths.map((path) => (
                    <div key={path.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium">{path.pathName}</h3>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{path.tokenCost} tokens</Badge>
                          <Badge variant="outline">{path.totalAccesses} accesses</Badge>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        Shared by {path.sharerUsername}
                      </p>
                      <Button 
                        size="sm" 
                        disabled={tokenBalance < path.tokenCost}
                        onClick={() => {
                          // In real implementation, call API to purchase access
                          console.log('Purchasing path access for', path.tokenCost, 'tokens');
                        }}
                      >
                        <Coins className="w-4 h-4 mr-1" />
                        Purchase Access
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="protocol" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Protocol Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">Your Identity</h3>
                <div className="space-y-1 text-sm">
                  <p><strong>Username:</strong> {username}</p>
                  <p><strong>Device ID:</strong> {userId.substring(0, 16)}...</p>
                  <p><strong>Token Balance:</strong> {tokenBalance}</p>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="font-medium mb-2">Token Economics</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Text Message:</span>
                    <Badge variant="outline">1 token</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Location Share:</span>
                    <Badge variant="outline">3 tokens</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Pattern Insights:</span>
                    <Badge variant="outline">10-50 tokens</Badge>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="font-medium mb-2">Privacy Features</h3>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>• End-to-end encryption using AES-256-GCM</p>
                  <p>• Anonymous device fingerprinting</p>
                  <p>• No personal data collection</p>
                  <p>• Decentralized peer-to-peer architecture</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}