# 📁 Project Structure

```
jura-bot/
│
├── src/
│   ├── index.js                    # Main entry point with scheduler initialization
│   │
│   ├── commands/                   # Command modules
│   │   ├── config/                 # Configuration commands
│   │   │   ├── config.js           # View/edit configuration
│   │   │   ├── setprefix.js        # Change prefix
│   │   │   ├── setrole.js          # Configure roles
│   │   │   ├── setchannel.js       # Configure channels
│   │   │   └── setup.js            # Initial setup wizard
│   │   │
│   │   ├── moderation/             # Moderation commands
│   │   │   ├── warn.js             # Warn members
│   │   │   ├── kick.js             # Kick members
│   │   │   ├── ban.js              # Ban members
│   │   │   └── purge.js            # Bulk delete messages
│   │   │
│   │   ├── community/              # Community engagement commands
│   │   │   ├── setbirthday.js      # Set user birthday
│   │   │   ├── birthdays.js        # View upcoming birthdays
│   │   │   ├── birthdaypreference.js # Birthday celebration preference
│   │   │   ├── removebirthday.js   # Remove birthday
│   │   │   ├── createevent.js      # Create server event
│   │   │   ├── events.js           # List events
│   │   │   ├── joinevent.js        # RSVP to event
│   │   │   └── cancelevent.js      # Cancel event
│   │   │
│   │   ├── levels/                 # XP/Level system (coming soon)
│   │   │   ├── rank.js             # View rank card
│   │   │   ├── leaderboard.js      # Server leaderboard
│   │   │   └── setxp.js            # Admin XP management
│   │   │
│   │   ├── tickets/                # Support tickets (coming soon)
│   │   │   ├── ticket.js           # Create ticket
│   │   │   ├── close.js            # Close ticket
│   │   │   ├── claim.js            # Claim ticket
│   │   │   └── transcript.js       # Generate transcript
│   │   │
│   │   ├── music/                  # Music commands (coming soon)
│   │   │   ├── play.js             # Play music
│   │   │   ├── skip.js             # Skip song
│   │   │   ├── stop.js             # Stop music
│   │   │   ├── queue.js            # View queue
│   │   │   └── nowplaying.js       # Current song
│   │   │
│   │   └── info/                   # Information commands
│   │       ├── help.js             # Help command
│   │       ├── userinfo.js         # User information
│   │       ├── serverinfo.js       # Server information
│   │       ├── checkuser.js        # Security check (staff)
│   │       └── ping.js             # Latency check
│   │
│   ├── events/                     # Event handlers
│   │   ├── ready.js                # Bot ready event
│   │   ├── messageCreate.js        # Message handling, commands, auto-mod
│   │   ├── guildMemberAdd.js       # Member join (security + welcome)
│   │   ├── guildMemberRemove.js    # Member leave tracking
│   │   ├── inviteCreate.js         # Invite cache management
│   │   └── inviteDelete.js         # Invite cache cleanup
│   │
│   ├── models/                     # MongoDB schemas
│   │   ├── Guild.js                # Server configuration (expanded)
│   │   ├── Member.js               # Member tracking data
│   │   ├── ModLog.js               # Moderation logs
│   │   ├── Invite.js               # Invite tracking
│   │   ├── Birthday.js             # Birthday system
│   │   ├── Event.js                # Event scheduling
│   │   ├── Level.js                # XP/Level system
│   │   ├── Ticket.js               # Support tickets
│   │   └── CustomCommand.js        # Custom commands
│   │
│   └── utils/                      # Utility functions
│       ├── embeds.js               # Embed creation & styling
│       ├── helpers.js              # Helper functions
│       └── schedulers.js           # Cron jobs (birthdays, events)
│
├── .env.example                    # Environment variables template
├── .gitignore                      # Git ignore rules
├── package.json                    # Node.js dependencies
│
├── README.md                       # Main documentation
├── INSTALLATION.md                 # Detailed installation guide
├── QUICKSTART.md                   # 5-minute quick start
├── FEATURES.md                     # Complete features documentation
│
├── start.bat                       # Windows launcher script
└── start.sh                        # Linux/Mac launcher script
```

