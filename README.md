# 🎮 JURA BOT - Multi-Purpose Discord Bot

A powerful, feature-rich Discord bot with advanced moderation, customization, and security features. Combines the best features of Carl-bot, Ciel, and Dyno with additional unique capabilities including a full economy system, visual rank cards, and comprehensive monitoring.

## ✨ Key Features

### 🛡️ Advanced Security & Moderation
- **Invite Link Verification** - Automatically detects and manages invite links
- **Member History Tracking** - Tracks join/leave patterns with suspicious activity detection
- **Account Age Verification** - Identifies new accounts and assigns custom roles
- **Raid Protection** - Detects suspicious join patterns and alerts staff
- **Enhanced Auto-Mod** - Spam detection, bad word filtering, role mention spam prevention
- **Auto-Mute System** - Automatic muting for repeated violations

### 🎉 Community Engagement
- **Birthday System** - Track birthdays with customizable celebrations (public/DM/role/none)
- **Event Notifications** - Schedule events with role-based notifications and reminders
- **Level/XP System** - Visual rank-up messages with Canvas, role rewards, leaderboards
- **Economy System** - Coins, daily rewards, timed rewards, shop, inventory, profile customization
- **Custom Embeds** - Create reusable embed templates with variables and avatars
- **Reaction Roles** - Assign roles via emoji reactions

### 💰 Economy & Profiles
- **Coin System** - Earn coins through messages, daily rewards, adventures, and gambling
- **Daily Rewards** - Streak bonuses up to 1000 coins (base 500 + streak bonus)
- **Adventure System** - Go on adventures with NPCs for random coin rewards (1hr cooldown)
- **Reputation System** - Give +1 reputation to other users (24hr per-user cooldown)
- **Gambling Games** - 4 mini-games: coinflip (2x), slots (10x), dice (5x), roulette (35x)
- **Custom Coins** - Server-customizable coin emoji and name
- **Admin Tools** - Award coins to specific users (up to 1,000,000)
- **Visual Profile Cards** - Canvas-based 900x300px cards with custom backgrounds
- **Enhanced Profiles** - Bio, title, description (500 chars), custom blur colors
- **Shop System** - Interactive shop with 12 backgrounds (common to mythic rarity)
- **Inventory** - Track purchased items with timestamps and equipped status
- **Multiple Leaderboards** - View top users for coins, reputation, and levels
- **Transaction History** - Last 50 transactions logged with type and description

### 🎫 Support & Management
- **Ticket System** - Complete support ticket system with transcripts and ratings
- **Verification System** - Button/reaction/captcha verification for new members
- **Welcome Messages** - Customizable welcome messages with embeds and DMs

### 🎵 Music System (26 Commands)
- **Multi-Source Playback** - Play from YouTube, Spotify, and SoundCloud
- **Auto-Join** - Bot automatically joins your voice channel on !play
- **Complete Queue Management** - Skip, pause, resume, shuffle, clear, move, swap
- **Advanced Navigation** - Seek, forward, backward, skip to position, previous track
- **Audio Filters** - Bass boost, 8D, nightcore, vaporwave, karaoke, and 15+ more
- **Interactive Search** - Search and select from top 10 results
- **Loop Modes** - Loop track, queue, or disable
- **Volume Control** - Adjust volume from 0-200%
- **Real-Time Info** - Now playing with progress bar, queue with pagination

### 🎨 Customization
- **Custom Prefix** - Set your own command prefix per server
- **Dynamic Role Assignment** - Configure custom roles for different security levels
- **Stylish Embeds** - Beautiful embeds with glyphs and custom fonts
- **Configurable Thresholds** - Adjust sensitivity for all detection systems
- **One-Click Setup** - !setup command creates all channels and roles automatically

### 📊 Statistics & Analytics
- **Interactive Stats Command** - Statbot-style interface with dropdown filters
- **Time Range Filters** - View stats for 1d, 7d, 14d, or all-time
- **Multiple Views** - Messages, voice activity, top channels
- **Automatic Tracking** - Message and voice session tracking (30 days history)
- **Channel Rankings** - See most active channels per user
- **Server Rankings** - View your rank among all members
- **Gambling Statistics** - Track wins, losses, and total amount gambled

### 📊 Data Logging & Monitoring
- Member join/leave events with full history
- Invite link tracking
- Suspicious activity logs
- Moderation actions with case numbers
- Birthday and event tracking
- XP and level progression
- Ticket transcripts and ratings
- Economy transactions (last 50 kept)
- Message and voice activity history (30 days)
- **Bot Status Monitoring** - Dedicated channel with uptime/downtime alerts
- **Health Endpoint** - `/health` endpoint for external monitoring (Uptime Robot, etc.)
- **Guild Join Recording** - Auto-records all member profiles when bot joins server

