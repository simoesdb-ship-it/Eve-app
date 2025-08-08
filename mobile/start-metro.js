#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Starting React Native Metro Bundler...');
console.log('📱 Your Bitcoin-powered Location Sharing Mobile App');
console.log('');

try {
  // Start Metro with proper configuration
  execSync('npx react-native start --port 8081 --reset-cache', {
    stdio: 'inherit',
    cwd: __dirname
  });
} catch (error) {
  console.error('Error starting Metro:', error.message);
  console.log('');
  console.log('📋 Alternative ways to start:');
  console.log('1. npx react-native start');
  console.log('2. npm run start');
  console.log('3. expo start (if using Expo)');
}