import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

export function useOffline() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineQueue, setOfflineQueue] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast({
        title: "Connection Restored",
        description: "You're back online. Syncing data...",
      });
      processOfflineQueue();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: "Connection Lost",
        description: "Working offline. Data will sync when connection returns.",
        variant: "destructive",
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [toast]);

  const addToOfflineQueue = (request: any) => {
    const queueItem = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      ...request
    };
    
    setOfflineQueue(prev => [...prev, queueItem]);
    
    // Store in localStorage for persistence
    const existingQueue = JSON.parse(localStorage.getItem('offline_queue') || '[]');
    localStorage.setItem('offline_queue', JSON.stringify([...existingQueue, queueItem]));
  };

  const processOfflineQueue = async () => {
    const queue = JSON.parse(localStorage.getItem('offline_queue') || '[]');
    
    if (queue.length === 0) return;

    let successCount = 0;
    const failedItems = [];

    for (const item of queue) {
      try {
        const response = await fetch(item.url, {
          method: item.method || 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...item.headers
          },
          body: item.body ? JSON.stringify(item.body) : undefined
        });

        if (response.ok) {
          successCount++;
        } else {
          failedItems.push(item);
        }
      } catch (error) {
        failedItems.push(item);
      }
    }

    // Update localStorage with failed items only
    localStorage.setItem('offline_queue', JSON.stringify(failedItems));
    setOfflineQueue(failedItems);

    if (successCount > 0) {
      toast({
        title: "Data Synced",
        description: `Successfully synced ${successCount} offline actions.`,
      });
    }

    if (failedItems.length > 0) {
      toast({
        title: "Sync Issues",
        description: `${failedItems.length} items still pending sync.`,
        variant: "destructive",
      });
    }
  };

  const clearOfflineQueue = () => {
    setOfflineQueue([]);
    localStorage.removeItem('offline_queue');
  };

  return {
    isOnline,
    offlineQueue,
    addToOfflineQueue,
    processOfflineQueue,
    clearOfflineQueue,
    queueLength: offlineQueue.length
  };
}