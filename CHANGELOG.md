# 📝 Changelog

All notable changes to JURA BOT will be documented in this file.

---

## [2.1.0] - 2024-12-11

### 🎮 Advanced Economy & Statistics Update

**Enhanced Economy System (18 Total Commands)**
- ✅ **Adventure System** - Go on adventures with custom NPCs for coin rewards (1hr cooldown)
- ✅ **Reputation System** - Give reputation to other users (24hr per-user cooldown)
- ✅ **Gambling Games** - 4 mini-games: coinflip, slots, dice, roulette
- ✅ **Unified Leaderboards** - View top users for coins, reputation, and levels
- ✅ **Custom Coin System** - Server-customizable coin emoji and name
- ✅ **Admin Coin Awards** - Award coins to specific users (up to 1,000,000)
- ✅ **Enhanced Profiles** - Add description section with custom blur color
- ✅ **Separate Level Command** - Quick rank check without profile description
- ✅ **Gambling Stats Tracking** - Track wins, losses, and total gambled

**Statistics System**
- ✅ **Statbot-Style Interface** - Interactive stats command with filters
- ✅ **Time Range Filters** - View stats for 1d, 7d, 14d, or all-time
- ✅ **Multiple Views** - Messages, voice activity, top channels
- ✅ **Automatic Tracking** - Message and voice session tracking
- ✅ **Daily History** - Keeps 30 days of historical data
- ✅ **Channel Rankings** - See most active channels per user
- ✅ **Server Rankings** - View your rank among all members

**Improved Help System**
- ✅ **Interactive Categories** - Dropdown menu to browse 7 command categories
- ✅ **73 Commands Documented** - All commands with descriptions and usage
- ✅ **Category Filtering** - Explore commands by: Config, Moderation, Economy, Music, Community, Info, Utility
- ✅ **Detailed Command Info** - View aliases, permissions, cooldowns, examples
- ✅ **Refresh Button** - Update help menu without re-running command

**Guild Join Automation**
- ✅ **Auto Profile Recording** - Records all non-bot members when bot joins server
- ✅ **Batch Processing** - Handles large servers efficiently (50 members per batch)
- ✅ **Welcome Message** - Sends setup guide to system channel
- ✅ **Progress Logging** - Shows progress for servers with 100+ members

**Documentation**
- ✅ **Commands List Page** - Interactive HTML page with search and filters
- ✅ **Potential Issues Report** - Analysis of conflicts and performance considerations
- ✅ **Updated Help Command** - Complete rewrite with modern UI

### 🎲 Gambling Games

**Coinflip**
- Bet on heads or tails
- 50% win chance
- 2x payout (doubles your bet)
- Min: 10 coins, Max: 10,000 coins

**Slots**
- 3-reel slot machine with 7 symbols
- Triple 7s: 10x payout
- Triple Diamonds: 7x payout
- Triple Match: 5x payout
- Double Match: 2x payout
- Min: 10 coins, Max: 5,000 coins

**Dice**
- Roll 1-6, guess the number
- 5x payout for correct guess
- Min: 10 coins, Max: 1,000 coins

**Roulette**
- Bet on colors (red/black/green): 2x payout
- Bet on specific number (0-36): 35x payout
- Min: 10 coins, Max: 5,000 coins

### 📊 Statistics Features

**Time Range Filters**
- Last 24 Hours
- Last 7 Days
- Last 14 Days
- All Time

**Stat Views**
- Overview: Messages + Voice Activity with ranks
- Messages: Detailed message stats with daily averages
- Voice Activity: Voice time with daily averages
- Top Channels: Most active channels for the user

**Automatic Tracking**
- Message count per day
- Voice session duration
- Channel activity breakdown
- Last activity timestamps

### 🎨 Profile Enhancements

**New Profile Features**
- Description field (up to 500 characters)
- Custom blur color for description background (rgba format)
- Enhanced profile rendering with description section
- Separate level command for quick rank viewing

**Profile vs Level Commands**
- `!profile` - Full profile with description
- `!level` - Quick rank card without description

### ⚙️ Configuration

**New Config Options**
- Custom coin emoji per server
- Custom coin name per server
- Custom adventure NPC list (default: 15 NPCs)
- Configurable through `!setcoin` command

### 📋 Command Count

