# 🎯 Quick Start Guide

Get JURA BOT up and running in 5 minutes!

## 1️⃣ Prerequisites Check

Make sure you have:
- ✅ Node.js 18+ installed: `node --version`
- ✅ MongoDB running (local or Atlas account)
- ✅ Discord Bot Token ready

## 2️⃣ Quick Install

```powershell
# Clone or download the repository
cd jura-bot

# Install dependencies
npm install

# Copy environment file
Copy-Item .env.example .env

# Edit .env with your credentials (use notepad or any text editor)
notepad .env
```

## 3️⃣ Configure .env File

Open `.env` and fill in these 3 required values:

```env
DISCORD_TOKEN=paste_your_bot_token_here
CLIENT_ID=paste_your_client_id_here
MONGODB_URI=mongodb://localhost:27017/jura_bot
```

**Where to find these:**
- **DISCORD_TOKEN**: Discord Developer Portal → Your App → Bot → Token → Copy
- **CLIENT_ID**: Discord Developer Portal → Your App → General Information → Application ID
- **MONGODB_URI**: Use the one above for local, or your MongoDB Atlas connection string

## 4️⃣ Start the Bot

```powershell
npm start
```

You should see: `✅ Logged in as JURA BOT#1234` and `🚀 Bot is ready!`

## 5️⃣ Setup Your Server

In your Discord server, type:

```
!setup
```

This creates all necessary roles and channels automatically!

## 🎉 You're Done!

Try these commands:
- `!help` - See all commands
- `!config` - View settings
- `!ping` - Test the bot
- `!serverinfo` - Server information
- `!setbirthday 1 1` - Set your birthday
- `!events` - View upcoming events

## ⚙️ Quick Configuration

### Basic Setup
```
!setprefix ?                    # Change prefix to ?
!setrole staff @Moderator       # Add staff role
!config susthreshold 5          # Set sus detection threshold
!setchannel modlog #mod-logs    # Set mod log channel
```

### Community Features
```
!setchannel birthday #birthdays        # Birthday announcements
!setrole birthday @Birthday            # Birthday role
!setchannel events #events             # Event notifications
!setchannel welcome #welcome           # Welcome messages
!config welcome on                     # Enable welcomes
```

### Auto-Moderation
```
!config antispam on                    # Enable spam detection
!config badwords on                    # Enable word filter
!config antirolespam on                # Prevent role spam
!config automute on                    # Enable auto-mute
```

### Engagement Systems
```
!config levelenabled on                # Enable XP/Levels
!config xppermessage 15                # XP per message
!config tickets on                     # Enable tickets
!setchannel tickets @TicketCategory    # Ticket category
```

## 🔧 Troubleshooting

**Bot offline?**
- Check your token in `.env`
- Ensure MongoDB is running
- Check console for errors

**Commands not working?**
- Verify bot has Administrator permission
- Check you're using the right prefix (default: `!`)
- Make sure Message Content Intent is enabled

**Setup failed?**
- Give bot Administrator permission
- Try `!setup` again

## 📚 Next Steps

- Read [INSTALLATION.md](INSTALLATION.md) for detailed setup
- Read [README.md](README.md) for all features
- Configure advanced settings with `!config`
- Customize roles with `!setrole`

## 🆘 Need Help?

Check the console for error messages - they usually tell you exactly what's wrong!

Common issues:
- `Invalid token` → Check your DISCORD_TOKEN
- `Connection refused` → Start MongoDB or check your MONGODB_URI
- `Missing permissions` → Give bot Administrator role

---

**Pro Tip:** Use `npm run dev` instead of `npm start` during setup - it auto-restarts when you make changes!
