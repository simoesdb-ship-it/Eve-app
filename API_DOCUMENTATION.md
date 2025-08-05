# Pattern Discovery App - Comprehensive API Documentation

## Overview

This API powers a Bitcoin-powered location sharing protocol with encrypted communication capabilities and Christopher Alexander pattern discovery. The system enables users to share location data, discover architectural patterns, and participate in a token-based data economy.

## Base URL
```
https://your-domain.replit.app/api
```

## Authentication
The API uses session-based anonymous authentication with device fingerprinting. Include `sessionId` in request bodies or query parameters for user identification.

## Rate Limiting
- General API: 100 requests per minute
- Location Creation: 20 requests per minute  
- Voting: 10 requests per minute
- Data uploads: 5 requests per minute

## Data Models

### Core Entities

#### Pattern
```typescript
{
  id: number;
  number: number;
  name: string;
  description: string;
  fullDescription: string;
  category: string;
  keywords: string[];
  iconName: string;
  moodColor: string;
}
```

#### Location
```typescript
{
  id: number;
  latitude: string; // decimal(10,8)
  longitude: string; // decimal(11,8)
  name?: string;
  sessionId: string;
  createdAt: string;
}
```

#### PatternSuggestion
```typescript
{
  id: number;
  locationId: number;
  patternId: number;
  confidence: string;
  mlAlgorithm: string;
  createdAt: string;
}
```

#### Activity
```typescript
{
  id: number;
  type: "vote" | "suggestion" | "visit" | "pattern_suggestion";
  description: string;
  locationId?: number;
  sessionId: string;
  createdAt: string;
}
```

---

## API Endpoints

### 🎯 Pattern Management

#### Get All Patterns
```http
GET /api/patterns
```

**Response**
```json
[
  {
    "id": 1,
    "number": 1,
    "name": "Independent Regions",
    "description": "Wherever possible, work toward the evolution of independent regions.",
    "fullDescription": "...",
    "category": "Regional",
    "keywords": ["regions", "independence", "autonomy"],
    "iconName": "globe",
    "moodColor": "regional"
  }
]
```

#### Get Pattern by ID
```http
GET /api/patterns/:id
```

**Parameters**
- `id` (path): Pattern ID

**Response**
```json
{
  "id": 1,
  "number": 1,
  "name": "Independent Regions",
  "description": "Wherever possible, work toward the evolution of independent regions.",
  "category": "Regional",
  "keywords": ["regions", "independence"],
  "iconName": "globe",
  "moodColor": "regional"
}
```

**Error Responses**
- `404` - Pattern not found

#### Search Patterns
```http
GET /api/patterns/search?q={query}
```

**Query Parameters**
- `q` (required): Search query string

**Response**
```json
[
  {
    "id": 39,
    "name": "Small Public Squares",
    "description": "A town needs public squares...",
    "keywords": ["public", "squares", "gathering"]
  }
]
```

---

### 📍 Location Management

#### Create Location
```http
POST /api/locations
```

**Request Body**
```json
{
  "latitude": "44.98003550",
  "longitude": "-93.28942240",
  "name": "Urban Plaza",
  "sessionId": "user_device_abc123"
}
```

**Response**
```json
{
  "id": 1382,
  "latitude": "44.98003550",
  "longitude": "-93.28942240", 
  "name": "Urban Plaza",
  "sessionId": "user_device_abc123",
  "createdAt": "2025-08-04T17:46:04.036Z"
}
```

**Features**
- Automatically generates pattern suggestions using ML analysis
- Logs activity for the created location
- Rate limited to prevent abuse

#### Get Location Patterns
```http
GET /api/locations/:id/patterns?sessionId={sessionId}
```

**Parameters**
- `id` (path): Location ID
- `sessionId` (query, required): User session ID

**Response**
```json
[
  {
    "id": 39,
    "name": "Small Public Squares",
    "confidence": 0.85,
    "suggestionId": 12345
  }
]
```

#### Get Curated Patterns for Location
```http
GET /api/locations/:locationId/curated-patterns
```

**Parameters**
- `locationId` (path): Location ID

**Response**
```json
[
  {
    "id": 39,
    "number": 61,
    "name": "Small Public Squares",
    "description": "A town needs public squares...",
    "confidence": 0.85,
    "reasoning": "Urban context with gathering spaces detected"
  }
]
```

---

### 💾 Saved Locations

#### Get Saved Locations
```http
GET /api/saved-locations?sessionId={sessionId}&limit={limit}
```

**Query Parameters**
- `sessionId` (optional): User session ID for personal locations
- `userId` (optional): User ID for persistent tracking
- `limit` (optional): Maximum results (default: 20)

