// API service for communicating with the backend
const API_BASE_URL = 'https://106a07ad-ee14-4ed6-86d0-008170eb451f-00-1wec7c9yjava4.janeway.replit.dev/api';

export interface Location {
  id: number;
  latitude: string;
  longitude: string;
  name?: string;
  placeName?: string;
  createdAt: string;
  patterns?: Pattern[];
}

export interface Pattern {
  id: number;
  number: number;
  name: string;
  description: string;
  votes: number;
  confidence: number;
}

export interface ActivityItem {
  id: number;
  type: 'pattern_found' | 'location_saved' | 'vote_cast' | 'tokens_earned';
  description: string;
  timestamp: string;
  details?: any;
}

export interface TokenTransaction {
  id: string;
  type: 'earned' | 'spent';
  amount: number;
  description: string;
  timestamp: string;
}

class ApiService {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  // Location endpoints
  async getNearbyLocations(latitude: number, longitude: number, radius: number = 1000): Promise<Location[]> {
    return this.request<Location[]>(`/locations/nearby?lat=${latitude}&lng=${longitude}&radius=${radius}`);
  }

  async createLocation(data: {
    latitude: number;
    longitude: number;
    name?: string;
    placeName?: string;
    sessionId: string;
  }): Promise<Location> {
    return this.request<Location>('/locations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getLocationPatterns(locationId: number): Promise<Pattern[]> {
    return this.request<Pattern[]>(`/locations/${locationId}/patterns`);
  }

  // Pattern endpoints
  async getPatternSuggestions(locationId: number): Promise<Pattern[]> {
    return this.request<Pattern[]>(`/patterns/suggestions/${locationId}`);
  }

  async voteOnPattern(data: {
    locationId: number;
    patternId: number;
    vote: 'up' | 'down';
    sessionId: string;
  }): Promise<{ success: boolean }> {
    return this.request(`/patterns/vote`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async assignPatternToLocation(data: {
    locationId: number;
    patternId: number;
    sessionId: string;
  }): Promise<{ success: boolean }> {
    return this.request(`/patterns/assign`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Activity endpoints
  async getUserActivity(sessionId: string, limit: number = 50): Promise<ActivityItem[]> {
    return this.request<ActivityItem[]>(`/activity/${sessionId}?limit=${limit}`);
  }

  // Stats endpoints
  async getStats(): Promise<{
    suggestedPatterns: number;
    votesContributed: number;
    offlineLocations: number;
    hoursContributed: number;
    locationsTracked: number;
    patternsFound: number;
    votesCast: number;
  }> {
    return this.request('/stats');
  }

  // Token economy endpoints
  async getTokenBalance(sessionId: string): Promise<{
    earned: number;
    spent: number;
    balance: number;
  }> {
    return this.request<any>(`/tokens/balance/${sessionId}`);
  }

  async getTokenTransactions(sessionId: string): Promise<TokenTransaction[]> {
    return this.request<TokenTransaction[]>(`/tokens/transactions/${sessionId}`);
  }

  // Tracking endpoints
  async getTrackingData(sessionId: string): Promise<{
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: number;
  }[]> {
    return this.request(`/tracking/${sessionId}`);
  }

  async submitTrackingPoint(data: {
    sessionId: string;
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: number;
  }): Promise<{ success: boolean }> {
    return this.request('/tracking', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

export const apiService = new ApiService();