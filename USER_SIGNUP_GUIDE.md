# Anonymous User Signup System

## How Users Sign Up

The app uses an innovative **device fingerprinting system** that provides anonymous but unique user identification, preventing multiple accounts per device while maintaining complete privacy.

### User Experience Flow

1. **First-Time Access**
   - User opens the app
   - System automatically detects it's a new device
   - User is redirected to guided onboarding (`/onboarding`)

2. **Device Fingerprinting Process**
   - System collects anonymous device characteristics:
     - Screen resolution and color depth
     - Timezone and language settings
     - Platform and hardware capabilities
     - Browser fingerprint (anonymized)
   - Creates unique hash from these characteristics
   - Generates consistent anonymous user ID

3. **Registration Verification**
   - System checks if device is already registered
   - If existing: welcomes back with same anonymous identity
   - If new: creates new registration in database

4. **Anonymous Identity Creation**
   - User receives unique anonymous ID (e.g., `user_device_a1b2c3d4e5f6g7h8`)
   - No personal information required
   - No email, phone, or name collection
   - Complete privacy protection

### Technical Implementation

#### Device Fingerprinting
```typescript
// Collects anonymous device characteristics
- Screen: 1920x1080x24 (width x height x color depth)
- Timezone: America/New_York
- Language: en-US
- Platform: MacIntel
- Hardware concurrency: 8 cores
- Touch support: false
- Pixel ratio: 2.0
```

#### Unique ID Generation
```typescript
// Creates consistent hash from device characteristics
deviceHash = SHA256(deviceCharacteristics)
anonymousID = `user_device_${deviceHash.slice(0,16)}`
```

#### Database Storage
```sql
-- Device registrations table
device_registrations {
  id: serial primary key
  device_id: text unique not null        -- Hashed device fingerprint
  user_id: text unique not null          -- Anonymous user identifier
  device_fingerprint: text not null      -- Encrypted device characteristics
  registered_at: timestamp default now()
  last_seen_at: timestamp default now()
  is_active: boolean default true
}
```

### Security & Privacy Features

#### Prevention of Multiple Accounts
- **One device = One account**: Device fingerprinting ensures same device always gets same identity
- **Anti-spoofing**: Combination of multiple device characteristics makes spoofing difficult
- **Consistent identification**: Same anonymous ID across app sessions

#### Privacy Protection
- **No personal data**: Zero collection of names, emails, phone numbers
- **Encrypted storage**: Device characteristics stored encrypted
- **Anonymous identifiers**: User IDs contain no personal information
- **Local storage**: Device ID cached locally for performance

#### What Users See
- Clean onboarding flow explaining privacy protection
- Their unique anonymous identifier (optional to view)
- Starting token balance (100 tokens)
- Clear explanation of one-device-one-account policy

### API Endpoints

#### Device Registration
```http
POST /api/register-device
{
  "deviceId": "device_a1b2c3d4e5f6g7h8",
  "userId": "user_device_a1b2c3d4e5f6g7h8", 
  "deviceFingerprint": "{\"screen\":\"1920x1080\",\"timezone\":\"America/New_York\",...}"
}
```

#### Device Verification
```http
GET /api/check-device/:deviceId
Response: {
  "exists": true,
  "userId": "user_device_a1b2c3d4e5f6g7h8",
  "isActive": true
}
```

### User Benefits

1. **Complete Privacy**: No personal information required or stored
2. **Instant Access**: No registration forms or verification processes  
3. **Consistent Identity**: Same anonymous identity across sessions
4. **Fair Usage**: One account per device prevents abuse
5. **Immediate Participation**: Start earning tokens and voting immediately

### Onboarding Steps

1. **Welcome Screen**: Introduction to pattern discovery concept
2. **Privacy Explanation**: How anonymous identification works
3. **Token Economy**: Explanation of data-based rewards system
4. **Identity Creation**: Automatic device registration process
5. **Success**: Welcome message with starting token balance

### Fallback Scenarios

- **Device characteristics change**: System gracefully handles minor changes
- **Local storage cleared**: Device re-registration with same fingerprint
- **Multiple browsers**: Each browser treated as separate device (intended behavior)
- **Incognito/private mode**: May create separate identity (privacy-first design)

This system balances user privacy, prevents abuse, and ensures democratic participation in urban planning decisions through location-based voting and pattern discovery.