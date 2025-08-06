# React Native Mobile App Launch Instructions

## Quick Launch Steps

### 1. Open New Terminal Tab in Replit
- Click the "+" tab next to your current tabs
- Select "Shell" to open a new terminal

### 2. Navigate to Mobile Directory
```bash
cd mobile
```

### 3. Start Metro Bundler
```bash
npm start
```

### 4. Launch on Device/Simulator

After Metro starts, you'll see a QR code and menu options:

**For iOS:**
- Press `i` to open iOS simulator
- Or scan QR code with Expo Go app on iPhone

**For Android:**
- Press `a` to open Android emulator  
- Or scan QR code with Expo Go app on Android

**For Web (Preview):**
- Press `w` to open in web browser

## What You'll See

1. **Metro Bundler Console** - Shows bundle building progress
2. **QR Code** - For scanning with mobile device
3. **Menu Options** - Press letters to launch on different platforms
4. **Live Reload** - Changes appear instantly on device

## Your Mobile App Features

✓ **5-Tab Navigation**: Discover, Patterns, Activity, Communication, Economy
✓ **Location Tracking**: Real-time GPS with pattern discovery
✓ **Token Wallet**: Bitcoin-style token management
✓ **Encrypted Messaging**: Peer-to-peer communication
✓ **Pattern Analysis**: Christopher Alexander's 253 patterns

## Troubleshooting

If Metro doesn't start:
```bash
npx react-native start --reset-cache
```

Your mobile app connects to the backend at: `http://localhost:5000`