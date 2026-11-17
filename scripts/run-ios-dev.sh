#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "🚀 Starting iOS Development Environment..."

echo "🔄 Cleaning up existing processes..."
pkill -f "react-native start" || true
pkill -f "metro" || true

echo "🧹 Cleaning metro cache..."
cd "$ROOT_DIR"
npm start -- --reset-cache &
METRO_PID=$!

sleep 3

echo "📱 Launching iOS simulator..."
open /Applications/Simulator.app

sleep 5

echo "▶️  Running iOS app..."
cd "$ROOT_DIR"
react-native run-ios

echo "✅ Done! The app should be loading in the simulator."
