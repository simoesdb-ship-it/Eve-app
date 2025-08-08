# 🔄 How to Close Shell and Start Over

## Method 1: Stop Current Process
If Metro bundler is running:
1. Press **Ctrl + C** in the Shell tab
2. This stops the current process
3. You'll see the command prompt return

## Method 2: Clear and Restart
```bash
clear
cd mobile
npm start
```

## Method 3: Fresh Shell Session
1. Click the **"+"** button next to Shell tab
2. Opens a new clean shell session
3. Run: `cd mobile && npm start`

## Method 4: Force Kill Process (if stuck)
```bash
pkill -f "react-native"
pkill -f "metro"
cd mobile
npm start
```

## After Restarting:
You'll see:
- Metro bundler loading message
- QR code for device scanning
- Options: `w` (web), `i` (iOS), `a` (Android)

Your Bitcoin-powered location sharing mobile app will be ready to test again!