### 🔧 Moderation Tools
- Kick, Ban, Mute, Warn with duration support
- Slowmode management
- Message purge with filters
- Auto-moderation rules (spam, bad words, role spam)
- Staff alert system with detailed logs

## 🚀 Setup

### Prerequisites
- Node.js v18 or higher
- MongoDB (local or Atlas)
- Discord Bot Token

### Installation

1. Clone the repository:
\`\`\`bash
git clone https://github.com/GhazanfarAteeb/jura-bot.git
cd jura-bot
\`\`\`

2. Install dependencies:
\`\`\`bash
npm install
\`\`\`

3. Configure environment variables:
\`\`\`bash
cp .env.example .env
\`\`\`

Edit `.env` and add your credentials:
- `DISCORD_TOKEN` - Your Discord bot token
- `CLIENT_ID` - Your Discord application client ID
- `MONGODB_URI` - Your MongoDB connection string
- `PORT` - Port for health check server (default: 3000)
- `DEFAULT_PREFIX` - Default command prefix (default: !)

4. (Optional) Download Poppins fonts for visual rank cards:
   - Visit https://fonts.google.com/specimen/Poppins
   - Download Poppins-Bold.ttf and Poppins-Regular.ttf
   - Place them in `src/assets/fonts/`
   - Bot will work with system fonts if custom fonts are not available

5. Start the bot:
\`\`\`bash
npm start
\`\`\`

For development with auto-reload:
\`\`\`bash
npm run dev
\`\`\`

### Health Monitoring

The bot includes a health check endpoint at `http://localhost:3000/health` (or your configured PORT).

Response format:
\`\`\`json
{
  "status": "online",
  "uptime": 3600,
  "uptimeFormatted": "1h",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "bot": {
    "ready": true,
    "guilds": 5,
    "users": 1500,
    "ping": 45
  },
  "database": {
    "connected": true
  }
}
\`\`\`

Use this with monitoring services like Uptime Robot, Pingdom, or StatusCake.

## 📝 Configuration

### Setting Up the Bot

1. **Set Prefix**: `!setprefix <new_prefix>`
2. **Configure Sus Detection**: `!config susthreshold <number>` (default: 4)
3. **Set New Account Role**: `!config newaccountrole <role_name>`
4. **Set Sus Role**: `!config susrole <role_name>`
5. **Enable/Disable Features**: `!config <feature> <on/off>`

### Initial Setup Commands
\`\`\`
!setup           - Run one-click server setup (creates all channels, roles, enables features)
!config          - View current configuration
!help            - Display all commands
\`\`\`

**What !setup creates:**
- Roles: 🚨 Sus/Radar, 🥚 New Account, 🔇 Muted
- Channels: 🔨-mod-log, 🚨-alert-log, 📥-join-log, 🤖-bot-status, 🎂-birthdays, 📅-events, 🎉-level-ups, 👋-welcome
- Enables: Level system, birthday system, event system
- Configures: All permissions for muted role

## 📚 Commands

### Moderation (20+ commands)
- `!ban <user> [reason]` - Ban a member
- `!kick <user> [reason]` - Kick a member
- `!warn <user> [reason]` - Warn a member
- `!mute <user> [duration] [reason]` - Mute a member
- `!unmute <user>` - Unmute a member
- `!purge <amount> [@user]` - Delete messages
- `!slowmode <seconds>` - Set channel slowmode
- `!warnings <user>` - View user warnings

### Configuration (15+ commands)
- `!setprefix <prefix>` - Change bot prefix
- `!config` - View/edit server configuration
- `!setup` - One-click server setup with all channels/roles
- `!setrole <type> <role>` - Set custom roles
- `!setchannel <type> <#channel>` - Set channel purposes
- `!setlevel <on/off>` - Enable/disable level system
- `!setlevelchannel <#channel>` - Set level-up announcement channel

### Community (10+ commands)
- `!setbirthday <month> <day> [year]` - Set your birthday
- `!birthdays [days]` - View upcoming birthdays
- `!birthdaypreference <public|dm|role|none>` - Set celebration preference
- `!createevent <time> | <title> | [description]` - Create an event
- `!events` - View upcoming events
- `!joinevent <id>` - Join an event
- `!cancelevent <id>` - Cancel an event
- `!rank [@user]` - View visual rank card with level/XP
- `!leaderboard [page]` - View server XP leaderboard

