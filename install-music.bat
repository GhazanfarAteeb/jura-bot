@echo off
echo ========================================
echo  Discord Music Bot - NodeLink Setup
echo ========================================
echo.

echo [1/4] Installing Riffy dependency...
call npm install riffy
if %errorlevel% neq 0 (
    echo ERROR: Failed to install Riffy
    pause
    exit /b 1
)
echo ✅ Riffy installed successfully
echo.

echo [2/4] Checking for .env file...
if not exist .env (
    echo Creating .env from template...
    copy env.example.txt .env
    echo ⚠️  Please edit .env file with your credentials!
    echo.
) else (
    echo ✅ .env file already exists
    echo.
)

echo [3/4] Creating NodeLink directory...
if not exist nodelink (
    mkdir nodelink
    mkdir nodelink\plugins
    echo ✅ NodeLink directory created
) else (
    echo ✅ NodeLink directory already exists
)
echo.

echo [4/4] Copying NodeLink configuration...
if exist nodelink-application.yml (
    copy nodelink-application.yml nodelink\application.yml
    echo ✅ Configuration copied
) else (
    echo ⚠️  nodelink-application.yml not found
)
echo.

echo ========================================
echo  Installation Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Download NodeLink.jar to nodelink\ folder
echo    https://github.com/HopeDP/NodeLink/releases
echo.
echo 2. Download plugins to nodelink\plugins\ folder:
echo    - lavaSrc: https://github.com/topi314/LavaSrc/releases
echo    - lavaSearch: https://github.com/topi314/LavaSearch/releases
echo.
echo 3. Edit nodelink\application.yml with Spotify credentials
echo    Get from: https://developer.spotify.com/dashboard
echo.
echo 4. Edit .env file with your Discord bot token
echo.
echo 5. Start NodeLink:
echo    cd nodelink
echo    java -Xms128M -Xmx512M -jar NodeLink.jar
echo.
echo 6. Start bot:
echo    npm start
echo.
echo Full documentation: See MUSIC_SYSTEM_README.md
echo Quick start guide: See QUICKSTART_MUSIC.md
echo.
pause