## 📝 File Descriptions

### Core Files

**src/index.js**
- Bot initialization
- Database connection
- Command and event loading
- Error handling

### Commands (src/commands/)

#### Configuration Commands
- **config.js**: View and edit all bot settings
- **setprefix.js**: Change command prefix
- **setrole.js**: Assign custom roles (sus, newaccount, muted, staff)
- **setchannel.js**: Set log channels (modlog, alert, join)
- **setup.js**: Automated initial setup wizard

#### Moderation Commands
- **warn.js**: Issue warnings to members
- **kick.js**: Kick members from server
- **ban.js**: Ban members (supports ban by ID)
- **purge.js**: Bulk delete messages (with user filter)

#### Information Commands
- **help.js**: Display all commands and help
- **userinfo.js**: Detailed user information
- **serverinfo.js**: Server statistics and info
- **checkuser.js**: Security analysis (staff only)
- **ping.js**: Check bot latency

### Events (src/events/)

**ready.js**
- Bot startup confirmation
- Set bot presence/status
- Cache server invites

**messageCreate.js**
- Command handler
- Invite link detection
- Permission checks
- Cooldown management

**guildMemberAdd.js** ⭐ Core Security Feature
- Track join history
- Detect invite used
- Calculate sus level
- Check account age
- Assign roles automatically
- Alert staff of suspicious activity
- Create verification channels

**guildMemberRemove.js**
- Track leave history
- Update member statistics
- Log to join-log channel

**inviteCreate.js / inviteDelete.js**
- Maintain invite cache
- Track invite usage

### Models (src/models/)

**Guild.js** ⭐ Expanded
- Server configuration
- Feature toggles (10+ systems)
- Role/channel assignments
- Auto-mod settings (spam, badwords, role-spam)
- Birthday system config
- Event system config
- Level/XP system config
- Ticket system config
- Welcome system config
- Verification system config
- Reaction roles config
- Embed styling preferences

**Member.js**
- Join/leave history
- Sus level calculation
- Account age tracking
- Moderation history
- Invite link tracking
- Staff notes

**ModLog.js**
- Moderation action logs
- Case number tracking
- Moderator attribution

**Invite.js**
- Invite code tracking
- Usage statistics
- Inviter information

**Birthday.js** 🎉 NEW
- Birthday tracking (month/day/year)
- Privacy settings (fake birthdays, hide age)
- Celebration preferences (public/dm/role/none)
- Custom messages
- Celebration history

**Event.js** 📅 NEW
- Event scheduling
- Notification settings
- Role-based notifications
- Recurring events support
- Participant tracking
- Reminder management

**Level.js** 📊 NEW
- XP/Level progression
- Message count tracking
- Daily/weekly XP stats
- Leaderboard queries
- Role rewards tracking
- Level-up history

**Ticket.js** 🎫 NEW
- Ticket management
- Status tracking (open/claimed/closed)
- Priority levels
- Message transcripts
- Rating system
- Staff assignment

**CustomCommand.js** 🎨 NEW
- Custom command storage
- Response types (text/embed/reaction)
- Permission requirements
- Cooldown management
- Usage statistics
- Alias support

### Utilities (src/utils/)

**embeds.js**
- Styled embed creation
- Glyph system (Unicode icons)
- Color schemes
- Pre-built embed types (success, error, warning, info)
- Special embeds (sus alert, new account, mod log)

**helpers.js**
- Permission checking
- Staff role detection
- Duration parsing/formatting (10m, 1h, 1d, etc.)
- Invite link extraction
- Text formatting utilities

**schedulers.js** ⏰ NEW
- Birthday checking (daily at midnight)
- Event notifications (every minute)
- Birthday role removal (daily at 11:59 PM)
- Cron job management
- Automated task scheduling