**Total Commands: 73**
- Configuration: 6 commands
- Moderation: 5 commands
- Economy: 18 commands (+6 new)
- Music: 26 commands
- Community: 8 commands
- Info: 5 commands (+updated help)
- Utility: 7 commands (+1 new stats)

---

## [2.0.0] - 2024-12-11

### 🎉 Major Feature Release

**Economy System (10 Commands)**
- ✅ Complete coin-based economy
- ✅ Daily rewards with streak bonuses (500 + up to 1000)
- ✅ Timed rewards: hourly (100), work (150), bonus (300)
- ✅ Visual 900x300px profile cards with Canvas
- ✅ Interactive shop (no timeout until purchase/cancel)
- ✅ 12 purchasable backgrounds (common → mythic)
- ✅ Inventory management with [EQUIPPED] status
- ✅ Profile customization (bio, title, colors)
- ✅ Transaction history (last 50)
- ✅ Integration with XP system (coins per message)

**Level/XP System with Visual Rank-Ups**
- ✅ XP gain on messages with cooldown
- ✅ Visual level-up cards with gradient backgrounds
- ✅ Beautiful rank cards with progress bars
- ✅ Leaderboard with pagination
- ✅ Role rewards at specific levels
- ✅ Stats tracking (daily/weekly XP, messages)

**Custom Embed Builder (3 Commands)**
- ✅ Interactive button-based embed builder
- ✅ Template system for reusable embeds
- ✅ Variable support: {user}, {server}, etc.
- ✅ User avatar integration

**Bot Monitoring & Health Checks**
- ✅ `/health` REST endpoint for external monitoring
- ✅ Real-time bot status (uptime, guilds, users, ping)
- ✅ Database connection status
- ✅ Discord bot status channel with auto-updates
- ✅ Status change notifications (online/offline)
- ✅ Integration ready for Uptime Robot, Pingdom

**Enhanced Setup Command**
- ✅ One-click setup creates 8 channels + 3 roles
- ✅ Channels: mod-log, alert-log, join-log, bot-status, birthdays, events, level-ups, welcome
- ✅ Roles: Sus/Radar, New Account, Muted (with permissions)
- ✅ Auto-enables level, birthday, and event systems
- ✅ 10-15 second setup time

**Music System Updates**
- ✅ Auto-join voice channel on !play
- ✅ No separate !join command needed
- ✅ All 26 commands fully functional

**Documentation**
- ✅ Created DEPLOYMENT.md with complete hosting guide
- ✅ Updated README.md with new features
- ✅ Updated COMMANDS.md with economy & embed commands
- ✅ Updated FEATURES.md with detailed guides
- ✅ Created .env.example

**Technical Improvements**
- ✅ Switched to @napi-rs/canvas for better performance
- ✅ Express server for health monitoring (port 3000)
- ✅ Efficient XP cooldown system
- ✅ Transaction logging system
- ✅ Status monitoring every 60 seconds
- ✅ Canvas rendering with font fallbacks

---

## [1.0.0] - 2024-12-01 (Previous Release)

### 🎵 Added - Music System

**Complete Music Player**
- Multi-source support: YouTube, Spotify, SoundCloud
- discord-player v6.6.6 with @discord-player/extractor v4.4.5
- play-dl v1.9.7 for enhanced compatibility
- ytdl-core v4.11.5 for high-quality audio

**26 Music Commands Implemented:**

*Playback Control (6 commands):*
- `play` - Play from YouTube/Spotify/SoundCloud URLs or search
- `pause` - Pause current track
- `resume` - Resume paused track
- `skip` - Skip to next track
- `stop` - Stop and disconnect
- `previous` - Play previous track from history

*Queue Management (7 commands):*
- `queue` - Paginated queue display (10 tracks per page)
- `clear` - Remove all tracks from queue
- `remove` - Remove specific track by position
- `move` - Reorder tracks in queue
- `swap` - Swap two track positions
- `shuffle` - Randomize queue order
- `skipto` - Jump to specific queue position

*Navigation & Seeking (3 commands):*
- `seek` - Jump to timestamp (supports MM:SS and seconds)
- `forward` - Skip forward X seconds
- `backward` - Rewind X seconds

*Information & Search (2 commands):*
- `nowplaying` - Current track with progress bar visualization
- `search` - Interactive search with top 10 results selection

