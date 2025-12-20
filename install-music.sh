#!/bin/bash

echo "========================================"
echo " Discord Music Bot - NodeLink Setup"
echo "========================================"
echo ""

echo "[1/4] Installing Riffy dependency..."
npm install riffy
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to install Riffy"
    exit 1
fi
echo "✅ Riffy installed successfully"
echo ""

echo "[2/4] Checking for .env file..."
if [ ! -f .env ]; then
    echo "Creating .env from template..."
    cp env.example.txt .env
    echo "⚠️  Please edit .env file with your credentials!"
    echo ""
else
    echo "✅ .env file already exists"
    echo ""
fi

echo "[3/4] Creating NodeLink directory..."
if [ ! -d nodelink ]; then
    mkdir -p nodelink/plugins
    echo "✅ NodeLink directory created"
else
    echo "✅ NodeLink directory already exists"
fi
echo ""

echo "[4/4] Copying NodeLink configuration..."
if [ -f nodelink-application.yml ]; then
    cp nodelink-application.yml nodelink/application.yml
    echo "✅ Configuration copied"
else
    echo "⚠️  nodelink-application.yml not found"
fi
echo ""

echo "========================================"
echo " Installation Complete!"
echo "========================================"
echo ""
echo "Next steps:"
echo "1. Download NodeLink.jar to nodelink/ folder"
echo "   https://github.com/HopeDP/NodeLink/releases"
echo ""
echo "2. Download plugins to nodelink/plugins/ folder:"
echo "   - lavaSrc: https://github.com/topi314/LavaSrc/releases"
echo "   - lavaSearch: https://github.com/topi314/LavaSearch/releases"
echo ""
echo "3. Edit nodelink/application.yml with Spotify credentials"
echo "   Get from: https://developer.spotify.com/dashboard"
echo ""
echo "4. Edit .env file with your Discord bot token"
echo ""
echo "5. Start NodeLink:"
echo "   cd nodelink"
echo "   java -Xms128M -Xmx512M -jar NodeLink.jar"
echo ""
echo "6. Start bot:"
echo "   npm start"
echo ""
echo "Full documentation: See MUSIC_SYSTEM_README.md"
echo "Quick start guide: See QUICKSTART_MUSIC.md"
echo ""
