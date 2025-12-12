# Lavalink Setup Guide - Fix "loadFailed" Error

## Problem
Your bot shows "❌ Failed to load track. Skipping to next song..." because Lavalink can't fetch YouTube audio.

## Solution
Update your Lavalink server configuration to include the LavaSrc plugin.

---

## Step 1: SSH into Your Server

```bash
ssh your-server
```

## Step 2: Stop Lavalink

```bash
pm2 stop lavalink
```

## Step 3: Backup Current Configuration

```bash
cd ~/lavalink
cp application.yml application.yml.backup
```

## Step 4: Create New Configuration

Run this command to create the updated `application.yml`:

```bash
cat > ~/lavalink/application.yml << 'EOF'
server:
  port: 2333
  address: 0.0.0.0

lavalink:
  plugins:
    - dependency: "com.github.topi314.lavasrc:lavasrc-plugin:4.2.0"
      repository: "https://maven.lavalink.dev/releases"
  
  server:
    password: "youshallnotpass"
    sources:
      youtube: false  # Using LavaSrc instead
      bandcamp: true
      soundcloud: true
      twitch: true
      vimeo: true
      http: true
      local: false
    bufferDurationMs: 400
    frameBufferDurationMs: 5000
    opusEncodingQuality: 10
    resamplingQuality: LOW
    trackStuckThresholdMs: 10000
    useSeekGhosting: true
    youtubePlaylistLoadLimit: 6
    playerUpdateInterval: 5
    youtubeSearchEnabled: false  # Using LavaSrc
    soundcloudSearchEnabled: true

plugins:
  lavasrc:
    providers:
      - "ytsearch:\"%ISRC%\""
      - "ytsearch:%QUERY%"
    sources:
      spotify: true
      applemusic: false
      deezer: false
      yandexmusic: false
      youtube: true
    spotify:
      clientId: "723cb39cfe904b7080b109effd050dfb"
      clientSecret: "6bd3eefcae1f452184a077ba414295ac"
      countryCode: "US"
      playlistLoadLimit: 6
      albumLoadLimit: 6
    youtube:
      countryCode: "US"

metrics:
  prometheus:
    enabled: false

logging:
  file:
    path: ./logs/
  level:
    root: INFO
    lavalink: INFO
  logback:
    rollingpolicy:
      max-file-size: 1GB
      max-history: 30
EOF
```

## Step 5: Restart Lavalink

```bash
pm2 restart lavalink
```

## Step 6: Verify Plugin Loaded

Watch the logs:

```bash
pm2 logs lavalink --lines 50
```

**Look for these lines:**
```
✅ Loaded plugin: lavasrc-plugin
✅ Lavalink is ready to accept connections
```

## Step 7: Restart Your Bot

```bash
pm2 restart jura-bot
```

---

## Troubleshooting

### Plugin Not Loading

If you don't see "Loaded plugin: lavasrc-plugin" in logs:

```bash
cd ~/lavalink
# Download plugin manually
mkdir -p plugins
cd plugins
wget https://github.com/topi314/LavaSrc/releases/download/4.2.0/lavasrc-plugin-4.2.0.jar
cd ..
pm2 restart lavalink
```

### Still Getting "loadFailed"

Check Lavalink logs:
```bash
pm2 logs lavalink --lines 100
```

Look for errors like:
- "Failed to load track"
- "YouTube"
- "403" or "429" (rate limit)

### Test Lavalink Directly

```bash
curl -H "Authorization: youshallnotpass" \
  "http://127.0.0.1:2333/v4/loadtracks?identifier=ytsearch:test" | jq
```

Should return tracks, not errors.

---

## After Setup

Once LavaSrc is working, you can switch back to `ytmsearch` for better music quality:

1. Edit `src/index.js`
2. Change `searchEngine: 'ytsearch'` to `searchEngine: 'ytmsearch'`
3. Restart bot: `pm2 restart jura-bot`

---

## Common Issues

**Issue:** Connection refused to Lavalink
**Fix:** Check if Lavalink is running: `pm2 status`

**Issue:** Port 2333 not accessible
**Fix:** Check firewall: `sudo ufw status` or AWS Security Group

**Issue:** Out of memory
**Fix:** Increase Lavalink memory in `lavalink.config.js`:
```javascript
args: ['-Xmx2G', '-jar', 'Lavalink.jar']  // Changed from 1G to 2G
```

---

## Current Status

✅ Bot is now using `ytsearch` (basic YouTube search)
⏳ Waiting for LavaSrc plugin installation
🎯 Goal: Switch to `ytmsearch` for YouTube Music quality
