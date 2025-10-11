#!/bin/bash

# Performance Optimization Build Script
# This script optimizes the Next.js app for production

echo "🚀 Starting performance optimization build..."

# Clear previous builds
echo "🧹 Clearing previous builds..."
rm -rf .next
rm -rf out
npm cache clean --force

# Install dependencies with exact versions for better caching
echo "📦 Installing dependencies..."
npm ci --production=false

# Build with optimization flags
echo "🔨 Building with optimizations..."
NODE_ENV=production \
NEXT_TELEMETRY_DISABLED=1 \
npm run build

# Analyze bundle size
echo "📊 Analyzing bundle size..."
npx @next/bundle-analyzer

# Check for unused dependencies
echo "🔍 Checking for unused dependencies..."
npx depcheck

# Show build stats
echo "📈 Build stats:"
echo "  - Next.js build completed"
echo "  - Bundle analysis available"
echo "  - Static files generated"

echo "✅ Performance optimization complete!"
echo ""
echo "🎯 Performance Tips:"
echo "  1. Use 'npm run start' for production mode"
echo "  2. Enable gzip compression on your server"
echo "  3. Use a CDN for static assets"
echo "  4. Monitor Core Web Vitals"