**Response**
```json
[
  {
    "id": 70,
    "sessionId": "user_device_abc123",
    "locationName": "Urban Plaza",
    "createdAt": "2025-08-04T17:46:04.036Z"
  }
]
```

#### Create Saved Location
```http
POST /api/saved-locations
```

**Request Body**
```json
{
  "sessionId": "user_device_abc123",
  "locationName": "My Favorite Park",
  "latitude": "44.98003550",
  "longitude": "-93.28942240"
}
```

#### Get Saved Locations by Session
```http
GET /api/saved-locations/:sessionId
```

**Parameters**
- `sessionId` (path): User session ID

#### Delete Saved Location
```http
DELETE /api/saved-locations/:id
```

**Request Body**
```json
{
  "sessionId": "user_device_abc123"
}
```

---

### 🎯 Pattern Assignment

#### Assign Pattern to Saved Location
```http
POST /api/saved-locations/:locationId/patterns
```

**Parameters**
- `locationId` (path): Saved location ID

**Request Body**
```json
{
  "patternId": 39,
  "sessionId": "user_device_abc123"
}
```

**Response**
```json
{
  "id": 22319,
  "locationId": 69,
  "patternId": 39,
  "confidence": "1.0",
  "mlAlgorithm": "manual",
  "createdAt": "2025-08-04T15:11:54.442Z"
}
```

#### Get Patterns for Saved Location
```http
GET /api/saved-locations/:locationId/patterns
```

**Response**
```json
[
  {
    "id": 39,
    "number": 61,
    "name": "Small Public Squares",
    "description": "A town needs public squares...",
    "category": "Public Spaces"
  }
]
```

#### Remove Pattern from Saved Location
```http
DELETE /api/saved-locations/:locationId/patterns/:patternId?sessionId={sessionId}
```

**Parameters**
- `locationId` (path): Saved location ID
- `patternId` (path): Pattern ID to remove
- `sessionId` (query, required): User session ID

---

### 🗳️ Voting System

#### Cast Vote on Pattern Suggestion
```http
POST /api/votes
```

**Request Body**
```json
{
  "suggestionId": 12345,
  "sessionId": "user_device_abc123",
  "voteType": "up",
  "weight": "2.50",
  "locationId": 1382,
  "timeSpentMinutes": 15
}
```

**Response**
```json
{
  "id": 567,
  "suggestionId": 12345,
  "sessionId": "user_device_abc123",
  "voteType": "up",
  "weight": "2.50",
  "isUpdate": false,
  "createdAt": "2025-08-04T17:46:04.036Z"
}
```

**Features**
- Supports vote switching (deletes old vote, creates new one)
- Weight based on time spent at location
- Prevents duplicate votes
- Returns `isUpdate: true` when switching votes

---

### 📊 Activity & Statistics

#### Get Recent Activity
```http
GET /api/activity?sessionId={sessionId}&limit={limit}
```

**Query Parameters**
- `sessionId` (optional): User session ID for personal activity
- `userId` (optional): User ID for persistent tracking
- `limit` (optional): Maximum results (default: 10)

**Response**
```json
[
  {
    "id": 1570,
    "type": "visit",
    "description": "Current Location",
    "locationId": 1380,
    "sessionId": "user_device_abc123",
    "createdAt": "2025-08-04T17:46:04.111Z"
  }
]
```

#### Get User Statistics
```http
GET /api/stats?sessionId={sessionId}
```

**Query Parameters**
- `sessionId` (required): User session ID
- `userId` (optional): User ID for persistent tracking

**Response**
```json
{
  "suggestedPatterns": 2842,
  "votesContributed": 15,
  "offlinePatterns": 23,
  "totalVisits": 45,
  "hoursContributed": 12.5,
  "locationsTracked": 8,
  "votesCast": 15
}
```

---

### 🗺️ Movement Tracking

#### Create Tracking Point
```http
POST /api/tracking
```

**Request Body**
```json
{
  "latitude": "44.98003550",
  "longitude": "-93.28942240",
  "sessionId": "user_device_abc123",
  "metadata": "{\"accuracy\": 15.5, \"speed\": 2.1}"
}
```

**Response**
```json
{
  "id": 789,
  "latitude": "44.98003550",
  "longitude": "-93.28942240",
  "type": "tracking",
  "sessionId": "user_device_abc123",
  "metadata": "{\"accuracy\": 15.5}",
  "createdAt": "2025-08-04T17:46:04.036Z"
}
```

#### Get Tracking Points
```http
GET /api/tracking/:sessionId
```

**Parameters**
- `sessionId` (path): User session ID

**Response**
```json
[
  {
    "id": 789,
    "latitude": "44.98003550",
    "longitude": "-93.28942240",
    "type": "tracking",
    "sessionId": "user_device_abc123",
    "createdAt": "2025-08-04T17:46:04.036Z"
  }
]
```

---

