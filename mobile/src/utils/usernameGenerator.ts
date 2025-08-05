// Generate fictitious usernames from device characteristics
export const generateUsername = (deviceId: string): string => {
  const adjectives = [
    'Swift', 'Bright', 'Bold', 'Calm', 'Clever', 'Fierce', 'Gentle', 'Noble',
    'Quick', 'Silent', 'Wise', 'Brave', 'Clear', 'Deep', 'Keen', 'Sharp',
    'Smooth', 'Strong', 'Wild', 'Young', 'Ancient', 'Crystal', 'Golden', 'Silver'
  ];

  const nouns = [
    'Falcon', 'Eagle', 'Wolf', 'Bear', 'Fox', 'Lion', 'Tiger', 'Hawk',
    'Raven', 'Owl', 'Deer', 'Storm', 'River', 'Mountain', 'Ocean', 'Forest',
    'Thunder', 'Lightning', 'Wind', 'Star', 'Moon', 'Sun', 'Fire', 'Ice'
  ];

  // Use device ID to generate consistent username
  const adjectiveIndex = deviceId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % adjectives.length;
  const nounIndex = deviceId.split('').reverse().reduce((acc, char) => acc + char.charCodeAt(0), 0) % nouns.length;

  return `${adjectives[adjectiveIndex]} ${nouns[nounIndex]}`;
};