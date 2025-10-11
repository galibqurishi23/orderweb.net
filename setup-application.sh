#!/bin/bash

echo "📦 Application Setup Script"
echo "==========================="

if [ -z "$1" ]; then
    echo "Usage: ./setup-application.sh <path-to-app-archive>"
    echo "Example: ./setup-application.sh /home/opc/uploads/my-app.tar.gz"
    exit 1
fi

ARCHIVE_FILE="$1"
APP_DIR="/home/opc"

if [ ! -f "$ARCHIVE_FILE" ]; then
    echo "❌ Error: Archive file not found: $ARCHIVE_FILE"
    exit 1
fi

echo "📁 Archive: $ARCHIVE_FILE"
echo "📂 Install Location: $APP_DIR"
echo ""

# Remove existing app directory if it exists
if [ -d "$APP_DIR" ]; then
    echo "🗑️ Removing existing application..."
    rm -rf "$APP_DIR"
fi

# Create app directory
mkdir -p "$APP_DIR"

echo "📦 Extracting application..."

# Extract based on file type
case "$ARCHIVE_FILE" in
    *.tar.gz|*.tgz)
        tar -xzf "$ARCHIVE_FILE" -C "$APP_DIR" --strip-components=1
        ;;
    *.tar)
        tar -xf "$ARCHIVE_FILE" -C "$APP_DIR" --strip-components=1
        ;;
    *.zip)
        unzip -q "$ARCHIVE_FILE" -d "/tmp/app_extract"
        # Move contents to app directory (handle nested folders)
        if [ -d "/tmp/app_extract" ]; then
            NESTED_DIR=$(find /tmp/app_extract -maxdepth 1 -type d | tail -1)
            if [ "$NESTED_DIR" != "/tmp/app_extract" ]; then
                mv "$NESTED_DIR"/* "$APP_DIR"/
            else
                mv /tmp/app_extract/* "$APP_DIR"/
            fi
            rm -rf /tmp/app_extract
        fi
        ;;
    *)
        echo "❌ Unsupported file format. Please use .tar.gz, .tar, or .zip"
        exit 1
        ;;
esac

if [ $? -ne 0 ]; then
    echo "❌ Error extracting archive!"
    exit 1
fi

cd "$APP_DIR"

echo "✅ Application extracted successfully!"
echo ""
echo "📋 Application contents:"
ls -la

# Copy environment file
if [ -f "/home/opc/.env" ]; then
    echo ""
    echo "📝 Copying environment configuration..."
    cp /home/opc/.env "$APP_DIR/.env"
    echo "✅ Environment file copied"
fi

# Check for package.json and install dependencies
if [ -f "package.json" ]; then
    echo ""
    echo "📦 Installing dependencies..."
    npm install
    
    if [ $? -eq 0 ]; then
        echo "✅ Dependencies installed successfully!"
    else
        echo "⚠️ Warning: Some dependencies failed to install"
    fi
fi

echo ""
echo "🎉 Application setup complete!"
echo ""
echo "🚀 To start your application:"
echo "   cd $APP_DIR"
echo "   npm run dev"
echo ""
echo "🌐 Your app will be available at: http://143.47.254.187:9010"