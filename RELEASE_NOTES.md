# 🎉 RAPHAEL v2.0.0 - Release Summary

## ✨ What's New

### 💰 Full Economy System
- **Daily Rewards**: 500 coins + up to 1000 streak bonus (max 1500/day)
- **Timed Rewards**: Hourly (100), Work (150), Bonus (300)
- **Visual Profiles**: 900x300px Canvas cards with custom backgrounds
- **Shop System**: 12 backgrounds from common (1000) to mythic (10000 coins)
- **Customization**: Bio, title, colors, background, visibility toggles
- **No-Timeout Shop**: Stays open until you buy or close

### 📈 Level & XP System
- **Visual Rank-Ups**: Beautiful gradient cards with avatars
- **Rank Cards**: Progress bars, stats, position
- **Leaderboard**: Paginated with your rank highlighted
- **Role Rewards**: Automatic role assignment at level milestones
- **Integrated Economy**: Earn coins while chatting

### 💬 Custom Embed Builder
- **Interactive Builder**: Button-based interface
- **Templates**: Save and reuse embeds
- **Variables**: {user}, {server}, {members}, {date}, {time}, {user.avatar}
- **Full Customization**: Title, description, fields, colors, images

### 📡 Bot Monitoring
- **Health Endpoint**: `/health` for Uptime Robot, Pingdom, etc.
- **Status Channel**: Auto-updates on online/offline
- **Real-Time Metrics**: Uptime, guilds, users, ping, database status

### 🚀 One-Click Setup
**New !setup command creates:**
- 8 Channels: mod-log, alert-log, join-log, bot-status, birthdays, events, level-ups, welcome
- 3 Roles: Sus/Radar, New Account, Muted (with full permissions)
- Enables: Level system, birthday system, event system
- Time: 10-15 seconds

### 🎵 Music Improvements
- **Auto-Join**: Bot joins your VC automatically on !play
- No separate !join command needed
- All 26 commands fully working

---

## 📊 Complete Feature List

### Commands by Category

**Configuration (5 commands)**
- setup, config, setprefix, setrole, setchannel

**Moderation (20+ commands)**
- ban, kick, warn, mute, unmute, purge, slowmode, warnings, etc.

**Economy (10 commands)**
- daily, hourly, work, bonus, balance, profile, shop, inventory, setbackground, setprofile

**Community (10 commands)**
- Birthday: setbirthday, birthdays, birthdaypreference, removebirthday
- Events: createevent, events, joinevent, leaveevent, cancelevent, editevent

**Level/XP (2 commands)**
- rank, leaderboard

**Custom Embeds (3 commands)**
- embed, embedset, embedhelp

**Music (26 commands)**
- Playback: play, pause, resume, skip, stop, previous
- Queue: queue, clear, remove, move, swap, shuffle, skipto
- Navigation: seek, forward, backward
- Info: nowplaying, search
- Filters: filters, bassboost, 8d, nightcore, vaporwave, karaoke, and more
- Control: loop, volume, autoplay

**Information (5+ commands)**
- help, userinfo, serverinfo, checkuser, history, ping

**Total: 80+ commands**

---

## 🎨 Visual Features

### Profile Cards (900x300px)
- Custom backgrounds (12 available in shop)
- Circular avatar with accent color border
- Username, tag, custom title
- Personal bio (200 chars)
- Stats: coins, streak, rep, messages
- Up to 5 badges displayed
- Dark overlay for readability