## 🔧 Configuration Files

**.env**
- Bot token and credentials
- MongoDB connection string
- Default settings

**package.json**
- Dependencies (discord.js, mongoose, express, etc.)
- Scripts (start, dev)
- Project metadata

## 📚 Documentation Files

**README.md**
- Project overview
- Feature list
- Quick installation
- Command reference
- Support info

**INSTALLATION.md**
- Detailed step-by-step setup
- Discord bot creation
- MongoDB setup (local & Atlas)
- Troubleshooting
- 24/7 hosting options

**QUICKSTART.md**
- 5-minute setup guide
- Essential commands
- Quick troubleshooting

**FEATURES.md**
- Complete feature documentation
- Configuration examples
- Use cases & scenarios
- Best practices
- Future roadmap

## 🚀 Launcher Scripts

**start.bat** (Windows)
- Check Node.js installation
- Create .env if missing
- Install dependencies
- Start bot

**start.sh** (Linux/Mac)
- Same as start.bat but for Unix systems
- Requires execute permission: `chmod +x start.sh`

## 📊 Data Flow

```
Discord Event
    ↓
Event Handler (src/events/)
    ↓
Database Operation (src/models/)
    ↓
Embed Generation (src/utils/embeds.js)
    ↓
Discord Response
```

## 🔐 Security Architecture

```
Member Joins
    ↓
┌─────────────────────────────────┐
│   Invite Tracking                │ → Log to database
│   (Which invite was used?)       │
└─────────────────────────────────┘
    ↓
┌─────────────────────────────────┐
│   Account Age Check              │ → Assign role if new
│   (< 24 hours old?)              │ → Alert staff
└─────────────────────────────────┘
    ↓
┌─────────────────────────────────┐
│   History Analysis               │ → Calculate sus level
│   (Join/leave patterns)          │ → Check threshold
└─────────────────────────────────┘
    ↓
┌─────────────────────────────────┐
│   Action Taken                   │ → Assign sus role
│   (If suspicious)                │ → Alert staff
│                                  │ → Create verification channel
└─────────────────────────────────┘
```

## 🎯 Command Flow

```
User sends: !warn @user reason
    ↓
messageCreate.js
    ↓
Parse command & args
    ↓
Check permissions
    ↓
Check cooldown
    ↓
Execute warn.js
    ↓
├─ Update database (Member model)
├─ Create mod log (ModLog model)
├─ Send DM to user
├─ Log to mod-log channel
└─ Confirm to moderator
```

## 💾 Database Schema

**guilds Collection:**
```javascript
{
  guildId, guildName, prefix,
  features: { inviteVerification, memberTracking, accountAge, autoMod },
  roles: { susRole, newAccountRole, mutedRole, staffRoles },
  channels: { modLog, alertLog, joinLog },
  embedStyle: { color, footer, timestamp, useGlyphs }
}
```

**members Collection:**
```javascript
{
  userId, guildId, username,
  joinHistory: [{ timestamp, inviteCode, inviter }],
  leaveHistory: [{ timestamp, reason }],
  susLevel, isSuspicious, isNewAccount,
  warnings: [{ moderator, reason, timestamp }],
  inviteLinks: [{ link, code, timestamp }]
}
```

**modlogs Collection:**
```javascript
{
  guildId, caseNumber, action,
  moderatorId, targetId,
  reason, duration, timestamp
}
```

---

## 🔄 Adding New Features

### Add a New Command

1. Create file in `src/commands/<category>/<name>.js`
2. Export default object with: name, description, execute function
3. Bot auto-loads on restart

### Add a New Event

1. Create file in `src/events/<eventName>.js`
2. Export default object with: name, execute function
3. Bot auto-loads on restart

### Add Database Field

1. Update schema in `src/models/<Model>.js`
2. Add migration logic if needed
3. Update related commands/events

---

This structure provides maximum modularity, maintainability, and extensibility!
