#!/bin/bash
# Setup Lavalink server on EC2

echo "🎵 Setting up Lavalink server..."

# Install Java if not installed
if ! command -v java &> /dev/null; then
    echo "📦 Installing Java 17..."
    sudo yum install -y java-17-amazon-corretto-headless
fi

# Create lavalink directory
mkdir -p ~/lavalink
cd ~/lavalink

# Download Lavalink
echo "⬇️  Downloading Lavalink..."
wget -O Lavalink.jar https://github.com/lavalink-devs/Lavalink/releases/latest/download/Lavalink.jar

# Create application.yml
echo "📝 Creating Lavalink configuration..."
cat > application.yml << 'EOF'
server:
  port: 2333
  address: 0.0.0.0

lavalink:
  server:
    password: "youshallnotpass"
    sources:
      youtube: true
      bandcamp: true
      soundcloud: true
      twitch: true
      vimeo: true
      http: true
      local: false
    filters:
      volume: true
      equalizer: true
      karaoke: true
      timescale: true
      tremolo: true
      vibrato: true
      distortion: true
      rotation: true
      channelMix: true
      lowPass: true
    bufferDurationMs: 400
    frameBufferDurationMs: 5000
    opusEncodingQuality: 10
    resamplingQuality: LOW
    trackStuckThresholdMs: 10000
    useSeekGhosting: true
    youtubePlaylistLoadLimit: 6
    playerUpdateInterval: 5
    youtubeSearchEnabled: true
    soundcloudSearchEnabled: true
    gc-warnings: true

metrics:
  prometheus:
    enabled: false
    endpoint: /metrics

sentry:
  dsn: ""
  environment: ""

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

# Create PM2 config for Lavalink
cat > lavalink.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'lavalink',
    script: 'java',
    args: ['-Xmx1G', '-jar', 'Lavalink.jar'],
    cwd: '/home/ec2-user/lavalink',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    }
  }]
};
EOF

echo "✅ Lavalink setup complete!"
echo ""
echo "To start Lavalink:"
echo "  pm2 start lavalink.config.js"
echo ""
echo "To check status:"
echo "  pm2 list"
echo "  pm2 logs lavalink"
