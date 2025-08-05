# Pattern Discovery Mobile App

A React Native mobile application for discovering Christopher Alexander's architectural patterns in the real world through a Bitcoin-powered location sharing protocol.

## Features

### 🗺️ Location-Based Pattern Discovery
- GPS tracking with high accuracy location services
- Real-time pattern suggestions using AI analysis
- Community-driven pattern validation and voting
- Interactive maps showing nearby pattern locations

### 🔒 Encrypted Communication
- Bitcoin-powered peer-to-peer messaging
- Location-based user connections
- Token-gated premium messaging features
- End-to-end encryption for secure communications

### 🪙 Token Economy
- Earn tokens for discovering and validating patterns
- Spend tokens on premium features and data insights
- Bitcoin-like deflationary token model
- Data marketplace for trading spatial insights

### 👤 Anonymous Identity System
- Device fingerprinting for consistent anonymous users
- Fictitious usernames for privacy protection
- Session-based authentication without personal data
- Voting power based on time spent at locations

## Technical Architecture

### Frontend (React Native)
- **Navigation**: React Navigation with bottom tab navigation
- **State Management**: React Context API with local storage persistence
- **Maps**: React Native Maps for interactive location visualization
- **Permissions**: React Native Permissions for location and camera access
- **Storage**: AsyncStorage for offline data persistence
- **WebSocket**: Real-time communication for messaging features

### Backend Integration
- **API Services**: RESTful API integration with existing Node.js backend
- **WebSocket**: Real-time communication server at `/communication` endpoint
- **Location Tracking**: Background location services with battery optimization
- **Pattern Analysis**: Integration with ML-powered pattern suggestion engine

### Key Services

#### AuthService
- Anonymous user authentication using device fingerprinting
- Username generation and session management
- Token balance tracking and updates

#### LocationTrackingService
- GPS location tracking with accuracy validation
- Background location monitoring
- Movement pattern analysis and time tracking
- Location clustering for meaningful data points

#### WebSocketService
- Real-time messaging with nearby users
- Encrypted message transmission
- Location sharing and pattern insights
- Token-gated communication features

## Installation & Setup

### Prerequisites
- Node.js 18+
- React Native CLI
- Android Studio (for Android development)
- Xcode (for iOS development)

### Install Dependencies
```bash
cd mobile
npm install
```

### iOS Setup
```bash
cd ios
pod install
```

### Android Setup
Ensure Android SDK and build tools are properly configured.

### Run the App
```bash
# iOS
npm run ios

# Android
npm run android

# Start Metro bundler
npm start
```

## Key Features Implementation

### 1. Pattern Discovery
- Real-time location tracking with GPS
- AI-powered pattern suggestions based on location context
- Community voting system for pattern validation
- Interactive pattern assignment to locations

### 2. Communication System
- WebSocket-based real-time messaging
- Location-based user discovery and connections
- Multiple message types: encrypted messages, location sharing, pattern insights
- Token costs for premium communication features

### 3. Token Economy
- Earn tokens through pattern discovery and community contributions
- Token balance tracking and transaction history
- Integration with Bitcoin-powered backend economy
- Data marketplace for trading insights

### 4. User Experience
- Clean, modern mobile-first design
- Intuitive bottom tab navigation
- Real-time updates and live data
- Offline support with data synchronization

## Backend Connection

The mobile app connects to the existing Node.js backend:
- **Development**: `http://localhost:5000/api`
- **Production**: `https://your-app-domain.replit.app/api`
- **WebSocket**: `/communication` endpoint for real-time messaging

## Privacy & Security

- Anonymous authentication using device fingerprinting
- No personal data collection or storage
- Encrypted messaging with multiple security levels
- Location data stored securely with user control

## Contributing

The mobile app is designed to work seamlessly with the existing web application backend, sharing the same:
- Database schema and APIs
- Authentication system
- Pattern analysis engine
- Token economy
- WebSocket communication protocol

This ensures a consistent experience across web and mobile platforms while providing native mobile performance and features.