*Audio Filters (8 commands):*
- `filters` - Manage filters (list/add/remove/clear)
- `bassboost` - Bass enhancement (off/low/medium/high)
- `8d` - 8D audio effect (best with headphones)
- `nightcore` - Higher pitch and faster tempo
- `vaporwave` - Lower pitch and slower tempo
- `karaoke` - Reduce vocals for karaoke
- Plus 15+ additional FFmpeg filters available

*Settings & Control (2 commands):*
- `volume` - Control volume (0-200%)
- `loop` - Set loop mode (off/track/queue/autoplay)

**Music System Features:**
- Playlist support (adds all tracks from YouTube/Spotify playlists)
- Auto-detection of source type (URL or search query)
- Voice channel validation and same-channel enforcement
- Progress bar visualization with Unicode characters
- Auto-disconnect after 5 minutes of inactivity
- Queue metadata tracking (requester, channel)
- Event-driven announcements (track start, queue add, errors)
- Helper functions for duration formatting and validation
- Support for 19 audio filters via FFmpeg
- Volume range 0-200% with dynamic emoji indicators
- History tracking for previous track playback

**Music Player Utility:**
- Created `src/utils/musicPlayer.js` with:
  - Player initialization and extractor loading
  - Event handlers: playerStart, audioTrackAdd, playerError, emptyQueue, emptyChannel
  - Helper functions: checkVoiceChannel, checkBotInVoice, checkSameVoiceChannel
  - Utility functions: formatDuration, createProgressBar
  - High-quality audio configuration (highestaudio, audioonly filter)

### 🎉 Added - Community Features

**Birthday System**
- Added birthday tracking with privacy controls
- Set birthdays with `!setbirthday <month> <day> [year]`
- Support for "fake" birthdays (--fake flag)
- Privacy option to hide age (--private flag)
- Celebration preferences: public, dm, role, or none
- Daily cron job checks birthdays at midnight
- Auto-assigns birthday role for 24 hours
- Customizable birthday messages with {user} placeholder
- Commands: `setbirthday`, `birthdays`, `birthdaypreference`, `removebirthday`
- New Birthday model with full history tracking

**Event System**
- Server event scheduling with notifications
- Create events with `!createevent <time> | <title> | [description]`
- RSVP system for participant tracking
- Automatic reminders 15 minutes before events
- Role-based notification pings
- Recurring events support (daily/weekly/monthly/yearly)
- Discord timestamp integration
- Minute-by-minute notification checking
- Commands: `createevent`, `events`, `joinevent`, `cancelevent`
- New Event model with reminder management

**Level/XP System** (Database Ready)
- New Level model for XP progression
- Configurable XP rates and cooldowns
- Role rewards at level milestones
- Daily and weekly XP tracking
- Leaderboard queries
- XP formula: 100 × Level^1.5

### 🛡️ Enhanced - Auto-Moderation (Database Ready)

**Spam Detection**
- Track message rate per user
- Configurable message limit and time window
- Actions: warn → mute → kick
- Per-user message tracking with timestamps

**Bad Word Filtering**
- Custom word list per server
- Case-insensitive matching
- Configurable actions: delete, warn, mute
- Automatic logging

**Role Mention Spam Prevention**
- Cooldown tracking per user
- Prevents rapid @role mentions
- Protects @everyone and @here
- Staff exemption

**Auto-Mute System**
- Escalating mute durations
- Duration parsing (10m, 1h, 1d)
- Automatic unmute scheduling
- Mute history tracking

### 🗂️ Database Updates

**New Models**
- `Birthday.js` - Birthday tracking with preferences and privacy
- `Event.js` - Event scheduling with notifications and reminders
- `Level.js` - XP/Level progression with leaderboards
- `Ticket.js` - Support ticket system (prepared)
- `CustomCommand.js` - Custom command storage (prepared)

**Updated Models**
- `Guild.js` - Expanded with 10+ new feature configurations:
  - birthdaySystem (channel, role, message)
  - eventSystem (channel, notifications)
  - levelSystem (XP rates, role rewards, level-up messages)
  - ticketSystem (category, max tickets, support roles)
  - welcomeSystem (channel, message, embed options)
  - verificationSystem (type: button/reaction/captcha)
  - reactionRoles (message/emoji/role mappings)
  - autoMute (enabled, default duration)
  - Enhanced autoMod (spam detection, bad words, role spam)

### 🔧 Technical Improvements

