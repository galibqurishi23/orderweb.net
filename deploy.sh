#!/bin/bash

# Production Deployment Script for OrderWeb Restaurant System
# Run this script after uploading to your server

echo "🚀 Starting OrderWeb Restaurant System Production Deployment..."

# Create necessary directories
mkdir -p logs public/uploads public/uploads/logos public/uploads/shop-covers public/uploads/shop-items

# Install dependencies (production only)
echo "📦 Installing production dependencies..."
npm ci --only=production

# Set up environment file
if [ ! -f .env.production ]; then
    echo "⚠️  Creating .env.production from template..."
    cp .env.production.template .env.production
    echo "✅ Please edit .env.production with your actual configuration values"
fi

# Set proper permissions
echo "🔒 Setting file permissions..."
chmod 755 ./
chmod -R 755 public/uploads/
chmod 600 .env.production

# Start with PM2
echo "🎯 Starting application with PM2..."
npm install pm2@latest -g
pm2 start ecosystem.production.config.js
pm2 startup
pm2 save

echo "✅ Deployment completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Edit .env.production with your database and other credentials"
echo "2. Set up your reverse proxy (nginx/apache) to point to port 3000"
echo "3. Configure SSL certificate"
echo "4. Set up database backups"
echo ""
echo "🔧 Useful commands:"
echo "  pm2 status                    - Check application status"
echo "  pm2 restart orderwebsystem    - Restart application"
echo "  pm2 logs orderwebsystem       - View logs"
echo "  pm2 monit                     - Monitor application"
echo ""
echo "🌐 Your application will be available at: http://your-server-ip:3000"
