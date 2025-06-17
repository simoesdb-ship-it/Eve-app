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
import { getUserDisplayName } from "@/lib/username-generator";
import { getConsistentUserId } from "@/lib/device-fingerprint";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
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
  Camera
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

export default function DataMarketplace() {
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

  // Fetch token balance
  const { data: tokenBalance } = useQuery({
    queryKey: ['/api/tokens/balance', sessionId],
    queryFn: async () => {
      const response = await fetch(`/api/tokens/balance/${sessionId}`);
      if (!response.ok) throw new Error('Failed to fetch token balance');
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
              <p className="text-xs text-neutral-400">{username || 'Loading...'}</p>
              <h1 className="text-lg font-semibold text-neutral-800">Data Marketplace</h1>
              <p className="text-xs text-neutral-400">Trade location insights & earn tokens</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 bg-primary/10 px-3 py-1 rounded-full">
            <Coins className="w-4 h-4 text-primary" />
            <span className="font-semibold">{tokenBalance?.balance || 0}</span>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-4 pb-24">
        {/* Welcome Section */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Peer-to-Peer Data</h2>
              <p className="text-muted-foreground mb-4">
                Sell your collected location insights to other users and purchase valuable data from the community
              </p>
              <div className="flex justify-center space-x-4">
                <Dialog open={createPackageOpen} onOpenChange={setCreatePackageOpen}>
                  <DialogTrigger asChild>
                    <Button className="flex items-center space-x-2">
                      <Package className="w-4 h-4" />
                      <span>Sell Your Data</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Data Package</DialogTitle>
                      <DialogDescription>
                        Package your collected location data for sale to other users
                      </DialogDescription>
                    </DialogHeader>
                    <CreatePackageForm 
                      onSubmit={(data) => createPackageMutation.mutate(data)}
                      isLoading={createPackageMutation.isPending}
                    />
                  </DialogContent>
                </Dialog>

                <Button variant="outline" className="flex items-center space-x-2">
                  <Gift className="w-4 h-4" />
                  <span>Send Tokens</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="marketplace" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="marketplace">Browse Data</TabsTrigger>
            <TabsTrigger value="purchased">My Purchases</TabsTrigger>
            <TabsTrigger value="transfers">Transfers</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="marketplace" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Available Data Packages</h3>
              <Badge variant="secondary">{packages.length} packages available</Badge>
            </div>

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
                        {pkg.locationName && (
                          <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                            <MapPin className="w-3 h-3" />
                            <span>{pkg.locationName}</span>
                          </div>
                        )}
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
          </TabsContent>

          <TabsContent value="purchased" className="space-y-4">
            <h3 className="text-lg font-semibold">Your Purchased Data</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {purchasedPackages.map((pkg: any) => (
                <Card key={pkg.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center space-x-2">
                      {getDataTypeIcon(pkg.dataType)}
                      <Badge variant="outline">{getDataTypeLabel(pkg.dataType)}</Badge>
                    </div>
                    <CardTitle className="text-lg">{pkg.title}</CardTitle>
                    <CardDescription>From: {pkg.creatorUsername}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="text-sm">
                        <strong>Paid:</strong> {pkg.tokensTransferred} tokens
                      </div>
                      <Button size="sm" variant="outline" className="w-full">
                        <Eye className="w-4 h-4 mr-1" />
                        View Data
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="transfers" className="space-y-4">
            <h3 className="text-lg font-semibold">Token Transfer History</h3>
            <div className="space-y-3">
              {transfers.map((transfer: any) => (
                <Card key={transfer.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
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
                            {transfer.transferType} • {new Date(transfer.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">
                          {transfer.fromSessionId === sessionId ? '-' : '+'}{transfer.amount} tokens
                        </div>
                        {transfer.relatedPackageTitle && (
                          <div className="text-xs text-muted-foreground">
                            {transfer.relatedPackageTitle}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <h3 className="text-lg font-semibold">Marketplace Analytics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <Package className="w-8 h-8 mx-auto mb-2 text-primary" />
                  <div className="text-2xl font-bold">{packages.length}</div>
                  <div className="text-sm text-muted-foreground">Available Packages</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Users className="w-8 h-8 mx-auto mb-2 text-primary" />
                  <div className="text-2xl font-bold">{new Set(packages.map(p => p.creatorUsername)).size}</div>
                  <div className="text-sm text-muted-foreground">Active Sellers</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <TrendingUp className="w-8 h-8 mx-auto mb-2 text-primary" />
                  <div className="text-2xl font-bold">{transfers.length}</div>
                  <div className="text-sm text-muted-foreground">Total Transfers</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Coins className="w-8 h-8 mx-auto mb-2 text-primary" />
                  <div className="text-2xl font-bold">{tokenBalance?.balance || 0}</div>
                  <div className="text-sm text-muted-foreground">Your Balance</div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <BottomNavigation activeTab="discover" />
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
          placeholder="Comprehensive tracking data with movement patterns and density analysis..."
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