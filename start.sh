#!/bin/bash

echo "========================================"
echo " JURA BOT - Discord Bot Launcher"
echo "========================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js is not installed!"
    echo "Please install Node.js from https://nodejs.org/"
    echo ""
    exit 1
fi

echo "[OK] Node.js found: $(node --version)"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "[WARNING] .env file not found!"
    echo ""
    
    if [ -f .env.example ]; then
        echo "Creating .env from .env.example..."
        cp .env.example .env
        echo "[OK] .env file created"
        echo ""
        echo "Please edit .env file and add your:"
        echo "  - DISCORD_TOKEN"
        echo "  - CLIENT_ID"
        echo "  - MONGODB_URI"
        echo ""
        echo "Then run this script again."
        exit 1
    else
        echo "[ERROR] .env.example not found!"
        echo "Please create a .env file manually."
        exit 1
    fi
fi

echo "[OK] .env file found"
echo ""

# Check if node_modules exists
if [ ! -d node_modules ]; then
    echo "[INFO] Installing dependencies..."
    echo "This may take a few minutes..."
    echo ""
    
    npm install
    
    if [ $? -ne 0 ]; then
        echo ""
        echo "[ERROR] Failed to install dependencies!"
        exit 1
    fi
    
    echo ""
    echo "[OK] Dependencies installed"
    echo ""
fi

# Start the bot
echo "========================================"
echo " Starting JURA BOT..."
echo "========================================"
echo ""
echo "Press Ctrl+C to stop the bot"
echo ""

node src/index.js