### Economy (18 commands)
- `!daily` - Claim daily reward (500 base + up to 1000 streak bonus)
- `!hourly` - Claim hourly reward (100 coins)
- `!work` - Work for coins (150 coins, 30min cooldown)
- `!bonus` - Claim bonus (300 coins, 2hr cooldown)
- `!adventure` - Go on adventure for random coins (1hr cooldown)
- `!balance [@user]` - View coin balance
- `!profile [@user]` - View full profile card with description
- `!level [@user]` - View rank card without description
- `!shop` - Browse shop (interactive, no timeout)
- `!inventory` - View purchased items
- `!setbackground <id>` - Apply purchased background
- `!setprofile <setting> <value>` - Customize profile (bio, title, description, blur color)
- `!rep <@user>` - Give reputation (24hr cooldown per user)
- `!top <coins|rep|level>` - View leaderboards
- `!coinflip <amount> <heads|tails>` - Flip a coin (2x payout)
- `!slots <amount>` - Play slot machine (up to 10x payout)
- `!dice <amount> <1-6>` - Roll dice (5x payout)
- `!roulette <amount> <color|number>` - Spin roulette (2x-35x payout)
- `!addcoins <@user> <amount>` - Award coins (Admin only)

### Custom Embeds (3 commands)
- `!embed` - Create custom embed with interactive builder
- `!embedset <name>` - Save embed as template
- `!embedhelp` - View embed builder help

### Music (26 commands)
- `!play <song|url>` - Play music (auto-joins VC)
- `!pause/resume` - Pause/resume playback
- `!skip [amount]` - Skip track(s)
- `!queue [page]` - View queue
- `!nowplaying` - Current track info
- `!volume <0-200>` - Adjust volume
- `!loop <off|track|queue>` - Set loop mode
- `!shuffle` - Shuffle queue
- `!filters` - View/apply audio filters
- And 17 more music commands...

### Support
- `!ticket` - Create a support ticket
- `!close [reason]` - Close a ticket
- `!claim` - Claim a ticket
- `!transcript` - Get ticket transcript

### Information & Utility
- `!userinfo <user>` - Get user information
- `!serverinfo` - Get server information
- `!checkuser <user>` - Check user for suspicious activity
- `!userhistory <user>` - View username change history
- `!help [command]` - Interactive help menu with categories
- `!stats [@user]` - View detailed statistics with filters
- `!ping` - Check bot latency

### Music
- `!play <song/url>` - Play from YouTube, Spotify, or SoundCloud
- `!search <query>` - Search and select from results
- `!pause` / `!resume` - Pause/resume playback
- `!skip` / `!previous` - Navigate tracks
- `!stop` - Stop and disconnect
- `!queue` - View paginated queue (10 per page)
- `!nowplaying` - Current track with progress bar
- `!volume [0-200]` - Adjust volume
- `!loop [off/track/queue]` - Set loop mode
- `!shuffle` - Randomize queue
- `!clear` - Clear entire queue
- `!remove <position>` - Remove specific track
- `!move <from> <to>` - Reorder tracks
- `!swap <pos1> <pos2>` - Swap two tracks
- `!seek <time>` - Jump to timestamp (e.g., 1:30)
- `!forward <seconds>` - Skip forward
- `!backward <seconds>` - Rewind
- `!skipto <position>` - Jump to queue position
- `!filters [list/add/remove/clear]` - Manage audio filters
- `!bassboost [off/low/medium/high]` - Bass enhancement
- `!8d` - Toggle 8D audio effect
- `!nightcore` - Higher pitch and faster
- `!vaporwave` - Lower pitch and slower
- `!karaoke` - Reduce vocals

### Custom
- `!customcommand add <name> <response>` - Create custom command
- `!customcommand remove <name>` - Remove custom command
- `!customcommand list` - List all custom commands

## 🔒 Security Features Explained

### Invite Link Verification
Automatically detects when members post invite links and:
- Logs the event
- Can auto-delete based on configuration
- Alerts moderators
- Tracks repeat offenders

### Past Data Verification
Tracks member history including:
- Join/leave count
- Join timestamps
- Sus level calculation (based on join patterns)
- Automatic role assignment for suspicious accounts

### Account Age Check
Identifies new accounts (< 24 hours old) and:
- Assigns configurable "new account" role (e.g., 🥚 Egg)
- Alerts staff for manual review
- Tracks account creation date

## 🎨 Embed Styling

The bot features beautiful embeds with:
- Custom glyphs and Unicode characters
- Color-coded messages (success, warning, error, info)
- Professional formatting
- Dynamic content

