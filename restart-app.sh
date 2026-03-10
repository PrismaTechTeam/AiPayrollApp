#!/bin/bash
# Clean restart script for LetLink App

echo "🔄 Cleaning up processes..."
pkill -f "expo\|metro" 2>/dev/null
sleep 2

echo "🧹 Clearing caches..."
rm -rf .expo
rm -rf node_modules/.cache
rm -rf ios/build 2>/dev/null

echo "✅ Starting Expo..."
npx expo start --clear

