import { useState, useEffect } from 'react';
import { getUserDisplayName, getUserColor, getUserInitials } from '@/lib/username-generator';
import { getConsistentUserId } from '@/lib/device-fingerprint';

export function UsernameDisplay() {
  const [username, setUsername] = useState<string>('');
  const [userId, setUserId] = useState<string>('');

  useEffect(() => {
    async function loadUsername() {
      try {
        const anonymousUserId = await getConsistentUserId();
        const generatedUsername = getUserDisplayName(anonymousUserId);
        setUserId(anonymousUserId);
        setUsername(generatedUsername);
      } catch (error) {
        console.error('Failed to generate username:', error);
      }
    }
    loadUsername();
  }, []);

  if (!username) return null;

  return (
    <div className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-lg border shadow-sm">
      <div 
        className="w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-bold"
        style={{ backgroundColor: getUserColor(username) }}
      >
        {getUserInitials(username)}
      </div>
      <div>
        <div className="font-semibold text-foreground">{username}</div>
        <div className="text-xs text-muted-foreground font-mono">
          {userId.substring(0, 20)}...
        </div>
      </div>
    </div>
  );
}