**New Dependencies**
- `node-cron` v3.0.3 - Scheduled task management
- `canvas` v2.11.2 - Image generation for rank cards
- `discord-player` v6.6.6 - Music system support
- `@discord-player/extractor` v4.4.5 - Official multi-source extractors
- `play-dl` v1.9.7 - Enhanced source compatibility
- `ytdl-core` v4.11.5 - YouTube downloads
- ~~`simple-youtube-api` v5.2.1~~ - Removed (replaced by extractors)

**Scheduler System**
- New `schedulers.js` utility with 3 cron jobs:
  - Daily birthday checker (midnight)
  - Event notification checker (every minute)
  - Birthday role remover (11:59 PM)
- Integrated into main bot initialization

**Code Organization**
- New `commands/community/` folder with 8 commands
- Prepared folders for: levels, tickets, music
- Scalable command structure

### 📚 Documentation Updates

**Updated Files**
- `README.md` - Added all new features to overview
- `FEATURES.md` - Complete documentation for birthday, event, auto-mod, levels
- `COMMANDS.md` - Added 30+ new command references
- `QUICKSTART.md` - Added community feature quick setup
- `PROJECT_STRUCTURE.md` - Updated with new models and commands
- `CHANGELOG.md` - Created this changelog

**New Sections**
- Birthday system guide with examples
- Event system guide with time parsing
- Level/XP system mechanics
- Ticket system documentation
- Custom commands guide
- Reaction roles setup
- **Complete music system documentation (26 commands)**
- Implementation status and roadmap
- Feature comparison table

### 📝 Implementation Summary

**Fully Complete Systems:**
- ✅ Core security & moderation (30+ commands)
- ✅ Birthday system (4 commands, daily cron)
- ✅ Event system (4 commands, minute cron)
- ✅ **Music system (26 commands, multi-source support)**
- ✅ Configuration system (10+ commands)

**Database Ready (Awaiting Commands):**
- 🔄 Level/XP system (schema complete)
- 🔄 Ticket system (schema complete)
- 🔄 Custom commands (schema complete)

**Planned Features:**
- 📋 Verification system (button/reaction/captcha)
- 📋 Welcome messages with images
- 📋 Reaction roles system
- 📋 Auto-mod message handlers (spam/badwords/role-spam)

### 🎨 Configuration

**New Channel Types**
- `birthday` - Birthday announcements
- `events` - Event notifications
- `tickets` - Ticket category
- `welcome` - Welcome messages
- `verification` - Verification channel

**New Role Types**
- `birthday` - 24-hour birthday role
- `support` - Support team
- `verified` - Verified members

**New Config Options**
- `levelenabled` - Toggle XP system
- `tickets` - Toggle ticket system
- `verification` - Toggle verification
- `welcome` - Toggle welcome messages
- `antispam` - Toggle spam detection
- `badwords` - Toggle word filter
- `antirolespam` - Toggle role spam prevention
- `automute` - Toggle auto-mute
- `xppermessage` - XP per message
- `xpcooldown` - XP gain cooldown
- `spammessagelimit` - Spam message threshold
- `spamtimewindow` - Spam time window
- `rolespamc cooldown` - Role mention cooldown

---

## [1.0.0] - 2025-12-10

### Initial Release

**Core Features**
- Invite link verification system
- Member history tracking with sus detection
- Account age verification
- Moderation commands (warn, kick, ban, purge)
- Configuration system (prefix, roles, channels)
- Information commands (help, userinfo, serverinfo, checkuser)
- MongoDB integration
- Styled embeds with Unicode glyphs
- Join/leave event tracking
- Invite cache management

**Security Systems**
- Suspicious member detection (4+ joins threshold)
- New account detection (<24h threshold)
- Staff alert system
- Moderation logging

**Database Models**
- Guild configuration
- Member tracking
- Mod logs
- Invite tracking

**Documentation**
- Complete installation guide
- Features documentation
- Command reference
- Quick start guide
- Project structure overview

---

## Legend

- 🎉 **Added** - New features
- 🛡️ **Enhanced** - Improved existing features
- 🔧 **Technical** - Behind-the-scenes improvements
- 🗂️ **Database** - Database schema changes
- 📚 **Documentation** - Documentation updates
- 🐛 **Fixed** - Bug fixes
- 🎨 **Configuration** - New config options
- ⚠️ **Deprecated** - Features marked for removal
- 🚨 **Breaking** - Breaking changes

---

**Note:** Features marked as "Database Ready" have the schema and configuration in place but require command/event implementation to be fully functional.
