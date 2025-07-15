// Generate unique two-word fictitious usernames for anonymous users

const adjectives = [
  "Wandering", "Silent", "Bright", "Swift", "Gentle", "Bold", "Wise", "Calm", "Sharp", "Noble",
  "Quiet", "Fierce", "Ancient", "Modern", "Clever", "Strong", "Quick", "Deep", "High", "Free",
  "Wild", "Pure", "Dark", "Light", "Warm", "Cool", "Fast", "Slow", "Rich", "Simple",
  "Grand", "Small", "Tall", "Wide", "Thin", "Thick", "Young", "Old", "New", "Fresh",
  "Dry", "Wet", "Hot", "Cold", "Soft", "Hard", "Rough", "Smooth", "Round", "Square",
  "Long", "Short", "Heavy", "Light", "Dense", "Sparse", "Tight", "Loose", "Near", "Far",
  "Open", "Closed", "Full", "Empty", "Clear", "Cloudy", "Sunny", "Shady", "Steep", "Flat",
  "Curved", "Straight", "Twisted", "Bent", "Sharp", "Dull", "Pointed", "Blunt", "Fine", "Coarse",
  "Elegant", "Rustic", "Urban", "Rural", "Coastal", "Mountain", "Valley", "River", "Forest", "Desert",
  "Arctic", "Tropical", "Northern", "Southern", "Eastern", "Western", "Central", "Remote", "Local", "Global"
];

const nouns = [
  "Explorer", "Traveler", "Walker", "Runner", "Climber", "Builder", "Maker", "Creator", "Designer", "Planner",
  "Thinker", "Dreamer", "Seeker", "Finder", "Helper", "Guide", "Leader", "Teacher", "Student", "Artist",
  "Writer", "Reader", "Speaker", "Listener", "Observer", "Watcher", "Guardian", "Keeper", "Collector", "Hunter",
  "Gatherer", "Farmer", "Fisher", "Sailor", "Pilot", "Driver", "Rider", "Dancer", "Singer", "Player",
  "Worker", "Trader", "Merchant", "Visitor", "Guest", "Host", "Friend", "Neighbor", "Citizen", "Resident",
  "Nomad", "Pioneer", "Settler", "Founder", "Inventor", "Discoverer", "Researcher", "Scholar", "Expert", "Master",
  "Apprentice", "Student", "Pupil", "Mentor", "Coach", "Trainer", "Healer", "Doctor", "Nurse", "Caregiver",
  "Engineer", "Architect", "Designer", "Artist", "Sculptor", "Painter", "Musician", "Composer", "Poet", "Author",
  "Navigator", "Cartographer", "Surveyor", "Inspector", "Analyst", "Consultant", "Advisor", "Counselor", "Mediator", "Judge",
  "Ambassador", "Diplomat", "Messenger", "Herald", "Reporter", "Journalist", "Broadcaster", "Publisher", "Editor", "Curator"
];

// Generate a consistent username based on a seed (like device ID)
export function generateUsername(seed: string): string {
  // Simple hash function to convert seed to numbers
  let hash1 = 0;
  let hash2 = 0;
  
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash1 = ((hash1 << 5) - hash1) + char;
    hash1 = hash1 & hash1; // Convert to 32-bit integer
    
    hash2 = ((hash2 << 3) - hash2) + char + i;
    hash2 = hash2 & hash2; // Convert to 32-bit integer
  }
  
  // Ensure positive indices
  const adjectiveIndex = Math.abs(hash1) % adjectives.length;
  const nounIndex = Math.abs(hash2) % nouns.length;
  
  return `${adjectives[adjectiveIndex]} ${nouns[nounIndex]}`;
}

// Generate display name from anonymous user ID
export function getUserDisplayName(userId: string): string {
  // Extract the hash part from user ID (e.g., "user_device_abc123" -> "abc123")
  const hashPart = userId.split('_').pop() || userId;
  return generateUsername(hashPart);
}

// Get initials from username for avatar display
export function getUserInitials(username: string): string {
  const words = username.split(' ');
  return words.map(word => word.charAt(0)).join('').toUpperCase();
}

// Generate a unique color for the user based on their username
export function getUserColor(username: string): string {
  const colors = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
    '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16',
    '#06B6D4', '#EAB308', '#DC2626', '#059669', '#7C3AED',
    '#DB2777', '#0D9488', '#EA580C', '#4F46E5', '#65A30D'
  ];
  
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = ((hash << 5) - hash) + username.charCodeAt(i);
    hash = hash & hash;
  }
  
  return colors[Math.abs(hash) % colors.length];
}