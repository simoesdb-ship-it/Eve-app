import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import BottomNavigation from "@/components/bottom-navigation";
import { UsernameDisplay } from "@/components/username-display";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getUserDisplayName } from "@/lib/username-generator";
import { getConsistentUserId } from "@/lib/device-fingerprint";
import { 
  Wallet,
  ShoppingCart, 
  Package, 
  Coins, 
  Users, 
  TrendingUp, 
  MapPin,
  Star,
  Eye,
  ArrowUpRight,
  ArrowDownLeft,
  Gift,
  Database,
  BarChart3,
  Clock,
  Camera,
  Send,
  History
} from "lucide-react";

function getSessionId(): string {
  const stored = localStorage.getItem('session_id');
  if (stored) return stored;
  
  const newSessionId = `anon_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`;
  localStorage.setItem('session_id', newSessionId);
  return newSessionId;
}

interface DataPackage {
  id: number;
  title: string;
  description: string;
  dataType: string;
  priceTokens: number;
  totalSales: number;
  rating: string;
  creatorUsername: string;
  locationName?: string;
  createdAt: string;
}

export default function EconomyPage() {
  const [sessionId] = useState(getSessionId());
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createPackageOpen, setCreatePackageOpen] = useState(false);
  const [transferTokensOpen, setTransferTokensOpen] = useState(false);
  const [username, setUsername] = useState<string>('');

  // Load username
  useEffect(() => {
    async function loadUsername() {
      try {
        const userId = await getConsistentUserId();
        const displayName = getUserDisplayName(userId);
        setUsername(displayName);
      } catch (error) {
        console.error('Failed to generate username:', error);
        setUsername('Anonymous');
      }
    }
    loadUsername();
  }, []);

  // Fetch token balance
  const { data: tokenBalance } = useQuery({
    queryKey: ['/api/tokens/balance', sessionId],
    queryFn: async () => {
      const response = await fetch(`/api/tokens/balance/${sessionId}`);
      if (!response.ok) throw new Error('Failed to fetch token balance');
      return response.json();
    }
  });

  // Fetch token supply info
  const { data: tokenSupply } = useQuery({
    queryKey: ['/api/tokens/supply'],
    queryFn: async () => {
      const response = await fetch('/api/tokens/supply');
      if (!response.ok) throw new Error('Failed to fetch token supply');
      return response.json();
    }
  });

  // Fetch transaction history
  const { data: transactions = [] } = useQuery({
    queryKey: ['/api/tokens/transactions', sessionId],
    queryFn: async () => {
      const response = await fetch(`/api/tokens/transactions/${sessionId}`);
      if (!response.ok) throw new Error('Failed to fetch transactions');
      return response.json();
    }
  });

  // Fetch available data packages
  const { data: packages = [], isLoading: packagesLoading } = useQuery({
    queryKey: ['/api/marketplace/packages', sessionId],
    queryFn: async () => {
      const response = await fetch(`/api/marketplace/packages?sessionId=${sessionId}`);
      if (!response.ok) throw new Error('Failed to fetch packages');
      return response.json();
    }
  });

  // Fetch purchased packages
  const { data: purchasedPackages = [] } = useQuery({
    queryKey: ['/api/marketplace/purchased', sessionId],
    queryFn: async () => {
      const response = await fetch(`/api/marketplace/purchased?sessionId=${sessionId}`);
      if (!response.ok) throw new Error('Failed to fetch purchased packages');
      return response.json();
    }
  });

  // Fetch transfer history
  const { data: transfers = [] } = useQuery({
    queryKey: ['/api/marketplace/transfers', sessionId],
    queryFn: async () => {
      const response = await fetch(`/api/marketplace/transfers?sessionId=${sessionId}`);
      if (!response.ok) throw new Error('Failed to fetch transfer history');
      return response.json();
    }
  });

  // Purchase package mutation
  const purchaseMutation = useMutation({
    mutationFn: async (packageId: number) => {
      const response = await apiRequest('POST', '/api/marketplace/purchase', {
        buyerSessionId: sessionId,
        packageId
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Purchase Successful!",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/marketplace/purchased'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tokens/balance'] });
      queryClient.invalidateQueries({ queryKey: ['/api/marketplace/transfers'] });
    },
    onError: (error: any) => {
      toast({
        title: "Purchase Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Create package mutation
  const createPackageMutation = useMutation({
    mutationFn: async (packageData: {
      title: string;
      description: string;
      dataType: string;
      priceTokens: number;
    }) => {
      const response = await apiRequest('POST', '/api/marketplace/create-package', {
        sessionId,
        ...packageData
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Data Package Created!",
        description: "Your data is now available for purchase by other users.",
      });
      setCreatePackageOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/marketplace/packages'] });
    },
    onError: () => {
      toast({
        title: "Creation Failed",
        description: "Failed to create data package. Please try again.",
        variant: "destructive",
      });
    }
  });

  const getDataTypeIcon = (dataType: string) => {
    switch (dataType) {
      case 'spatial_analysis': return <MapPin className="w-4 h-4" />;
      case 'pattern_insights': return <BarChart3 className="w-4 h-4" />;
      case 'time_tracking': return <Clock className="w-4 h-4" />;
      case 'media_bundle': return <Camera className="w-4 h-4" />;
      default: return <Database className="w-4 h-4" />;
    }
  };

  const getDataTypeLabel = (dataType: string) => {
    switch (dataType) {
      case 'spatial_analysis': return 'Spatial Analysis';
      case 'pattern_insights': return 'Pattern Insights';
      case 'time_tracking': return 'Time Tracking';
      case 'media_bundle': return 'Media Bundle';
      default: return 'Data Package';
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-neutral-50">
      {/* Status Bar */}
      <div className="safe-area-top bg-primary text-white px-4 py-1 text-sm">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-secondary rounded-full animate-pulse"></div>
          <span>{username || 'Loading...'}</span>
        </div>
      </div>

      {/* App Header */}
      <header className="bg-transparent px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">E</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-neutral-800">Economy</h1>
              <p className="text-xs text-neutral-400">Token Wallet & Data Marketplace</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 bg-primary/10 px-3 py-1 rounded-full">
            <Coins className="w-4 h-4 text-primary" />
            <span className="font-semibold">{tokenBalance?.balance || 0}</span>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-20">
        <div className="max-w-4xl mx-auto p-4">
        <Tabs defaultValue="wallet" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="wallet" className="flex items-center space-x-2">
              <Wallet className="w-4 h-4" />
              <span>Wallet</span>
            </TabsTrigger>
            <TabsTrigger value="marketplace" className="flex items-center space-x-2">
              <ShoppingCart className="w-4 h-4" />
              <span>Marketplace</span>
            </TabsTrigger>
          </TabsList>

          {/* WALLET TAB */}
          <TabsContent value="wallet" className="space-y-4">
            {/* Token Balance Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Wallet className="w-5 h-5" />
                  <span>Token Balance</span>
                </CardTitle>
                <CardDescription>Your earned tokens from location data contributions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-6">
                  <div className="text-4xl font-bold text-primary mb-2">
                    {tokenBalance?.balance || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Available Tokens</div>
                </div>
                
                {/* Token Economy Explanation */}
                <div className="bg-gray-50 p-4 rounded-lg text-sm space-y-2">
                  <div className="font-medium">How You Earn Tokens:</div>
                  <div className="space-y-1 text-muted-foreground">
                    <div>• +5 tokens for visiting new locations</div>
                    <div>• +3 tokens for pattern voting at locations</div>
                    <div>• +10 tokens for saving detailed location analysis</div>
                    <div>• +15 tokens for sharing valuable route insights</div>
                    <div>• Bonus tokens for selling data to other users</div>
                  </div>
                  <div className="font-medium mt-3">What You Can Do:</div>
                  <div className="space-y-1 text-muted-foreground">
                    <div>• Buy location insights from other users</div>
                    <div>• Send tokens as gifts to community members</div>
                    <div>• Access premium pattern analysis features</div>
                    <div>• Unlock detailed architectural data reports</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mt-6">
                  <Button variant="outline" className="flex items-center space-x-2">
                    <Send className="w-4 h-4" />
                    <span>Send Tokens</span>
                  </Button>
                  <Button variant="outline" className="flex items-center space-x-2">
                    <History className="w-4 h-4" />
                    <span>History</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Token Economy Stats */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold">{tokenSupply?.tokensInCirculation || 0}</div>
                  <div className="text-sm text-muted-foreground">In Circulation</div>
                  <div className="text-xs text-muted-foreground mt-1">Community-earned tokens</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold">21M</div>
                  <div className="text-sm text-muted-foreground">Max Supply</div>
                  <div className="text-xs text-muted-foreground mt-1">Bitcoin-like scarcity model</div>
                </CardContent>
              </Card>
            </div>

            {/* Economy Explanation */}
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-start space-x-2">
                  <Coins className="w-5 h-5 text-green-600 mt-0.5" />
                  <div className="text-sm">
                    <div className="font-medium text-green-800 mb-1">Bitcoin-Inspired Token Economy</div>
                    <div className="text-green-700">
                      Our token system mimics Bitcoin's scarcity model with a 21 million token cap. 
                      As more users join, tokens become more valuable. Early contributors earn more tokens 
                      through a "halving" system that reduces rewards over time, encouraging quality data collection.
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Transactions */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {transactions.slice(0, 5).map((tx: any, index: number) => (
                    <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <TrendingUp className="w-4 h-4 text-green-600" />
                        </div>
                        <div>
                          <div className="font-medium">{tx.transactionType}</div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(tx.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-green-600">+{tx.amount}</div>
                      </div>
                    </div>
                  ))}
                  {transactions.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No transactions yet. Start exploring locations to earn tokens!
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* MARKETPLACE TAB */}
          <TabsContent value="marketplace" className="space-y-4">
            {/* Marketplace Header */}
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <h2 className="text-2xl font-bold mb-2">Data Marketplace</h2>
                  <p className="text-muted-foreground mb-4">
                    Buy and sell location insights with other users
                  </p>
                  <div className="flex justify-center space-x-4">
                    <Dialog open={createPackageOpen} onOpenChange={setCreatePackageOpen}>
                      <DialogTrigger asChild>
                        <Button className="flex items-center space-x-2">
                          <Package className="w-4 h-4" />
                          <span>Sell Data</span>
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Create Data Package</DialogTitle>
                          <DialogDescription>
                            Package your collected location data for sale
                          </DialogDescription>
                        </DialogHeader>
                        <CreatePackageForm 
                          onSubmit={(data) => createPackageMutation.mutate(data)}
                          isLoading={createPackageMutation.isPending}
                        />
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Available Packages */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Available Data</h3>
                <Badge variant="secondary">{packages.length} packages</Badge>
              </div>

              {/* Data Type Explanations */}
              <Card className="bg-blue-50 border-blue-200">
                <CardHeader>
                  <CardTitle className="text-base flex items-center space-x-2">
                    <Database className="w-4 h-4" />
                    <span>What Data Does This App Collect?</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="flex items-start space-x-2">
                      <MapPin className="w-4 h-4 text-blue-600 mt-0.5" />
                      <div>
                        <div className="font-medium">Spatial Analysis</div>
                        <div className="text-muted-foreground">GPS location data, building layouts, neighborhood patterns, and urban design analysis based on Christopher Alexander's architectural principles.</div>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-2">
                      <BarChart3 className="w-4 h-4 text-green-600 mt-0.5" />
                      <div>
                        <div className="font-medium">Pattern Insights</div>
                        <div className="text-muted-foreground">Community voting data on how well real locations match the 253 architectural patterns, including walkability and livability scores.</div>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-2">
                      <Clock className="w-4 h-4 text-purple-600 mt-0.5" />
                      <div>
                        <div className="font-medium">Time Tracking</div>
                        <div className="text-muted-foreground">How long people spend at different locations, movement patterns, and activity clustering data that reveals community usage patterns.</div>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-2">
                      <Camera className="w-4 h-4 text-orange-600 mt-0.5" />
                      <div>
                        <div className="font-medium">Media Bundle</div>
                        <div className="text-muted-foreground">Photos, videos, and visual documentation of architectural features that help train pattern recognition algorithms.</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white p-3 rounded-lg border border-blue-200">
                    <div className="text-sm">
                      <div className="font-medium mb-1">How It Works:</div>
                      <div className="text-muted-foreground">As you explore locations, the app automatically tracks your GPS coordinates, analyzes architectural patterns, and lets you vote on how well each place follows good design principles. This creates valuable insights that other users can purchase with tokens.</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {packagesLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <Card key={i} className="animate-pulse">
                      <CardContent className="p-4">
                        <div className="h-4 bg-gray-200 rounded mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded mb-4"></div>
                        <div className="h-8 bg-gray-200 rounded"></div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : packages.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Database className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Data Packages Yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Start exploring locations to collect valuable data, then package it for sale to other users.
                    </p>
                    <Dialog open={createPackageOpen} onOpenChange={setCreatePackageOpen}>
                      <DialogTrigger asChild>
                        <Button>
                          <Package className="w-4 h-4 mr-2" />
                          Create First Package
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Create Data Package</DialogTitle>
                          <DialogDescription>
                            Package your collected location data for sale
                          </DialogDescription>
                        </DialogHeader>
                        <CreatePackageForm 
                          onSubmit={(data) => createPackageMutation.mutate(data)}
                          isLoading={createPackageMutation.isPending}
                        />
                      </DialogContent>
                    </Dialog>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {packages.map((pkg: DataPackage) => (
                    <Card key={pkg.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-2">
                            {getDataTypeIcon(pkg.dataType)}
                            <Badge variant="outline">{getDataTypeLabel(pkg.dataType)}</Badge>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Star className="w-3 h-3 text-yellow-500" />
                            <span className="text-xs">{pkg.rating}</span>
                          </div>
                        </div>
                        <CardTitle className="text-lg">{pkg.title}</CardTitle>
                        <CardDescription>{pkg.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-sm">
                            <span>By: {pkg.creatorUsername}</span>
                            <span>{pkg.totalSales} sales</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-1">
                              <Coins className="w-4 h-4 text-primary" />
                              <span className="font-semibold">{pkg.priceTokens} tokens</span>
                            </div>
                            <Button 
                              size="sm"
                              onClick={() => purchaseMutation.mutate(pkg.id)}
                              disabled={purchaseMutation.isPending}
                            >
                              Purchase
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Transfer History */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Transfers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {transfers.slice(0, 5).map((transfer: any) => (
                    <div key={transfer.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                      <div className="flex items-center space-x-3">
                        {transfer.fromSessionId === sessionId ? (
                          <ArrowUpRight className="w-4 h-4 text-red-500" />
                        ) : (
                          <ArrowDownLeft className="w-4 h-4 text-green-500" />
                        )}
                        <div>
                          <div className="font-medium">
                            {transfer.fromSessionId === sessionId ? 'Sent to' : 'Received from'} {
                              transfer.fromSessionId === sessionId ? transfer.toUsername : transfer.fromUsername
                            }
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {transfer.transferType}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">
                          {transfer.fromSessionId === sessionId ? '-' : '+'}{transfer.amount} tokens
                        </div>
                      </div>
                    </div>
                  ))}
                  {transfers.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No transfers yet
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        </div>
      </div>

      <BottomNavigation activeTab="economy" />
    </div>
  );
}

function CreatePackageForm({ onSubmit, isLoading }: { 
  onSubmit: (data: any) => void; 
  isLoading: boolean; 
}) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dataType: '',
    priceTokens: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      priceTokens: parseInt(formData.priceTokens)
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="title">Package Title</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
          placeholder="Detailed spatial analysis of downtown area"
          required
        />
      </div>
      
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Comprehensive tracking data with movement patterns..."
          required
        />
      </div>
      
      <div>
        <Label htmlFor="dataType">Data Type</Label>
        <Select 
          value={formData.dataType} 
          onValueChange={(value) => setFormData(prev => ({ ...prev, dataType: value }))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select data type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="spatial_analysis">Spatial Analysis</SelectItem>
            <SelectItem value="pattern_insights">Pattern Insights</SelectItem>
            <SelectItem value="time_tracking">Time Tracking</SelectItem>
            <SelectItem value="media_bundle">Media Bundle</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div>
        <Label htmlFor="price">Price (Tokens)</Label>
        <Input
          id="price"
          type="number"
          value={formData.priceTokens}
          onChange={(e) => setFormData(prev => ({ ...prev, priceTokens: e.target.value }))}
          placeholder="50"
          min="1"
          required
        />
      </div>
      
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? 'Creating...' : 'Create Data Package'}
      </Button>
    </form>
  );
}