### Level-Up Cards (900x300px)
- Purple gradient background (#667eea → #764ba2)
- Circular avatar with white border
- "LEVEL UP!" header
- Username and level info
- Sparkle decorations
- Auto-posted to level-ups channel

### Rank Cards (900x300px)
- Dark theme gradient
- Glow effect on avatar
- Accent bar at top
- Username and stats
- XP progress bar with gradient
- Daily/weekly XP display

---

## 🗂️ Database Models

**11 Total Models:**
1. Guild - Server configuration
2. Member - User data and history
3. ModLog - Moderation logs
4. Level - XP and leveling
5. Economy - Coins and profiles
6. Birthday - Birthday system
7. Event - Event system
8. Ticket - Support tickets
9. Invite - Invite tracking
10. CustomCommand - Custom commands
11. EmbedTemplate - Saved embeds

---

## 📦 Technical Stack

**Core:**
- Node.js 18+
- Discord.js v14.14.1
- MongoDB with Mongoose v8.0.3
- Express v4.18.2 (health endpoint)

**Graphics:**
- @napi-rs/canvas v0.1.44
- Custom fonts: Poppins Bold/Regular

**Music:**
- discord-player v6.6.6
- @discord-player/extractor v4.4.5
- ytdl-core v4.11.5
- play-dl v1.9.7

**Utilities:**
- node-cron v3.0.3 (birthday/event checking)
- ms v2.1.3 (time parsing)
- dotenv v16.3.1

---

## 🚀 Quick Start

### 1. Clone and Install
```bash
git clone https://github.com/GhazanfarAteeb/jura-bot.git
cd jura-bot
npm install
```

### 2. Configure
```bash
cp .env.example .env
# Edit .env with your tokens
```

### 3. Download Fonts (Optional)
- Download Poppins from Google Fonts
- Place Bold and Regular in `src/assets/fonts/`

### 4. Run
```bash
npm start
```

### 5. Setup in Discord
```
!setup
```

---

## 📡 Monitoring Setup

### Uptime Robot
1. Add monitor: `https://your-bot-url/health`
2. Set interval: 5 minutes
3. Enable alerts

### Bot Status Channel
- Automatically created by !setup
- Posts updates on status changes
- Checks every 60 seconds

---

## 🌐 Deployment Options

**Supported Platforms:**
- ✅ Render (Recommended - Free tier)
- ✅ Railway (Easy setup)
- ✅ Heroku (Classic option)
- ✅ VPS (Full control)

See DEPLOYMENT.md for detailed guides.

---

## 📚 Documentation

**Complete Guides:**
- **README.md** - Overview and setup
- **COMMANDS.md** - All 80+ commands detailed
- **FEATURES.md** - Feature documentation
- **DEPLOYMENT.md** - Hosting guide
- **CHANGELOG.md** - Version history
- **.env.example** - Environment template

---

## 🎯 Economy Guide

### Earning Coins
- **Messages**: ~5 coins per message (with XP)
- **Daily**: 500 + streak bonus (claim every 24hr)
- **Hourly**: 100 coins (claim every 60min)
- **Work**: 150 coins (claim every 30min)
- **Bonus**: 300 coins (claim every 120min)

### Spending Coins
**Shop Backgrounds:**
- Default: Free
- Common: 1,000 coins
- Uncommon: 2,000 coins
- Rare: 3,500 coins
- Epic: 5,000 coins
- Legendary: 7,500 coins
- Mythic: 10,000 coins

### Profile Customization
```
!setprofile bio Your awesome bio here
!setprofile title Discord Master
!setprofile color #667eea
!setprofile accent #f093fb
```

---

## 🎮 Level System Guide

### How It Works
- Gain XP for every message (10 XP default)
- 60-second cooldown between XP gains
- Level formula: 100 × Level^1.5
- Visual rank-up cards when leveling up
- Role rewards at configured levels

### Commands
```
!rank [@user]              # View rank card
!leaderboard [page]        # Server leaderboard
```

### Admin Configuration
```
!setlevel on               # Enable system
!setlevelchannel #channel  # Set announcement channel
!addlevelreward 10 @Role   # Add role reward at level 10
```

---

## 🎵 Music Quick Reference

### Basic Usage
```
!play never gonna give you up       # Search and play
!play spotify:track:...              # Spotify track
!pause                               # Pause
!resume                              # Resume
!skip                                # Next track
!queue                               # View queue
```

### Advanced
```
!filters bassboost medium            # Apply filter
!loop track                          # Loop current track
!seek 1:30                           # Jump to 1min 30sec
!shuffle                             # Randomize queue
```

---

## 🆘 Troubleshooting

### Bot Not Responding
1. Check bot is online in server
2. Verify message content intent enabled
3. Try mentioning bot: @BotName
4. Check !help works

### Commands Not Working
1. Verify prefix: !help
2. Check permissions
3. Review error messages
4. Check !config

### Profile Cards Not Showing
1. Install Poppins fonts (optional)
2. Check Canvas installation: `npm list @napi-rs/canvas`
3. Bot will use system fonts as fallback

### Health Endpoint Issues
1. Check PORT environment variable
2. Test locally: `curl http://localhost:3000/health`
3. Verify Express server started

---

## 🔐 Security Notes

- Never commit .env file (already in .gitignore)
- Rotate Discord token regularly
- Use MongoDB Atlas with IP whitelist
- Keep dependencies updated: `npm audit`
- Use environment variables in production

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/GhazanfarAteeb/jura-bot/issues)
- **Documentation**: See docs folder
- **Questions**: [GitHub Discussions](https://github.com/GhazanfarAteeb/jura-bot/discussions)

---

## 🎊 Enjoy RAPHAEL v2.0.0!

**Ready to deploy?** See DEPLOYMENT.md

**Need help?** Check COMMANDS.md and FEATURES.md

**Found a bug?** Open an issue on GitHub

Thank you for using RAPHAEL! 🚀
