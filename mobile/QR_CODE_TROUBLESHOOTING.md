# 📱 QR Code Not Showing - Troubleshooting Guide

## Issue: QR Code Missing
The QR code appears when Metro bundler starts correctly. Here are solutions:

## Solution 1: Direct Metro Start
```bash
cd mobile
npx react-native start --port 8081
```

## Solution 2: Clear Cache Start
```bash
cd mobile
npx react-native start --reset-cache
```

## Solution 3: Use Start Script
```bash
cd mobile
node start-metro.js
```

## Solution 4: Alternative Package Manager
```bash
cd mobile
yarn start
```

## What You Should See:
```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  Metro waiting on exp://192.168.x.x:8081          │
│                                                     │
│  ████ ████ ████ ████ ████ ████ ████               │
│  ████ ████ ████ ████ ████ ████ ████  <-- QR CODE  │
│  ████ ████ ████ ████ ████ ████ ████               │
│                                                     │
│  › Press a │ open Android                          │
│  › Press i │ open iOS simulator                    │
│  › Press w │ open web                              │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## Quick Web Test (No QR needed):
```bash
cd mobile
npx react-native start
# Then press 'w' when Metro starts
```

## If Still No QR Code:
1. Check if port 8081 is free: `lsof -ti:8081`
2. Kill any process using port: `kill -9 $(lsof -ti:8081)`
3. Restart: `cd mobile && npx react-native start`

Your Bitcoin-powered location sharing app will show the QR code when Metro starts correctly!