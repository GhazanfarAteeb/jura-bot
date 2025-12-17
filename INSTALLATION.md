# 🚀 Installation Guide

This guide will help you set up RAPHAEL for your Discord server.

## Prerequisites

Before you begin, make sure you have:

- **Node.js** version 18 or higher ([Download](https://nodejs.org/))
- **MongoDB** database:
  - Local installation ([Download](https://www.mongodb.com/try/download/community)), OR
  - MongoDB Atlas cloud account ([Sign up free](https://www.mongodb.com/cloud/atlas/register))
- **Discord Bot Token** (see below)

## Step 1: Create Discord Bot

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **"New Application"** and give it a name (e.g., "RAPHAEL")
3. Go to the **"Bot"** section in the left sidebar
4. Click **"Add Bot"** and confirm
5. Under **"Token"**, click **"Copy"** to copy your bot token (keep this secret!)
6. Scroll down to **"Privileged Gateway Intents"** and enable:
   - ✅ Presence Intent
   - ✅ Server Members Intent
   - ✅ Message Content Intent
7. Click **"Save Changes"**

## Step 2: Invite Bot to Your Server

1. Go to **"OAuth2"** → **"URL Generator"** in the left sidebar
2. Under **"Scopes"**, select:
   - ✅ `bot`
   - ✅ `applications.commands`
3. Under **"Bot Permissions"**, select:
   - ✅ Administrator (or manually select: Manage Roles, Manage Channels, Kick Members, Ban Members, Manage Messages, Read Messages, Send Messages, etc.)
4. Copy the generated URL at the bottom
5. Open the URL in your browser and select your server
6. Click **"Authorize"**

## Step 3: Install RAPHAEL

### 3.1 Download/Clone the Repository

```powershell
# If you have git:
git clone https://github.com/GhazanfarAteeb/jura-bot.git
cd jura-bot

# Or download and extract the ZIP file, then open the folder in PowerShell
```

### 3.2 Install Dependencies

```powershell
npm install
```

### 3.3 Configure Environment Variables

1. Copy the example environment file:
```powershell
Copy-Item .env.example .env
```

2. Open `.env` in a text editor and fill in your values:

```env
# Discord Bot Configuration
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_client_id_here

# MongoDB Configuration
# For local MongoDB:
MONGODB_URI=mongodb://localhost:27017/jura_bot

# For MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/jura_bot

# Bot Configuration
DEFAULT_PREFIX=!
BOT_OWNER_ID=your_discord_user_id
```

**Finding your Client ID:**
- Go to Discord Developer Portal → Your Application
- Copy the **"Application ID"** from the General Information page

**Finding your Discord User ID:**
- In Discord, enable Developer Mode: User Settings → Advanced → Developer Mode
- Right-click your username and click "Copy ID"

## Step 4: Start the Bot

```powershell
# Production mode:
npm start

# Development mode (auto-reload on file changes):
npm run dev
```

You should see:
```
✅ Connected to MongoDB
📝 Loaded command: setprefix
📝 Loaded command: config
... (more commands)
🎯 Loaded event: ready
🎯 Loaded event: guildMemberAdd
... (more events)
✅ Logged in as RAPHAEL#1234
📊 Serving X servers
👥 Serving X users
🚀 Bot is ready!
```

## Step 5: Configure Your Server

In your Discord server, run these commands:

```
!setup
```

This will automatically:
- Create necessary roles (🚨 Sus/Radar, 🥚 New Account, 🔇 Muted)
- Create log channels (mod-log, alert-log, join-log)
- Configure initial settings

## Step 6: Additional Configuration

### Set Staff Roles
```
!setrole staff @Moderator
!setrole staff @Admin
```

### Adjust Settings
```
!config susthreshold 5          # Change sus detection threshold
!config accountagethreshold 48  # New accounts = < 48 hours old
!config embedcolor #5865F2      # Change embed color
```

### View Current Configuration
```
!config
```

## MongoDB Atlas Setup (Cloud Database)

If you don't want to install MongoDB locally:

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)
2. Create a free account
3. Create a new cluster (free tier available)
4. Click **"Connect"** → **"Connect your application"**
5. Copy the connection string
6. Replace `<password>` with your database user password
7. Replace `<dbname>` with `jura_bot`
8. Use this as your `MONGODB_URI` in `.env`

Example:
```
MONGODB_URI=mongodb+srv://myuser:mypassword@cluster0.xxxxx.mongodb.net/jura_bot
```

## Troubleshooting

### Bot doesn't respond to commands
- Check that Message Content Intent is enabled in Discord Developer Portal
- Verify the bot has permissions in your server
- Try changing the prefix: `!setprefix ?`

### MongoDB connection error
- Ensure MongoDB is running (local) or connection string is correct (Atlas)
- Check firewall settings
- Verify network access is allowed in MongoDB Atlas

### Bot goes offline
- Check console for errors
- Ensure `DISCORD_TOKEN` is correct in `.env`
- Verify your bot token hasn't been reset in Developer Portal

### Commands not working
- Ensure bot has required permissions
- Check that you're using the correct prefix
- Verify the bot role is high enough in the role hierarchy

## Keeping the Bot Online 24/7

For production deployment, consider:

- **Windows:** Use `pm2` or Task Scheduler
- **Linux:** Use `pm2`, systemd, or screen
- **Cloud Hosting:** 
  - [Railway](https://railway.app)
  - [Heroku](https://heroku.com)
  - [Render](https://render.com)
  - Any VPS (DigitalOcean, Linode, etc.)

### Using PM2 (Recommended)

```powershell
npm install -g pm2
pm2 start src/index.js --name jura-bot
pm2 save
pm2 startup
```

## Need Help?

- Check the [README.md](README.md) for feature documentation
- Review error messages in the console
- Join our support server: [Coming soon]
- Open an issue on GitHub

## Security Notes

⚠️ **Important:**
- Never share your `.env` file or bot token
- Keep your MongoDB credentials secure
- Regularly update dependencies: `npm update`
- Monitor your bot's behavior and logs

---

Congratulations! Your RAPHAEL should now be running. Use `!help` in Discord to see all available commands.
