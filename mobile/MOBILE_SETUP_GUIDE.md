# React Native Mobile App Setup Guide

## Overview
Your Pattern Discovery app now includes a complete React Native mobile application located in the `/mobile` directory. This provides native iOS and Android apps with all the features from your web application plus mobile-specific enhancements.

## What's Included

### 📱 Complete Mobile App Structure
- **5-Tab Navigation**: Discover, Patterns, Activity, Communication, Economy
- **Native Features**: GPS tracking, push notifications, background location services
- **Offline Support**: Data persistence with AsyncStorage
- **Real-time Communication**: WebSocket integration for peer-to-peer messaging

### 🔧 Core Services
- **AuthService**: Anonymous authentication using device fingerprinting
- **LocationTrackingService**: High-accuracy GPS with background monitoring
- **WebSocketService**: Real-time encrypted messaging
- **ApiService**: Full backend integration

### 🎨 Mobile-Optimized UI
- Material Design icons and components
- Responsive layouts for phones and tablets
- Native iOS and Android styling
- Pull-to-refresh and loading states

## Quick Start (Development)

### 1. Install React Native Dependencies
The mobile app uses your existing Node.js project. The React Native dependencies are defined in `/mobile/package.json`.

```bash
cd mobile
npm install
```

### 2. Platform-Specific Setup

#### iOS Setup
```bash
cd ios
pod install  # Install iOS dependencies
```

#### Android Setup
- Ensure Android Studio is installed
- Set up Android SDK (API level 31+)
- Create a virtual device or connect a physical device

### 3. Start Development Servers

#### Start your backend server (from project root):
```bash
npm run dev
```
This starts your Express server on `http://localhost:5000`

#### Start React Native Metro bundler (from mobile directory):
```bash
cd mobile
npm start
```

#### Run on devices:
```bash
# iOS (from mobile directory)
npm run ios

# Android (from mobile directory)  
npm run android
```

## App Architecture

### 🗂️ Directory Structure
```
mobile/
├── src/
│   ├── services/          # Core services (Auth, Location, WebSocket, API)
│   ├── screens/           # Main app screens
│   ├── utils/             # Utility functions
│   └── App.tsx           # Main app component
├── android/              # Android configuration
├── ios/                  # iOS configuration
└── package.json          # React Native dependencies
```

### 🔄 Data Flow
1. **Authentication**: Device fingerprinting creates anonymous users
2. **Location Tracking**: GPS services track user movement and location
3. **Pattern Discovery**: AI analyzes locations for architectural patterns
4. **Communication**: WebSocket enables real-time messaging
5. **Token Economy**: Users earn/spend tokens for contributions

## Key Features

### 📍 Location-Based Discovery
- **GPS Tracking**: High-accuracy location services with battery optimization
- **Pattern Suggestions**: AI-powered architectural pattern recommendations
- **Interactive Maps**: React Native Maps with custom markers and overlays
- **Background Tracking**: Continues location tracking when app is backgrounded

### 💬 Encrypted Communication
- **Peer-to-Peer Messaging**: Connect with nearby users automatically
- **Message Types**: Text, location sharing, pattern insights
- **Token-Gated Features**: Premium messaging requires token payment
- **Real-time Updates**: Instant message delivery via WebSocket

### 🪙 Bitcoin-Powered Economy  
- **Token Wallet**: View balance, earn/spend history
- **Earning Opportunities**: Discover patterns, vote on suggestions, share insights
- **Data Marketplace**: Future feature for trading spatial analysis
- **Secure Transactions**: Blockchain-based token system

### 🎯 Activity Tracking
- **Contribution History**: Track patterns found, votes cast, locations visited
- **Achievement System**: Unlock badges for milestones
- **Statistics Dashboard**: Personal analytics and progress
- **Community Leaderboards**: Compare contributions with other users

## Backend Integration

The mobile app connects to your existing Node.js backend:

### API Endpoints Used:
- `GET /api/locations/nearby` - Find locations near user
- `POST /api/locations` - Save new locations
- `GET /api/patterns/suggestions/:id` - Get AI pattern suggestions
- `POST /api/patterns/vote` - Vote on patterns
- `GET /api/activity/:sessionId` - User activity feed
- `GET /api/stats` - Global platform statistics
- `WebSocket /communication` - Real-time messaging

### Data Models:
The mobile app uses the same database schema as your web app:
- Users (anonymous sessions)
- Locations (GPS coordinates + metadata)
- Patterns (Christopher Alexander's 253 patterns)
- Activities (user actions and contributions)
- Token transactions

## Development Tips

### 🐛 Debugging
- Use React Native Debugger for advanced debugging
- Check Metro bundler logs for build issues
- Use `console.log()` statements for quick debugging
- Enable remote debugging in dev builds

### 📱 Testing
- Test on both iOS and Android devices
- Verify location permissions work correctly
- Test background location tracking
- Confirm WebSocket connections work on cellular data

### 🚀 Production Deployment
- Build release versions for app stores
- Configure production backend URLs
- Set up push notification services
- Implement app store deployment pipeline

## Troubleshooting

### Common Issues:
1. **Location not working**: Check permissions in device settings
2. **WebSocket connection fails**: Verify backend server is running
3. **Build errors**: Clean and rebuild both platforms
4. **Metro bundler issues**: Clear cache with `npm start -- --reset-cache`

### Platform-Specific:
- **iOS**: Ensure Xcode and iOS simulator are up to date
- **Android**: Check Android SDK and build tools versions
- **Both**: Verify React Native CLI is latest version

## Next Steps

### Immediate Features to Add:
1. **Push Notifications**: Notify users of nearby patterns
2. **Camera Integration**: Capture photos of architectural features
3. **Offline Mode**: Full offline functionality with sync
4. **Social Features**: User profiles and friend connections

### Advanced Features:
1. **AR Integration**: Augmented reality pattern visualization
2. **Machine Learning**: On-device pattern recognition
3. **Data Export**: Export user data and insights
4. **Analytics**: User behavior tracking and insights

The mobile app is now ready for development and testing. It provides the same core functionality as your web app but with native mobile performance and features!