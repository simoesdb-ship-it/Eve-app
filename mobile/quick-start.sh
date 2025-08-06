#!/bin/bash

echo "🚀 React Native Mobile App Quick Start"
echo "====================================="

# Check if we're in the mobile directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Run this script from the mobile directory"
    echo "   Try: cd mobile && ./quick-start.sh"
    exit 1
fi

echo "📱 Starting React Native Metro Bundler..."
echo "   Backend server should be running at localhost:5000"
echo ""

# Try different startup methods in order of preference
echo "🔄 Attempting clean start with cache reset..."
npx react-native start --reset-cache --port 8081

# If that fails, try alternative ports
if [ $? -ne 0 ]; then
    echo "🔄 Trying alternative port 8082..."
    npx react-native start --reset-cache --port 8082
fi

# If still failing, suggest manual steps
if [ $? -ne 0 ]; then
    echo ""
    echo "⚠️  Automatic start failed. Try these manual steps:"
    echo "   1. npm run start-clean"
    echo "   2. npx react-native start --port 8082"
    echo "   3. Check TROUBLESHOOTING.md for specific error solutions"
fi