### 🪙 Token Economy

#### Get Token Balance
```http
GET /api/tokens/balance/:sessionId
```

**Parameters**
- `sessionId` (path): User session ID

**Response**
```json
{
  "balance": 150,
  "totalEarned": 200,
  "totalSpent": 50,
  "lastTransaction": "2025-08-04T17:46:04.036Z"
}
```

#### Upload Media for Tokens
```http
POST /api/tokens/upload-media
```

**Request Body**
```json
{
  "sessionId": "user_device_abc123",
  "locationId": 1382,
  "mediaType": "photo",
  "fileName": "urban_plaza.jpg",
  "fileSize": 2048576,
  "mimeType": "image/jpeg",
  "caption": "Beautiful urban plaza with great seating",
  "isPremium": false
}
```

**Response**
```json
{
  "tokensEarned": 10,
  "newBalance": 160,
  "mediaId": "media_abc123",
  "transactionId": 456
}
```

#### Add Comment for Tokens
```http
POST /api/tokens/add-comment
```

**Request Body**
```json
{
  "sessionId": "user_device_abc123",
  "locationId": 1382,
  "content": "This space really embodies the Small Public Squares pattern",
  "commentType": "pattern_analysis",
  "isPremium": false
}
```

**Response**
```json
{
  "tokensEarned": 5,
  "newBalance": 155,
  "commentId": "comment_xyz789",
  "transactionId": 457
}
```

#### Get Transaction History
```http
GET /api/tokens/transactions/:sessionId?limit={limit}
```

**Parameters**
- `sessionId` (path): User session ID
- `limit` (query, optional): Maximum results (default: 20)

**Response**
```json
[
  {
    "id": 456,
    "type": "earn",
    "amount": 10,
    "description": "Media upload reward",
    "locationId": 1382,
    "createdAt": "2025-08-04T17:46:04.036Z"
  }
]
```

---

### 🛒 Data Marketplace

#### Get Available Data Products
```http
GET /api/marketplace/products?category={category}&priceRange={min,max}
```

**Query Parameters**
- `category` (optional): Product category filter
- `priceRange` (optional): Price range "min,max"

**Response**
```json
[
  {
    "id": 123,
    "title": "Urban Pattern Analysis - Downtown Minneapolis",
    "description": "Comprehensive analysis of architectural patterns",
    "category": "spatial_analysis",
    "price": 25,
    "sellerId": "user_device_def456",
    "rating": 4.8,
    "totalSales": 15,
    "createdAt": "2025-08-04T17:46:04.036Z"
  }
]
```

#### Purchase Data Product
```http
POST /api/marketplace/purchase
```

**Request Body**
```json
{
  "productId": 123,
  "buyerId": "user_device_abc123",
  "paymentTokens": 25
}
```

**Response**
```json
{
  "transactionId": 789,
  "productAccess": {
    "downloadUrl": "https://...",
    "accessKey": "encrypted_key_abc123",
    "expiresAt": "2025-08-11T17:46:04.036Z"
  },
  "newBalance": 125
}
```

---

### 🔍 Analysis Services

#### Get Contextual Analysis
```http
GET /api/contextual-analysis?lat={latitude}&lng={longitude}
```

**Query Parameters**
- `lat` (required): Latitude coordinate
- `lng` (required): Longitude coordinate

**Response**
```json
{
  "landUse": "commercial",
  "urbanDensity": "high",
  "buildingTypes": ["mixed_use", "retail"],
  "transportationAccess": "excellent",
  "walkabilityScore": 92,
  "communityFeatures": ["public_transit", "pedestrian_zones"],
  "patternOpportunities": [
    {
      "patternId": 39,
      "patternName": "Small Public Squares",
      "relevanceScore": 0.85,
      "reasoning": "High pedestrian traffic with open spaces"
    }
  ]
}
```

#### Get Location Analysis
```http
GET /api/location-analysis?lat={latitude}&lng={longitude}
```

**Response**
```json
{
  "coordinates": {
    "latitude": 44.980035,
    "longitude": -93.289422
  },
  "address": {
    "street": "123 Main St",
    "city": "Minneapolis",
    "state": "MN",
    "country": "US"
  },
  "demographics": {
    "population": 425000,
    "density": 3000
  },
  "infrastructure": {
    "publicTransit": true,
    "bikeAccessible": true,
    "parkingAvailable": false
  }
}
```

---

### 👥 Community Analysis

#### Get Community Analysis
```http
GET /api/community/analysis
```

**Response**
```json
{
  "totalUsers": 1247,
  "activeToday": 156,
  "locationsDiscovered": 8934,
  "patternsIdentified": 2842,
  "communityEngagement": {
    "votesThisWeek": 234,
    "newLocationsToday": 23,
    "topPatterns": [
      {
        "id": 39,
        "name": "Small Public Squares",
        "occurrences": 156
      }
    ]
  },
  "regionalActivity": {
    "mostActiveRegion": "Minneapolis-St. Paul",
    "newRegionsThisWeek": 3
  }
}
```

