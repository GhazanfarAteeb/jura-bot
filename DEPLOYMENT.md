# 🚀 Deployment Guide

Complete guide for deploying RAPHAEL to production.

---

## 📋 Prerequisites

- **Node.js** v18 or higher
- **MongoDB** (local or MongoDB Atlas)
- **Discord Bot Token** from Discord Developer Portal
- **Hosting Service** (Render, Railway, Heroku, VPS, etc.)

---

## 🔧 Initial Setup

### 1. Create Discord Bot

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application"
3. Go to "Bot" tab → Click "Add Bot"
4. Enable these **Privileged Gateway Intents**:
   - ✅ Presence Intent
   - ✅ Server Members Intent
   - ✅ Message Content Intent
5. Copy the bot token (keep it secret!)
6. Go to "OAuth2" → "URL Generator"
7. Select scopes: `bot`, `applications.commands`
8. Select bot permissions:
   - Administrator (or specific permissions you need)
9. Copy the generated URL and invite bot to your server

### 2. Setup MongoDB

**Option A: MongoDB Atlas (Recommended for production)**
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create free account
3. Create cluster (M0 Free tier available)
4. Create database user
5. Whitelist IP addresses (or allow from anywhere: 0.0.0.0/0)
6. Get connection string: `mongodb+srv://username:password@cluster.mongodb.net/jurabot`

**Option B: Local MongoDB**
1. Install MongoDB Community Server
2. Start MongoDB service
3. Use connection string: `mongodb://localhost:27017/jurabot`

### 3. Clone and Configure

```bash
# Clone repository
git clone https://github.com/GhazanfarAteeb/jura-bot.git
cd jura-bot

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env with your credentials
nano .env  # or use any text editor
```

**Required .env variables:**
```env
DISCORD_TOKEN=your_discord_bot_token_here
CLIENT_ID=your_bot_application_id_here
MONGODB_URI=your_mongodb_connection_string
PORT=3000
DEFAULT_PREFIX=!
NODE_ENV=production
```

### 4. Download Fonts (Optional but Recommended)

For visual rank cards and profile cards:

