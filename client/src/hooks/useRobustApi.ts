import { useState, useCallback } from 'react';
import { useOffline } from './useOffline';
import { useErrorBoundary } from './useErrorBoundary';
import { useToast } from '@/hooks/use-toast';

interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: any;
  headers?: Record<string, string>;
  retries?: number;
  timeout?: number;
  cache?: boolean;
}

export function useRobustApi() {
  const [loading, setLoading] = useState(false);
  const { isOnline, addToOfflineQueue } = useOffline();
  const { logError } = useErrorBoundary();
  const { toast } = useToast();

  const makeRequest = useCallback(async (
    url: string, 
    options: ApiRequestOptions = {}
  ) => {
    const {
      method = 'GET',
      body,
      headers = {},
      retries = 3,
      timeout = 10000,
      cache = true
    } = options;

    setLoading(true);

    // Check cache first for GET requests
    const cacheKey = `api_cache_${url}_${JSON.stringify(body || {})}`;
    if (method === 'GET' && cache) {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        const isStale = Date.now() - timestamp > 300000; // 5 minutes
        
        if (!isStale || !isOnline) {
          setLoading(false);
          return { data, fromCache: true };
        }
      }
    }

    // If offline and not a GET request, queue it
    if (!isOnline && method !== 'GET') {
      addToOfflineQueue({ url, method, body, headers });
      setLoading(false);
      
      toast({
        title: "Queued for Sync",
        description: "Your action will be processed when connection returns.",
      });
      
      return { queued: true };
    }

    const attemptRequest = async (attempt: number): Promise<any> => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            ...headers
          },
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        // Cache successful GET requests
        if (method === 'GET' && cache) {
          localStorage.setItem(cacheKey, JSON.stringify({
            data,
            timestamp: Date.now()
          }));
        }

        setLoading(false);
        return { data, success: true };

      } catch (error) {
        console.error(`Request attempt ${attempt} failed:`, error);

        if (attempt < retries) {
          // Exponential backoff
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
          return attemptRequest(attempt + 1);
        }

        // All retries exhausted
        const errorData = logError(error as Error);
        setLoading(false);

        // Return cached data if available for GET requests
        if (method === 'GET' && cache) {
          const cached = localStorage.getItem(cacheKey);
          if (cached) {
            const { data } = JSON.parse(cached);
            toast({
              title: "Using Cached Data",
              description: "Network error - showing last known data.",
            });
            return { data, fromCache: true, error: errorData };
          }
        }

        throw error;
      }
    };

    return attemptRequest(1);
  }, [isOnline, addToOfflineQueue, logError, toast]);

  return {
    makeRequest,
    loading,
    isOnline
  };
}