---

### 🔧 Performance & Monitoring

#### Get Performance Metrics
```http
GET /api/performance
```

**Response**
```json
{
  "requestsPerMinute": 45,
  "averageResponseTime": 120,
  "errorRate": 0.02,
  "activeConnections": 23,
  "cacheHitRate": 0.87,
  "systemHealth": "healthy"
}
```

#### Get Cache Statistics
```http
GET /api/cache/stats
```

**Response**
```json
{
  "patterns": {
    "hits": 1245,
    "misses": 156,
    "hitRate": 0.889
  },
  "locations": {
    "hits": 892,
    "misses": 234,
    "hitRate": 0.792
  },
  "totalCacheSize": "24.5MB",
  "memoryUsage": 0.65
}
```

---

## WebSocket Communication

### Connection
```javascript
const ws = new WebSocket('wss://your-domain.replit.app/communication');
```

### Message Types

#### Send Encrypted Message
```json
{
  "type": "encrypted_message",
  "senderId": "user_device_abc123",
  "recipientId": "user_device_def456",
  "encryptedContent": "encrypted_base64_content",
  "messageHash": "sha256_hash",
  "tokenCost": 1
}
```

#### Share Location
```json
{
  "type": "location_share",
  "senderId": "user_device_abc123",
  "recipientId": "user_device_def456",
  "locationData": {
    "latitude": 44.980035,
    "longitude": -93.289422,
    "name": "Urban Plaza",
    "patterns": [39, 40, 41]
  },
  "tokenCost": 5
}
```

#### Share Path Data
```json
{
  "type": "path_share",
  "senderId": "user_device_abc123",
  "pathData": {
    "name": "Downtown Walking Route",
    "coordinates": [...],
    "patternInsights": {...},
    "duration": 1800
  },
  "accessType": "token_gated",
  "tokenCost": 10
}
```

---

## Error Handling

### Standard Error Response
```json
{
  "message": "Error description",
  "error": "Detailed error information",
  "code": "ERROR_CODE",
  "timestamp": "2025-08-04T17:46:04.036Z"
}
```

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (missing/invalid session)
- `404` - Not Found
- `429` - Rate Limited
- `500` - Internal Server Error

### Common Error Codes
- `INVALID_SESSION` - Session ID required or invalid
- `RATE_LIMITED` - Too many requests
- `INSUFFICIENT_TOKENS` - Not enough tokens for operation
- `PATTERN_NOT_FOUND` - Requested pattern doesn't exist
- `LOCATION_NOT_FOUND` - Requested location doesn't exist
- `DUPLICATE_VOTE` - User already voted on this suggestion
- `VALIDATION_ERROR` - Request data validation failed

---

## SDK Examples

### JavaScript/TypeScript
```typescript
// Create location with pattern analysis
const createLocation = async (locationData: LocationData) => {
  const response = await fetch('/api/locations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(locationData)
  });
  return response.json();
};

// Vote on pattern suggestion
const voteOnPattern = async (voteData: VoteData) => {
  const response = await fetch('/api/votes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(voteData)
  });
  return response.json();
};
```

### Python
```python
import requests

# Get patterns for location
def get_location_patterns(location_id, session_id):
    url = f"/api/locations/{location_id}/patterns"
    params = {"sessionId": session_id}
    response = requests.get(url, params=params)
    return response.json()

# Purchase data product
def purchase_data_product(product_id, buyer_id, tokens):
    url = "/api/marketplace/purchase"
    data = {
        "productId": product_id,
        "buyerId": buyer_id,
        "paymentTokens": tokens
    }
    response = requests.post(url, json=data)
    return response.json()
```

---

## Changelog

### v2.0.0 (Current)
- Added Bitcoin-powered token economy
- Implemented encrypted peer-to-peer communication
- Enhanced pattern suggestion algorithms
- Added data marketplace functionality
- Improved caching and performance monitoring

### v1.5.0
- Added multiple pattern assignment capability
- Implemented contextual pattern curation
- Enhanced error handling and offline support
- Added comprehensive rate limiting

### v1.0.0
- Initial release with basic pattern discovery
- Anonymous session-based authentication
- Location tracking and analysis
- Community voting system

---

## Support

For API support and questions:
- Check the error response for detailed information
- Review rate limiting guidelines
- Ensure session ID is included in requests
- Verify token balance for paid operations

This API documentation covers the complete Bitcoin-powered location sharing protocol with encrypted communication capabilities. The system enables users to discover architectural patterns, participate in a token economy, and securely share location and movement data.