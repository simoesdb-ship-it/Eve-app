import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import BottomNavigation from "@/components/bottom-navigation";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Coins, 
  TrendingUp, 
  TrendingDown, 
  Upload, 
  MessageSquare, 
  MapPin,
  Camera,
  Video,
  Eye,
  Clock,
  Gift,
  Wallet
} from "lucide-react";

interface TokenBalance {
  balance: number;
  totalEarned: number;
  totalSpent: number;
}

interface TokenSupply {
  totalSupply: number;
  tokensInCirculation: number;
  currentRewardMultiplier: number;
  lastHalvingAt: number;
  nextHalvingAt: number;
  isCapReached: boolean;
  percentageMinted: number;
  remainingTokens: number;
}

interface TokenTransaction {
  id: number;
  transactionType: 'earn' | 'spend';
  amount: number;
  reason: string;
  relatedContentType?: string;
  relatedContentId?: number;
  createdAt: string;
}

function getSessionId(): string {
  let sessionId = localStorage.getItem('sessionId');
  if (!sessionId) {
    sessionId = 'anon_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    localStorage.setItem('sessionId', sessionId);
  }
  return sessionId;
}

function getTransactionIcon(transaction: TokenTransaction) {
  if (transaction.transactionType === 'earn') {
    switch (transaction.relatedContentType) {
      case 'location': return <MapPin className="w-4 h-4 text-green-600" />;
      case 'photo': return <Camera className="w-4 h-4 text-green-600" />;
      case 'video': return <Video className="w-4 h-4 text-green-600" />;
      case 'comment': case 'recommendation': return <MessageSquare className="w-4 h-4 text-green-600" />;
      default: return <Gift className="w-4 h-4 text-green-600" />;
    }
  } else {
    return <Eye className="w-4 h-4 text-red-600" />;
  }
}

