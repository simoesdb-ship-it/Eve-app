# React Native Startup Error Solutions

## Most Common Errors & Fixes

### 1. CLI Error: "react-native depends on @react-native-community/cli"
**Status: ✅ FIXED** - CLI is now installed

### 2. Metro Bundler Cache Issues
**Solution:**
```bash
cd mobile
npm run start-clean
```

### 3. Port Already in Use
**Solution:**
```bash
cd mobile
npx react-native start --port 8082
```

### 4. Node Modules Issues
**Solution:**
```bash
cd mobile
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

### 5. Metro Config Issues
**Solution:**
```bash
cd mobile
npx react-native start --reset-cache
```

### 6. Android/iOS Build Errors
**For Android:**
```bash
cd mobile/android
./gradlew clean
cd ..
npm run android
```

**For iOS:**
```bash
cd mobile/ios
rm -rf build/
cd ..
npm run ios
```

## Quick Start Commands (Try in Order)

### Option 1: Standard Start
```bash
cd mobile
npm start
```

### Option 2: Clean Start
```bash
cd mobile
npm run start-clean
```

### Option 3: Reset Everything
```bash
cd mobile
npx react-native start --reset-cache --port 8082
```

### Option 4: Web Preview (Fastest)
```bash
cd mobile
npx expo start --web
```

## What Error Did You See?

Please share the specific error message you encountered, and I'll provide the exact fix!