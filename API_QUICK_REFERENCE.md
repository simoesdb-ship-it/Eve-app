# API Quick Reference Guide

## Authentication
- Use `sessionId` in requests for user identification
- Device fingerprinting provides anonymous persistent identity

## Core Endpoints

### Patterns
```bash
GET /api/patterns              # Get all patterns
GET /api/patterns/:id          # Get pattern by ID
GET /api/patterns/search?q=... # Search patterns
```

### Locations
```bash
POST /api/locations            # Create location + get suggestions
GET /api/locations/:id/patterns?sessionId=...  # Get location patterns
GET /api/locations/:id/curated-patterns        # Get curated patterns
```

### Saved Locations
```bash
GET /api/saved-locations?sessionId=...          # Get saved locations
POST /api/saved-locations                       # Create saved location
GET /api/saved-locations/:sessionId             # Get by session
DELETE /api/saved-locations/:id                 # Delete saved location
```

### Pattern Assignment
```bash
POST /api/saved-locations/:id/patterns          # Assign pattern
GET /api/saved-locations/:id/patterns           # Get assigned patterns
DELETE /api/saved-locations/:id/patterns/:pid   # Remove pattern assignment
```

### Activity & Stats
```bash
GET /api/activity?sessionId=...&limit=10        # Get user activity
GET /api/stats?sessionId=...                    # Get user statistics
```

### Voting
```bash
POST /api/votes                                 # Vote on pattern suggestion
```

### Movement Tracking
```bash
POST /api/tracking                              # Create tracking point
GET /api/tracking/:sessionId                    # Get tracking points
```

### Token Economy
```bash
GET /api/tokens/balance/:sessionId              # Get token balance
POST /api/tokens/upload-media                   # Upload media for tokens
POST /api/tokens/add-comment                    # Add comment for tokens
GET /api/tokens/transactions/:sessionId         # Get transaction history
GET /api/tokens/supply                          # Get global token supply
```

### Analysis Services
```bash
GET /api/location-analysis?lat=...&lng=...      # Get location details
GET /api/contextual-analysis?lat=...&lng=...    # Get urban context analysis
GET /api/community/analysis                     # Get community statistics
```

### Performance
```bash
GET /api/performance                            # Get performance metrics
GET /api/cache/stats                            # Get cache statistics
```

## Rate Limits
- General API: 100 req/min
- Location Creation: 20 req/min
- Voting: 10 req/min
- Data uploads: 5 req/min

## WebSocket
```javascript
// Connect to communication server
const ws = new WebSocket('wss://domain/communication');

// Message types: encrypted_message, location_share, path_share
```

## Common Patterns

### Create Location with Pattern Analysis
```javascript
const response = await fetch('/api/locations', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    latitude: "44.98003550",
    longitude: "-93.28942240",
    name: "Urban Plaza",
    sessionId: "user_device_abc123"
  })
});
```

### Assign Multiple Patterns to Location
```javascript
const patterns = [39, 40, 41]; // Pattern IDs
for (const patternId of patterns) {
  await fetch(`/api/saved-locations/${locationId}/patterns`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ patternId, sessionId })
  });
}
```

### Get User Activity Feed
```javascript
const activity = await fetch(
  `/api/activity?sessionId=${sessionId}&limit=20`
).then(r => r.json());
```

## Error Codes
- `400` - Bad Request (missing/invalid data)
- `401` - Unauthorized (missing session)
- `404` - Not Found
- `429` - Rate Limited
- `500` - Server Error

## Session Management
```javascript
// Generate session ID from device fingerprint
const sessionId = `user_device_${deviceFingerprint}`;

// Include in all requests
const response = await fetch('/api/endpoint', {
  method: 'POST',
  body: JSON.stringify({ ...data, sessionId })
});
```