export default function TokenWallet() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const sessionId = getSessionId();

  // Fetch token balance
  const { data: tokenBalance, isLoading: balanceLoading } = useQuery<TokenBalance>({
    queryKey: ['/api/tokens/balance', sessionId],
    queryFn: () => apiRequest('GET', `/api/tokens/balance/${sessionId}`).then(res => res.json()),
  });

  // Fetch transaction history
  const { data: transactions, isLoading: transactionsLoading } = useQuery<TokenTransaction[]>({
    queryKey: ['/api/tokens/transactions', sessionId],
    queryFn: () => apiRequest('GET', `/api/tokens/transactions/${sessionId}`).then(res => res.json()),
  });

  // Fetch global token supply information
  const { data: tokenSupply, isLoading: supplyLoading } = useQuery<TokenSupply>({
    queryKey: ['/api/tokens/supply'],
    queryFn: () => apiRequest('GET', '/api/tokens/supply').then(res => res.json()),
  });

  // Simulate content upload for demo
  const uploadMediaMutation = useMutation({
    mutationFn: async (mediaData: { mediaType: 'photo' | 'video'; fileName: string; caption?: string }) => {
      const response = await apiRequest('POST', '/api/tokens/upload-media', {
        sessionId,
        locationId: 1, // Demo location
        mediaType: mediaData.mediaType,
        fileName: mediaData.fileName,
        fileSize: mediaData.mediaType === 'photo' ? 2500000 : 15000000, // Mock file sizes
        mimeType: mediaData.mediaType === 'photo' ? 'image/jpeg' : 'video/mp4',
        caption: mediaData.caption,
        isPremium: false
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Media Uploaded Successfully",
        description: `You earned ${data.tokensEarned} tokens!`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/tokens/balance', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['/api/tokens/transactions', sessionId] });
    },
    onError: () => {
      toast({
        title: "Upload Failed",
        description: "Failed to upload media. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Simulate comment addition for demo
  const addCommentMutation = useMutation({
    mutationFn: async (commentData: { content: string; commentType: 'recommendation' | 'observation' | 'pattern_analysis' }) => {
      const response = await apiRequest('POST', '/api/tokens/add-comment', {
        sessionId,
        locationId: 1, // Demo location
        content: commentData.content,
        commentType: commentData.commentType,
        isPremium: false
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Comment Added Successfully",
        description: `You earned ${data.tokensEarned} tokens!`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/tokens/balance', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['/api/tokens/transactions', sessionId] });
    },
    onError: () => {
      toast({
        title: "Comment Failed",
        description: "Failed to add comment. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleDemoUpload = (mediaType: 'photo' | 'video') => {
    uploadMediaMutation.mutate({
      mediaType,
      fileName: `demo_${mediaType}_${Date.now()}.${mediaType === 'photo' ? 'jpg' : 'mp4'}`,
      caption: `Demo ${mediaType} showing architectural patterns`
    });
  };

  const handleDemoComment = (commentType: 'recommendation' | 'observation' | 'pattern_analysis') => {
    const sampleComments = {
      recommendation: "This space would benefit from Alexander's Pattern #106 'Positive Outdoor Space' to improve community gathering.",
      observation: "The current layout shows good adherence to Pattern #12 'Community of 7000' with appropriate density.",
      pattern_analysis: "Analysis reveals strong alignment with Pattern #61 'Small Public Squares' in the central area."
    };

    addCommentMutation.mutate({
      content: sampleComments[commentType],
      commentType
    });
  };

  if (balanceLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-6 space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-4">Token Wallet</h1>
            <p className="text-muted-foreground">Loading your token balance...</p>
          </div>
          <div className="animate-pulse space-y-4">
            <div className="h-24 bg-gray-200 rounded-lg"></div>
            <div className="h-48 bg-gray-200 rounded-lg"></div>
          </div>
          <div className="h-20"></div>
        </div>
        <BottomNavigation activeTab="discover" />
      </div>
    );
  }

  const balance = tokenBalance || { balance: 0, totalEarned: 0, totalSpent: 0 };
  const recentTransactions = transactions || [];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2 flex items-center justify-center gap-2">
            <Wallet className="w-8 h-8" />
            Token Wallet
          </h1>
          <p className="text-muted-foreground">
            Earn tokens by contributing data, spend tokens for premium content
          </p>
        </div>

        {/* Balance Overview */}
        <Card className="border-2 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-yellow-600" />
              Current Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-center mb-4">
              {balance.balance} <span className="text-lg text-muted-foreground">tokens</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-green-600">
                  <TrendingUp className="w-4 h-4" />
                  <span className="font-semibold">{balance.totalEarned}</span>
                </div>
                <div className="text-xs text-muted-foreground">Total Earned</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-red-600">
                  <TrendingDown className="w-4 h-4" />
                  <span className="font-semibold">{balance.totalSpent}</span>
                </div>
                <div className="text-xs text-muted-foreground">Total Spent</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bitcoin-like Supply Information */}
        {tokenSupply && (
          <Card className="border-2 border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-800">
                <Coins className="w-5 h-5" />
                Global Token Supply (Bitcoin-like Cap)
              </CardTitle>
              <CardDescription className="text-orange-700">
                Limited supply of 21 million tokens with halving rewards
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="font-semibold text-orange-800">Total Minted</div>
                  <div className="text-lg">{tokenSupply.totalSupply.toLocaleString()}</div>
                </div>
                <div>
                  <div className="font-semibold text-orange-800">Remaining</div>
                  <div className="text-lg">{tokenSupply.remainingTokens.toLocaleString()}</div>
                </div>
                <div>
                  <div className="font-semibold text-orange-800">Progress</div>
                  <div className="text-lg">{tokenSupply.percentageMinted.toFixed(4)}%</div>
                </div>
                <div>
                  <div className="font-semibold text-orange-800">Reward Rate</div>
                  <div className="text-lg">{(tokenSupply.currentRewardMultiplier * 100).toFixed(2)}%</div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-orange-700">
                  <span>Minting Progress</span>
                  <span>{tokenSupply.totalSupply.toLocaleString()} / 21,000,000</span>
                </div>
                <Progress value={tokenSupply.percentageMinted} className="h-2" />
              </div>

              {!tokenSupply.isCapReached && (
                <div className="text-xs text-orange-600 bg-orange-100 p-2 rounded">
                  ⚡ Next halving at {tokenSupply.nextHalvingAt.toLocaleString()} tokens
                </div>
              )}

              {tokenSupply.isCapReached && (
                <div className="text-xs text-red-600 bg-red-100 p-2 rounded font-semibold">
                  🚫 TOKEN CAP REACHED - No more tokens can be minted
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="earn" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="earn">Earn Tokens</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="rates">Token Rates</TabsTrigger>
          </TabsList>

          <TabsContent value="earn" className="space-y-4">
            <Alert>
              <Gift className="h-4 w-4" />
              <AlertTitle>Earn Tokens</AlertTitle>
              <AlertDescription>
                Contribute content to earn tokens. Try the demo actions below!
              </AlertDescription>
            </Alert>

            <div className="grid gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Upload className="w-5 h-5" />
                    Upload Media
                  </CardTitle>
                  <CardDescription>
                    Share photos and videos of architectural patterns
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    onClick={() => handleDemoUpload('photo')}
                    disabled={uploadMediaMutation.isPending}
                    className="w-full"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Upload Photo (+15 tokens)
                  </Button>
                  <Button 
                    onClick={() => handleDemoUpload('video')}
                    disabled={uploadMediaMutation.isPending}
                    className="w-full"
                    variant="outline"
                  >
                    <Video className="w-4 h-4 mr-2" />
                    Upload Video (+25 tokens)
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    Add Comments
                  </CardTitle>
                  <CardDescription>
                    Share insights and recommendations
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    onClick={() => handleDemoComment('recommendation')}
                    disabled={addCommentMutation.isPending}
                    className="w-full"
                  >
                    Add Recommendation (+12 tokens)
                  </Button>
                  <Button 
                    onClick={() => handleDemoComment('observation')}
                    disabled={addCommentMutation.isPending}
                    className="w-full"
                    variant="outline"
                  >
                    Add Observation (+8 tokens)
                  </Button>
                  <Button 
                    onClick={() => handleDemoComment('pattern_analysis')}
                    disabled={addCommentMutation.isPending}
                    className="w-full"
                    variant="outline"
                  >
                    Add Pattern Analysis (+8 tokens)
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            {transactionsLoading ? (
              <div className="animate-pulse space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-200 rounded-lg"></div>
                ))}
              </div>
            ) : recentTransactions.length > 0 ? (
              <div className="space-y-3">
                {recentTransactions.map((transaction) => (
                  <Card key={transaction.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getTransactionIcon(transaction)}
                          <div>
                            <div className="font-medium">{transaction.reason}</div>
                            <div className="text-sm text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(transaction.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <Badge variant={transaction.transactionType === 'earn' ? 'default' : 'destructive'}>
                          {transaction.transactionType === 'earn' ? '+' : '-'}{Math.abs(transaction.amount)}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertTitle>No Transactions Yet</AlertTitle>
                <AlertDescription>
                  Start contributing content to see your transaction history here.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="rates" className="space-y-4">
            <div className="grid gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Token Earning Rates</CardTitle>
                  <CardDescription>
                    How many tokens you earn for different contributions
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        <span>Save Location</span>
                      </div>
                      <Badge>10 tokens</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Camera className="w-4 h-4" />
                        <span>Upload Photo</span>
                      </div>
                      <Badge>15 tokens</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Video className="w-4 h-4" />
                        <span>Upload Video</span>
                      </div>
                      <Badge>25 tokens</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        <span>Add Comment</span>
                      </div>
                      <Badge>8 tokens</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        <span>Add Recommendation</span>
                      </div>
                      <Badge>12 tokens</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Premium Content Costs</CardTitle>
                  <CardDescription>
                    Tokens required to view premium content
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Camera className="w-4 h-4" />
                        <span>Premium Photo</span>
                      </div>
                      <Badge variant="destructive">3 tokens</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Video className="w-4 h-4" />
                        <span>Premium Video</span>
                      </div>
                      <Badge variant="destructive">5 tokens</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        <span>Premium Analysis</span>
                      </div>
                      <Badge variant="destructive">2 tokens</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Add space for bottom navigation */}
        <div className="h-20"></div>
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation activeTab="discover" />
    </div>
  );
}