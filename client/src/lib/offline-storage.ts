// Enhanced offline storage utilities for Phase 1 implementation

interface OfflineData {
  id: string;
  type: 'location' | 'vote' | 'tracking' | 'activity';
  data: any;
  timestamp: string;
  synced: boolean;
  retries: number;
}

interface CachedData {
  data: any;
  timestamp: number;
  expires: number;
}

class OfflineStorage {
  private readonly OFFLINE_KEY = 'pattern_discovery_offline';
  private readonly CACHE_KEY = 'pattern_discovery_cache';
  private readonly MAX_RETRIES = 3;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Offline queue management
  addToQueue(type: OfflineData['type'], data: any): string {
    const item: OfflineData = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      data,
      timestamp: new Date().toISOString(),
      synced: false,
      retries: 0
    };

    const queue = this.getQueue();
    queue.push(item);
    localStorage.setItem(this.OFFLINE_KEY, JSON.stringify(queue));
    
    return item.id;
  }

  getQueue(): OfflineData[] {
    try {
      return JSON.parse(localStorage.getItem(this.OFFLINE_KEY) || '[]');
    } catch {
      return [];
    }
  }

  markAsSynced(id: string): void {
    const queue = this.getQueue();
    const item = queue.find(item => item.id === id);
    if (item) {
      item.synced = true;
    }
    localStorage.setItem(this.OFFLINE_KEY, JSON.stringify(queue));
  }

  incrementRetries(id: string): void {
    const queue = this.getQueue();
    const item = queue.find(item => item.id === id);
    if (item) {
      item.retries++;
    }
    localStorage.setItem(this.OFFLINE_KEY, JSON.stringify(queue));
  }

  removeFromQueue(id: string): void {
    const queue = this.getQueue().filter(item => item.id !== id);
    localStorage.setItem(this.OFFLINE_KEY, JSON.stringify(queue));
  }

  clearSyncedItems(): void {
    const queue = this.getQueue().filter(item => !item.synced);
    localStorage.setItem(this.OFFLINE_KEY, JSON.stringify(queue));
  }

  getPendingItems(): OfflineData[] {
    return this.getQueue().filter(item => !item.synced && item.retries < this.MAX_RETRIES);
  }

  // Cache management
  setCache(key: string, data: any, customDuration?: number): void {
    const expires = Date.now() + (customDuration || this.CACHE_DURATION);
    const cached: CachedData = {
      data,
      timestamp: Date.now(),
      expires
    };

    try {
      const cache = this.getCache();
      cache[key] = cached;
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
      console.warn('Cache storage failed:', error);
    }
  }

  getCache(): Record<string, CachedData> {
    try {
      return JSON.parse(localStorage.getItem(this.CACHE_KEY) || '{}');
    } catch {
      return {};
    }
  }

  getCachedData(key: string): any | null {
    const cache = this.getCache();
    const cached = cache[key];
    
    if (!cached) return null;
    
    if (Date.now() > cached.expires) {
      this.removeCachedData(key);
      return null;
    }
    
    return cached.data;
  }

  removeCachedData(key: string): void {
    const cache = this.getCache();
    delete cache[key];
    localStorage.setItem(this.CACHE_KEY, JSON.stringify(cache));
  }

  clearExpiredCache(): void {
    const cache = this.getCache();
    const now = Date.now();
    
    Object.keys(cache).forEach(key => {
      if (cache[key].expires <= now) {
        delete cache[key];
      }
    });
    
    localStorage.setItem(this.CACHE_KEY, JSON.stringify(cache));
  }

  // Utility methods
  getStorageSize(): { offline: number; cache: number; total: number } {
    const offlineSize = new Blob([localStorage.getItem(this.OFFLINE_KEY) || '']).size;
    const cacheSize = new Blob([localStorage.getItem(this.CACHE_KEY) || '']).size;
    
    return {
      offline: offlineSize,
      cache: cacheSize,
      total: offlineSize + cacheSize
    };
  }

  clearAll(): void {
    localStorage.removeItem(this.OFFLINE_KEY);
    localStorage.removeItem(this.CACHE_KEY);
  }

  exportData(): { offline: OfflineData[]; cache: Record<string, CachedData> } {
    return {
      offline: this.getQueue(),
      cache: this.getCache()
    };
  }
}

export const offlineStorage = new OfflineStorage();