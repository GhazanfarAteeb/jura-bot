@echo off
echo ========================================
echo  JURA BOT - Discord Bot Launcher
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed!
    echo Please download and install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo [OK] Node.js found: 
node --version
echo.

REM Check if .env file exists
if not exist .env (
    echo [WARNING] .env file not found!
    echo.
    if exist .env.example (
        echo Creating .env from .env.example...
        copy .env.example .env >nul
        echo [OK] .env file created
        echo.
        echo Please edit .env file and add your:
        echo   - DISCORD_TOKEN
        echo   - CLIENT_ID  
        echo   - MONGODB_URI
        echo.
        echo Then run this script again.
        pause
        exit /b 1
    ) else (
        echo [ERROR] .env.example not found!
        echo Please create a .env file manually.
        pause
        exit /b 1
    )
)

echo [OK] .env file found
echo.

REM Check if node_modules exists
if not exist node_modules (
    echo [INFO] Installing dependencies...
    echo This may take a few minutes...
    echo.
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo.
        echo [ERROR] Failed to install dependencies!
        pause
        exit /b 1
    )
    echo.
    echo [OK] Dependencies installed
    echo.
)

REM Start the bot
echo ========================================
echo  Starting JURA BOT...
echo ========================================
echo.
echo Press Ctrl+C to stop the bot
echo.

node src/index.js

REM If bot exits, pause so user can see error
pause
