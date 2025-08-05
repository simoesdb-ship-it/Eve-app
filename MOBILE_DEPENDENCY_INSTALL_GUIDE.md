# React Native Dependencies Installation Guide

## ✅ Status: Installation Script Created Successfully

The installation script `install-mobile-deps.sh` is located in your project root and has been executed. One problematic dependency was removed (`react-native-background-job`).

## Manual Installation Steps

Since automated package installation has limitations in subdirectories, here's how to complete the React Native setup:

### Step 1: Navigate to Mobile Directory
```bash
cd mobile
```

### Step 2: Install Dependencies
```bash
npm install --legacy-peer-deps
```

If you encounter any errors, try:
```bash
npm install --force
```

### Step 3: Verify Installation
```bash
npm list react-native
```

Should show: `react-native@0.76.5`

## Current Dependencies Ready to Install

Your `mobile/package.json` contains these optimized dependencies:

### Core Framework
- **react**: 18.3.1
- **react-native**: 0.76.5

### Navigation
- **@react-navigation/native**: ^6.1.18
- **@react-navigation/bottom-tabs**: ^6.6.1
- **@react-navigation/stack**: ^6.4.1
- **react-native-screens**: ^3.34.0
- **react-native-safe-area-context**: ^4.10.9
- **react-native-gesture-handler**: ^2.18.1

### Location & Maps
- **@react-native-community/geolocation**: ^3.4.0
- **react-native-maps**: ^1.15.6
- **react-native-permissions**: ^4.1.5

### Storage & Data
- **@react-native-async-storage/async-storage**: ^2.1.0
- **react-native-encrypted-storage**: ^4.0.3
- **@react-native-community/netinfo**: ^11.3.2

### UI & Graphics
- **react-native-vector-icons**: ^10.1.0
- **react-native-svg**: ^15.7.1

### Communication
- **react-native-websocket**: ^1.0.2

## After Successful Installation

Once dependencies are installed, you can:

### Start Development
```bash
cd mobile

# Start Metro bundler
npm start

# In another terminal, launch the app:
npm run ios      # iOS simulator (macOS only)
npm run android  # Android emulator
```

### Expected Behavior
Your React Native app will:
1. Display 5-tab navigation (Discover, Patterns, Activity, Communication, Economy)
2. Connect to your backend server at `http://localhost:5000`
3. Generate anonymous username (e.g., "Swift Falcon")
4. Request location permissions
5. Display pattern discovery interface

## Backend Integration

Your mobile app is configured to work with the existing backend:
- **API Base URL**: `http://localhost:5000/api`
- **WebSocket URL**: `ws://localhost:5000/communication`
- **Authentication**: Anonymous device fingerprinting
- **Token Economy**: Integrated with existing token system

## Troubleshooting

### Common Issues:
1. **Metro bundler fails**: Clear cache with `npm start -- --reset-cache`
2. **Build errors**: Clean and rebuild with platform-specific commands
3. **Permission errors**: Check location permissions in device settings
4. **Network errors**: Verify backend server is running on port 5000

### Platform-Specific Setup:

**iOS (macOS only):**
```bash
cd ios
pod install
cd ..
```

**Android:**
- Ensure Android Studio and SDK are installed
- Create Android Virtual Device (AVD)
- Enable USB debugging for physical devices

## Quick Verification Checklist

After installation, verify these work:
- [ ] `npm start` runs without errors
- [ ] Backend server accessible at `http://localhost:5000`
- [ ] Mobile app launches in simulator/emulator
- [ ] 5-tab navigation displays correctly
- [ ] Location permission request appears
- [ ] WebSocket connection establishes
- [ ] Anonymous username generates

Your React Native mobile app is ready for development once these dependencies are installed in the `/mobile` directory!