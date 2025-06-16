// Device fingerprinting for anonymous but unique user identification
// Prevents multiple accounts per device while maintaining privacy

interface DeviceInfo {
  screen: string;
  timezone: string;
  language: string;
  platform: string;
  userAgent: string;
  colorDepth: number;
  pixelRatio: number;
  touchSupport: boolean;
  hardwareConcurrency: number;
  maxTouchPoints: number;
  cookieEnabled: boolean;
}

// Generate a consistent hash from device characteristics
async function generateDeviceHash(info: DeviceInfo): Promise<string> {
  const dataString = JSON.stringify(info);
  const encoder = new TextEncoder();
  const data = encoder.encode(dataString);
  
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex.slice(0, 16); // Use first 16 characters for reasonable length
}

// Collect device information for fingerprinting
function collectDeviceInfo(): DeviceInfo {
  const screen = `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const language = navigator.language || 'unknown';
  const platform = navigator.platform || 'unknown';
  const userAgent = navigator.userAgent.slice(0, 100); // Truncate for privacy
  const colorDepth = window.screen.colorDepth;
  const pixelRatio = window.devicePixelRatio || 1;
  const touchSupport = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const hardwareConcurrency = navigator.hardwareConcurrency || 0;
  const maxTouchPoints = navigator.maxTouchPoints || 0;
  const cookieEnabled = navigator.cookieEnabled;

  return {
    screen,
    timezone,
    language,
    platform,
    userAgent,
    colorDepth,
    pixelRatio,
    touchSupport,
    hardwareConcurrency,
    maxTouchPoints,
    cookieEnabled
  };
}

// Generate or retrieve existing device ID
export async function getDeviceId(): Promise<string> {
  const STORAGE_KEY = 'anon_device_id';
  
  // Check if we already have a stored device ID
  const existingId = localStorage.getItem(STORAGE_KEY);
  if (existingId) {
    return existingId;
  }

  // Generate new device ID based on device characteristics
  const deviceInfo = collectDeviceInfo();
  const deviceHash = await generateDeviceHash(deviceInfo);
  const deviceId = `device_${deviceHash}`;
  
  // Store the ID for future use
  localStorage.setItem(STORAGE_KEY, deviceId);
  
  return deviceId;
}

// Generate session ID that includes device fingerprint
export async function generateAnonymousUserId(): Promise<string> {
  const deviceId = await getDeviceId();
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substr(2, 6);
  
  return `${deviceId}_${timestamp}_${randomSuffix}`;
}

// Check if user has an existing account (same device)
export async function hasExistingAccount(): Promise<boolean> {
  const deviceId = await getDeviceId();
  
  try {
    const response = await fetch(`/api/check-device/${deviceId}`);
    if (response.ok) {
      const data = await response.json();
      return data.exists;
    }
  } catch (error) {
    console.warn('Could not check for existing account:', error);
  }
  
  return false;
}

// Get consistent user ID for this device
export async function getConsistentUserId(): Promise<string> {
  const STORAGE_KEY = 'anon_user_id';
  
  // Check if we already have a stored user ID
  const existingUserId = localStorage.getItem(STORAGE_KEY);
  if (existingUserId) {
    return existingUserId;
  }

  // Generate new user ID based on device
  const deviceId = await getDeviceId();
  const userId = `user_${deviceId}`;
  
  // Store the user ID
  localStorage.setItem(STORAGE_KEY, userId);
  
  return userId;
}