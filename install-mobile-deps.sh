#!/bin/bash

echo "Installing React Native Dependencies..."
echo "======================================"

# Navigate to mobile directory
cd mobile

# Check if package.json exists
if [ ! -f "package.json" ]; then
    echo "Error: package.json not found in mobile directory"
    exit 1
fi

echo "Installing JavaScript dependencies..."
npm install --legacy-peer-deps

echo ""
echo "JavaScript dependencies installed successfully!"

# Check if we're on macOS for iOS setup
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo ""
    echo "Setting up iOS dependencies..."
    cd ios
    
    # Check if Podfile exists
    if [ -f "Podfile" ]; then
        pod install
        echo "iOS dependencies installed successfully!"
    else
        echo "Warning: Podfile not found. iOS setup skipped."
    fi
    
    cd ..
else
    echo ""
    echo "Skipping iOS setup (not on macOS)"
fi

echo ""
echo "✅ Mobile dependencies installation complete!"
echo ""
echo "Next steps:"
echo "1. npm run ios     (launch iOS simulator)"
echo "2. npm run android (launch Android emulator)"
echo ""