1. Visit [Google Fonts - Poppins](https://fonts.google.com/specimen/Poppins)
2. Download the font family
3. Extract files
4. Copy `Poppins-Bold.ttf` and `Poppins-Regular.ttf` to `src/assets/fonts/`

**Note:** Bot will work with system fonts if custom fonts are not available.

### 5. Test Locally

```bash
# Start bot
npm start

# Or with auto-reload for development
npm run dev
```

Check console for:
- ✅ Connected to MongoDB
- ✅ Bot logged in as YourBot#1234
- 🌐 Health check server running on port 3000

---

## 🌐 Deployment Options

### Option 1: Render (Recommended - Free Tier Available)

**Step 1: Prepare for Render**

Create `render.yaml` in project root:
```yaml
services:
  - type: web
    name: jura-bot
    env: node
    plan: free
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: DISCORD_TOKEN
        sync: false
      - key: CLIENT_ID
        sync: false
      - key: MONGODB_URI
        sync: false
      - key: PORT
        value: 3000
      - key: DEFAULT_PREFIX
        value: "!"
    healthCheckPath: /health
```

**Step 2: Deploy**

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click "New" → "Web Service"
3. Connect your GitHub repository
4. Select branch (e.g., `main` or `master`)
5. Render will detect `render.yaml` automatically
6. Add environment variables in Render dashboard:
   - `DISCORD_TOKEN`
   - `CLIENT_ID`
   - `MONGODB_URI`
7. Click "Create Web Service"

**Step 3: Configure Health Checks**

Render will automatically use `/health` endpoint for health monitoring.

**Step 4: Keep Bot Alive**

Free tier services sleep after 15 minutes of inactivity. Options:

1. **Uptime Robot** (Recommended):
   - Add your Render URL: `https://your-app.onrender.com/health`
   - Set interval to 5 minutes
   - Free monitoring

2. **Cron-job.org**:
   - Similar to Uptime Robot
   - Keeps bot awake by pinging health endpoint

---

### Option 2: Railway (Easy Setup)

1. Go to [Railway](https://railway.app/)
2. Click "Start New Project"
3. Select "Deploy from GitHub repo"
4. Connect repository
5. Railway auto-detects Node.js
6. Add environment variables:
   ```
   DISCORD_TOKEN=...
   CLIENT_ID=...
   MONGODB_URI=...
   PORT=3000
   DEFAULT_PREFIX=!
   ```
7. Deploy! Railway generates URL automatically

**Health Checks:**
- Add health check URL to Uptime Robot: `https://your-app.railway.app/health`

---

### Option 3: Heroku

```bash
# Install Heroku CLI
heroku login

# Create Heroku app
heroku create your-bot-name

# Add MongoDB addon or use Atlas
heroku addons:create mongolab:sandbox

# Set environment variables
heroku config:set DISCORD_TOKEN=your_token
heroku config:set CLIENT_ID=your_client_id
heroku config:set DEFAULT_PREFIX=!
heroku config:set NODE_ENV=production

# Deploy
git push heroku main

# Scale to 1 dyno
heroku ps:scale web=1

# View logs
heroku logs --tail
```

---

### Option 4: VPS (DigitalOcean, Linode, AWS EC2)

**Step 1: Connect to VPS**
```bash
ssh root@your-server-ip
```

**Step 2: Install Dependencies**
```bash
# Update system
apt update && apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Install MongoDB (or use Atlas)
# Follow MongoDB installation guide for your OS

# Install PM2 (process manager)
npm install -g pm2
```

**Step 3: Deploy Bot**
```bash
# Clone repository
git clone https://github.com/GhazanfarAteeb/jura-bot.git
cd jura-bot

# Install dependencies
npm install

# Create .env file
nano .env
# Add your environment variables

# Start with PM2
pm2 start src/index.js --name jura-bot

# Save PM2 config
pm2 save

# Auto-start on reboot
pm2 startup
```

**Step 4: Setup Nginx (Optional - for domain)**
```bash
# Install Nginx
apt install -y nginx

# Create Nginx config
nano /etc/nginx/sites-available/jura-bot
```

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site
ln -s /etc/nginx/sites-available/jura-bot /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

---

## 🔍 Monitoring Setup

### Uptime Robot (Free)

1. Go to [UptimeRobot.com](https://uptimerobot.com/)
2. Create free account
3. Add new monitor:
   - **Monitor Type**: HTTP(s)
   - **Friendly Name**: RAPHAEL
   - **URL**: `https://your-bot-url/health`
   - **Monitoring Interval**: 5 minutes
4. Set up alerts:
   - Email notifications
   - Discord webhook (optional)
   - SMS (paid)

### Discord Bot Status Channel

Bot automatically creates and uses 🤖-bot-status channel when you run `!setup`.

**Manual setup:**
```
!setup                              # Run this first
!setchannel botstatus #bot-status   # Or set manually
```

Bot will post status updates:
- ✅ Online when starting
- ❌ Offline when detected (checks every minute)

---

## 🐛 Troubleshooting

### Bot Not Starting

**Check logs:**
```bash
# Render/Railway: View logs in dashboard
# Heroku: heroku logs --tail
# PM2: pm2 logs jura-bot
# Local: Check console output
```

**Common issues:**
1. **MongoDB connection failed**
   - Check MONGODB_URI is correct
   - Verify IP whitelist in MongoDB Atlas
   - Ensure database user has correct permissions

2. **Invalid Discord token**
   - Regenerate token in Discord Developer Portal
   - Update DISCORD_TOKEN in environment variables

3. **Module not found errors**
   - Run `npm install` again
   - Check Node.js version (requires v18+)

### Health Check Failing

1. **Check PORT environment variable**
   ```bash
   # Should match your hosting platform's requirements
   PORT=3000  # or $PORT for dynamic ports
   ```

2. **Test health endpoint locally**
   ```bash
   curl http://localhost:3000/health
   ```

3. **Check Express server logs**
   - Should see: "🌐 Health check server running on port 3000"

### Bot Commands Not Working

1. **Check prefix**
   ```
   # In Discord, mention the bot
   @JuraBot what's my prefix?
   ```

2. **Check permissions**
   - Bot needs "Send Messages" permission
   - Bot needs "Read Message History"
   - Bot role should be above other roles for role management

3. **Enable message content intent**
   - Go to Discord Developer Portal
   - Bot → Privileged Gateway Intents
   - Enable "Message Content Intent"

---

## 📊 Post-Deployment

### 1. Run Setup Command

In your Discord server:
```
!setup
```

This creates:
- All necessary roles
- All log channels
- Bot status channel
- Enables level system, birthday system, events

### 2. Configure Settings

```
!config                         # View current settings
!setprefix ?                    # Change prefix if needed
!config embedcolor #5865F2      # Customize embed color
```

### 3. Test Features

```
!help                           # View all commands
!rank                           # Test level system
!daily                          # Test economy
!play never gonna give you up   # Test music
!birthday 12 25                 # Test birthday system
```

### 4. Monitor Bot

- Check 🤖-bot-status channel
- Add health endpoint to Uptime Robot
- Review logs periodically

---

## 🔄 Updating Bot

### GitHub Repository

```bash
git pull origin main
npm install  # Install any new dependencies
```

### Render/Railway
- Automatic deployment on git push

### Heroku
```bash
git push heroku main
```

### PM2 (VPS)
```bash
cd jura-bot
git pull
npm install
pm2 restart jura-bot
```

---

## 🔐 Security Best Practices

1. **Never commit .env file**
   - Already in .gitignore
   - Use environment variables in hosting platforms

2. **Rotate tokens regularly**
   - Change Discord token periodically
   - Update in all environments

3. **Use strong MongoDB passwords**
   - Random, complex passwords
   - Different from other services

4. **Limit MongoDB access**
   - Whitelist only necessary IPs
   - Use database user with minimal permissions

5. **Keep dependencies updated**
   ```bash
   npm audit
   npm update
   ```

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/GhazanfarAteeb/jura-bot/issues)
- **Discussions**: [GitHub Discussions](https://github.com/GhazanfarAteeb/jura-bot/discussions)
- **Documentation**: README.md, COMMANDS.md, FEATURES.md

---

## ✅ Deployment Checklist

- [ ] Discord bot created with correct intents
- [ ] MongoDB database setup (Atlas or local)
- [ ] Repository cloned
- [ ] Dependencies installed (`npm install`)
- [ ] .env file configured
- [ ] Fonts downloaded (optional)
- [ ] Bot tested locally
- [ ] Deployed to hosting service
- [ ] Environment variables set in hosting platform
- [ ] Health endpoint tested
- [ ] Uptime monitoring configured
- [ ] Bot invited to Discord server
- [ ] !setup command run
- [ ] Features tested
- [ ] Bot status channel verified

🎉 **Bot is now live!**
