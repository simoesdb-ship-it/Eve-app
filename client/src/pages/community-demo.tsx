import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { UsernameDisplay } from "@/components/username-display";
import BottomNavigation from "@/components/bottom-navigation";
import { 
  MessageSquare, 
  ThumbsUp, 
  ThumbsDown, 
  MapPin, 
  Users, 
  Clock,
  Eye,
  ArrowLeft 
} from "lucide-react";
import { Link } from "wouter";

interface CommunityPost {
  id: number;
  username: string;
  avatar: string;
  content: string;
  location: string;
  timestamp: string;
  upvotes: number;
  downvotes: number;
  userVote: 'up' | 'down' | null;
  patternTag?: string;
}

const mockPosts: CommunityPost[] = [
  {
    id: 1,
    username: "Swift Falcon",
    avatar: "SF",
    content: "This plaza perfectly demonstrates Alexander's Pattern #61 'Small Public Squares'. The intimate scale encourages natural gathering while maintaining human proportion.",
    location: "Downtown Plaza",
    timestamp: "2 hours ago",
    upvotes: 12,
    downvotes: 1,
    userVote: null,
    patternTag: "Pattern #61"
  },
  {
    id: 2,
    username: "Calm River",
    avatar: "CR",
    content: "The building heights here violate Pattern #21 'Four-Story Limit'. The towering structures create wind tunnels and disconnect people from the street level.",
    location: "Financial District",
    timestamp: "4 hours ago",
    upvotes: 8,
    downvotes: 3,
    userVote: 'up',
    patternTag: "Pattern #21"
  },
  {
    id: 3,
    username: "Bright Sage",
    avatar: "BS",
    content: "Love how this neighborhood implements Pattern #37 'House Cluster'. The arrangement creates natural community while preserving privacy.",
    location: "Residential Area",
    timestamp: "6 hours ago",
    upvotes: 15,
    downvotes: 0,
    userVote: null,
    patternTag: "Pattern #37"
  }
];

export default function CommunityDemo() {
  const [posts, setPosts] = useState(mockPosts);
  const [newPost, setNewPost] = useState("");
  const [currentLocation] = useState("Current Location");

  const handleVote = (postId: number, voteType: 'up' | 'down') => {
    setPosts(prevPosts => 
      prevPosts.map(post => {
        if (post.id === postId) {
          const wasUpvoted = post.userVote === 'up';
          const wasDownvoted = post.userVote === 'down';
          
          let newUpvotes = post.upvotes;
          let newDownvotes = post.downvotes;
          let newUserVote: 'up' | 'down' | null = voteType;
          
          // Remove previous vote
          if (wasUpvoted) newUpvotes--;
          if (wasDownvoted) newDownvotes--;
          
          // If clicking same vote, cancel it
          if (post.userVote === voteType) {
            newUserVote = null;
          } else {
            // Add new vote
            if (voteType === 'up') newUpvotes++;
            if (voteType === 'down') newDownvotes++;
          }
          
          return {
            ...post,
            upvotes: newUpvotes,
            downvotes: newDownvotes,
            userVote: newUserVote
          };
        }
        return post;
      })
    );
  };

  const handlePostSubmit = () => {
    if (newPost.trim()) {
      const newPostData: CommunityPost = {
        id: Date.now(),
        username: "Your Username", // This would be generated from device
        avatar: "YU",
        content: newPost,
        location: currentLocation,
        timestamp: "Just now",
        upvotes: 0,
        downvotes: 0,
        userVote: null
      };
      
      setPosts([newPostData, ...posts]);
      setNewPost("");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Link href="/discover">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              <h1 className="text-xl font-bold">Community Discussion</h1>
            </div>
            <Badge variant="secondary" className="flex items-center space-x-1">
              <Users className="w-3 h-3" />
              <span>47 active</span>
            </Badge>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-4 space-y-4">
        {/* Post Creation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MessageSquare className="w-5 h-5" />
              <span>Share Your Observation</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-3">
              <UsernameDisplay />
              <div className="flex items-center text-sm text-gray-600 space-x-2">
                <MapPin className="w-4 h-4" />
                <span>{currentLocation}</span>
              </div>
            </div>
            
            <Textarea
              placeholder="Share your thoughts about this location's alignment with Alexander's patterns..."
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              className="min-h-[100px]"
            />
            
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-500">
                Earn tokens for valuable community insights
              </div>
              <Button 
                onClick={handlePostSubmit}
                disabled={!newPost.trim()}
              >
                Post Observation
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Community Posts */}
        <div className="space-y-4">
          {posts.map((post) => (
            <Card key={post.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="space-y-3">
                  {/* Post Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                        {post.avatar}
                      </div>
                      <div>
                        <div className="font-semibold text-sm">{post.username}</div>
                        <div className="flex items-center text-xs text-gray-500 space-x-2">
                          <MapPin className="w-3 h-3" />
                          <span>{post.location}</span>
                          <Clock className="w-3 h-3 ml-2" />
                          <span>{post.timestamp}</span>
                        </div>
                      </div>
                    </div>
                    
                    {post.patternTag && (
                      <Badge variant="outline" className="text-xs">
                        {post.patternTag}
                      </Badge>
                    )}
                  </div>

                  {/* Post Content */}
                  <p className="text-sm leading-relaxed">{post.content}</p>

                  {/* Post Actions */}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center space-x-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleVote(post.id, 'up')}
                        className={`space-x-1 ${post.userVote === 'up' ? 'text-green-600' : ''}`}
                      >
                        <ThumbsUp className="w-4 h-4" />
                        <span>{post.upvotes}</span>
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleVote(post.id, 'down')}
                        className={`space-x-1 ${post.userVote === 'down' ? 'text-red-600' : ''}`}
                      >
                        <ThumbsDown className="w-4 h-4" />
                        <span>{post.downvotes}</span>
                      </Button>
                    </div>
                    
                    <div className="flex items-center space-x-1 text-xs text-gray-500">
                      <Eye className="w-3 h-3" />
                      <span>{Math.floor(Math.random() * 50) + 10} views</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Load More */}
        <div className="text-center py-4">
          <Button variant="outline">Load More Discussions</Button>
        </div>
      </div>

      <BottomNavigation activeTab="discover" />
    </div>
  );
}