## 🗃️ Database Structure

Uses MongoDB with the following collections:
- `guilds` - Server configurations (expanded with 10+ feature systems)
- `members` - Member history and tracking
- `modlogs` - Moderation action logs
- `invites` - Invite tracking
- `birthdays` - Birthday system data
- `events` - Event scheduling
- `levels` - XP/Level progression (schema ready)
- `tickets` - Support tickets (schema ready)
- `customcommands` - Custom commands (schema ready)

## 📊 Current Status

**✅ Fully Implemented:**
- Core security & moderation
- Birthday system with cron jobs
- Event system with notifications
- **Music system with 26 commands** (YouTube, Spotify, SoundCloud)
- Audio filters and effects (bass boost, 8D, nightcore, etc.)
- Configuration & customization
- Database schemas for all features

**🔄 In Progress:**
- Auto-mod enhancements (spam/badwords/role-spam)
- Level/XP system commands
- Message XP gain integration

**📋 Planned:**
- Ticket system commands
- Verification system
- Welcome messages
- Reaction roles
- Custom commands

See [CHANGELOG.md](CHANGELOG.md) for detailed updates and [FEATURES.md](FEATURES.md) for implementation roadmap.

## 📖 Documentation

- **[FEATURES.md](FEATURES.md)** - Complete feature documentation
- **[COMMANDS.md](COMMANDS.md)** - All commands reference
- **[INSTALLATION.md](INSTALLATION.md)** - Detailed setup guide
- **[QUICKSTART.md](QUICKSTART.md)** - Quick 5-minute setup
- **[PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md)** - Code organization
- **[CHANGELOG.md](CHANGELOG.md)** - Version history
- **[VISUAL_GUIDE.md](VISUAL_GUIDE.md)** - Visual examples

## 🎯 Why Choose JURA BOT?

### Open Source & Self-Hosted
- ✅ **Free Forever** - No premium tiers or paywalls
- ✅ **Full Control** - Your data stays on your server
- ✅ **Customizable** - Modify any feature to your needs
- ✅ **No Limits** - No usage restrictions or rate limits

### Unique Features
- 🎂 **Birthday System** - The only bot with fake birthday support and granular preferences
- 🚨 **Sus Detection** - Advanced join pattern analysis not found in other bots
- 📊 **Complete History** - Track every member join/leave with full context
- 🎯 **Account Age** - Automatic new account detection and role assignment

### Privacy First
- 🔒 All data stored in your own MongoDB database
- 🔒 No third-party analytics or data collection
- 🔒 Full GDPR compliance control
- 🔒 You own your data completely

### Active Development
- 🚀 Regular updates with new features
- 🐛 Quick bug fixes and improvements
- 💡 Community-driven feature requests
- 📚 Comprehensive documentation

## 🤝 Contributing

Contributions are welcome! Feel free to:
- 🐛 Report bugs via GitHub Issues
- 💡 Suggest new features
- 🔧 Submit pull requests
- 📖 Improve documentation
- ⭐ Star the repository

### Development Setup
```bash
# Fork and clone the repository
git clone https://github.com/YOUR_USERNAME/jura-bot.git
cd jura-bot

# Install dependencies
npm install

# Configure environment
cp .env.example .env

# Run in development mode
npm run dev
```

## 📄 License

ISC License - See [LICENSE](LICENSE) file for details

## 💬 Support

Need help? We've got you covered:
- 📚 Check the [documentation](FEATURES.md) first
- 🐛 [Open an issue](https://github.com/GhazanfarAteeb/jura-bot/issues) for bugs
- 💡 [Request features](https://github.com/GhazanfarAteeb/jura-bot/issues) on GitHub
- 📧 Contact: [Your Contact Info]

## 🙏 Acknowledgments

Built with:
- [Discord.js](https://discord.js.org/) - Discord API wrapper
- [MongoDB](https://www.mongodb.com/) - Database
- [Node.js](https://nodejs.org/) - Runtime environment

Inspired by:
- Carl-bot - Reaction roles and moderation
- MEE6 - Level/XP system
- Dyno - Auto-moderation features

## 📈 Roadmap

See [FEATURES.md](FEATURES.md) for complete implementation status and roadmap.

**Coming Soon:**
- 🎫 Full ticket system
- ✅ Verification with captcha
- 👋 Welcome messages with images
- 🎨 Custom commands
- 🆙 Level/XP system UI

---

**⭐ If you find this bot useful, please star the repository!**

Made with ❤️ by [GhazanfarAteeb](https://github.com/GhazanfarAteeb)
