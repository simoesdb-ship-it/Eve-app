import { useOffline } from '@/hooks/useOffline';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Wifi, WifiOff, Clock, RefreshCw } from 'lucide-react';
import { useState } from 'react';

export function OfflineIndicator() {
  const { isOnline, queueLength, processOfflineQueue, clearOfflineQueue } = useOffline();
  const [isExpanded, setIsExpanded] = useState(false);

  if (isOnline && queueLength === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-20 right-4 z-50">
      <Card 
        className={`transition-all duration-300 ${isExpanded ? 'w-72' : 'w-auto'}`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <CardContent className="p-3">
          <div className="flex items-center space-x-2">
            {isOnline ? (
              <Wifi className="w-4 h-4 text-green-600" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-600" />
            )}
            
            <span className="text-sm font-medium">
              {isOnline ? 'Online' : 'Offline'}
            </span>
            
            {queueLength > 0 && (
              <Badge variant="secondary" className="text-xs">
                <Clock className="w-3 h-3 mr-1" />
                {queueLength}
              </Badge>
            )}
          </div>

          {isExpanded && (
            <div className="mt-3 space-y-2">
              <p className="text-xs text-gray-600">
                {isOnline 
                  ? `${queueLength} actions waiting to sync`
                  : 'Working offline - changes will sync when online'
                }
              </p>
              
              {queueLength > 0 && (
                <div className="flex space-x-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="text-xs h-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      processOfflineQueue();
                    }}
                    disabled={!isOnline}
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Sync
                  </Button>
                  
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="text-xs h-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearOfflineQueue();
                    }}
                  >
                    Clear
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}