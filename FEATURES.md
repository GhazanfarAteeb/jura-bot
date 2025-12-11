# 📋 Features Documentation

Complete guide to all JURA BOT features and capabilities.

---

## 🛡️ Security Features

### 1. Invite Link Verification

**What it does:**
- Automatically detects Discord invite links in messages
- Tracks who posts invite links and when
- Takes configurable actions (log, delete, warn, kick)

**Configuration:**
```
!config inviteverification on/off    # Enable/disable feature
```

**Actions:**
- `log` - Only log to database
- `delete` - Delete the message
- `warn` - Delete + add warning
- `kick` - Delete + kick the user

**Whitelist invites:**
Currently done via database - feature coming soon to whitelist specific server invites.

---

### 2. Member History Tracking & Sus Detection

**What it does:**
- Tracks every time a member joins/leaves your server
- Calculates a "sus level" based on patterns
- Automatically assigns "Sus/Radar" role when threshold is exceeded
- Alerts staff of suspicious activity

**How Sus Level is Calculated:**
- Multiple joins (≥4): +2 per extra join
- High join/leave ratio: +2
- Multiple joins in 7 days (≥3): +3

**Configuration:**
```
!config membertracking on/off         # Enable/disable
!config susthreshold 4                # Set threshold (default: 4)
!setrole sus @SusRole                 # Set custom role
!setchannel alert #alerts             # Set alert channel
```

**What happens at threshold:**
1. Member gets Sus/Radar role
2. Alert posted to alert channel
3. Optional: Creates private channel for staff to interview member
4. Staff can decide to verify, monitor, or take action

**Staff Commands:**
```
!checkuser @user                      # Detailed security analysis
```

---

### 3. Account Age Verification

**What it does:**
- Detects accounts created within X hours (default: 24)
- Automatically assigns "New Account" role (🥚 Egg, 👶 Baby, etc.)
- Alerts staff for manual review
- Helps prevent raid accounts

**Configuration:**
```
!config accountage on/off                  # Enable/disable
!config accountagethreshold 24             # Hours (default: 24)
!setrole newaccount @NewAccountRole        # Custom role
!setchannel alert #new-accounts            # Alert channel
```

**Use Cases:**
- Monitor new accounts during raids
- Apply restricted permissions to new accounts
- Staff interview before full access

---

## 🎉 Community Features

### 1. Birthday System

**What it does:**
- Members can set their birthdays for automatic celebrations
- Daily check at midnight for birthdays
- Customizable celebration preferences
- Privacy controls (fake birthdays, hide age)
- Automatic birthday role assignment/removal

**Commands:**
```
!setbirthday <month> <day> [year] [--fake] [--private]
!birthdays [days]                    # View upcoming birthdays
!birthdaypreference <type>           # public|dm|role|none
!removebirthday                      # Remove your birthday
```

**Examples:**
```
!setbirthday 12 25                   # December 25th
!setbirthday 12 25 2000              # Include year for age
!setbirthday 12 25 --fake            # Fake birthday for privacy
!setbirthday 12 25 --private         # Don't show age
!birthdays 30                        # Show next 30 days
```

**Celebration Preferences:**
- **public** - Announced in birthday channel (default)
- **dm** - Private DM only
- **role** - Birthday role only, no announcement
- **none** - Tracked but not celebrated

**Configuration:**
```
!setchannel birthday #birthdays      # Set birthday channel
!setrole birthday @Birthday          # Birthday role (24h duration)
```

**Features:**
- Customizable birthday messages with {user} placeholder
- Age display (if year provided and not private)
- Birthday role auto-removed at end of day
- Optional custom birthday message per user
- Supports "fake" birthdays for privacy

---

### 2. Event System

**What it does:**
- Schedule server events with notifications
- Role-based notification pings
- Participant tracking (RSVP system)
- Automatic reminders before events
- Recurring events support

**Commands:**
```
!createevent <time> | <title> | [description]
!events                              # List upcoming events
!joinevent <event_id>                # RSVP to event
!cancelevent <event_id>              # Cancel event (staff)
```

**Examples:**
```
!createevent 2h | Movie Night | Join us in VC!
!createevent 1d12h | Tournament | Registration required
!createevent 30m | Quick Meeting
!joinevent 507f1f77bcf86cd799439011
```

**Features:**
- Time-based reminders (15 minutes before by default)
- Discord timestamp formatting (<t:timestamp:F>)
- Notification to all participants
- Role mentions for event notifications
- Event location (channel) support
- Recurring events (daily/weekly/monthly/yearly)
- Participant list with counts
- Auto-cancellation notification

**Configuration:**
```
!setchannel events #events           # Event announcements
```

---

### 3. Level & XP System

**What it does:**
- Reward members for activity with XP and levels
- Customizable XP rates and cooldowns
- Role rewards at level milestones
- Leaderboard system
- Daily/weekly XP tracking

**Commands:**
```
!rank [@user]                        # View rank card
!leaderboard [page]                  # Server leaderboard
!setxp <@user> <amount>              # Set user XP (admin)
!addxp <@user> <amount>              # Add XP (admin)
```

**How XP Works:**
- Earn XP per message (default: 10-25 XP)
- Cooldown between XP gains (default: 60s)
- XP formula: Next Level = 100 × Level^1.5
- Level-up announcements in current channel
- Daily and weekly XP stats tracked

**Configuration:**
```
!config levelenabled on/off          # Toggle system
!config xppermessage 15              # XP per message
!config xpcooldown 60                # Cooldown (seconds)
!config levelupmessage <message>     # Custom level-up message
```

**Role Rewards:**
```
!addlevelreward 5 @Level5            # Role at level 5
!addlevelreward 10 @Level10          # Role at level 10
!removelevelreward 5                 # Remove reward
```

**Features:**
- Beautiful rank cards with Canvas (900x300px)
- Visual level-up messages with gradient backgrounds
- Leaderboard pagination
- User rank position
- Total server messages counted
- Prevent XP farming with cooldown
- Integrated with economy (coins per message)
- Role rewards at specific levels

**Visual Level-Up Cards:**
- Purple gradient background (#667eea → #764ba2)
- Circular avatar with white border
- "LEVEL UP!" header text
- Username and level information
- Decorative sparkle emojis
- Auto-posted to designated channel

---

### 4. Economy System

**What it does:**
- Full coin-based economy with earning and spending
- Visual profile cards with customization
- Daily and timed rewards with streaks
- Shop system with purchasable items
- Inventory tracking with timestamps
- Transaction history (last 50)
- Integration with XP system

**Coin Earning:**
- **Messages**: ~5 coins per message (integrated with XP)
- **Daily Reward**: 500 base + up to 1000 streak bonus (24hr cooldown)
- **Hourly Reward**: 100 coins every 60 minutes
- **Work Command**: 150 coins every 30 minutes  
- **Bonus Command**: 300 coins every 120 minutes

**Commands:**
```
!daily                              # Daily reward with streak
!hourly                             # Hourly reward
!work                               # Work for coins
!bonus                              # Bonus reward
!balance [@user]                    # View balance
!profile [@user]                    # Visual profile card
!shop                               # Browse shop
!inventory                          # View owned items
!setbackground <id>                 # Apply background
!setprofile <setting> <value>       # Customize profile
```

**Profile Customization:**
- **Backgrounds**: 12 purchasable backgrounds (common to mythic)
- **Bio**: Personal bio up to 200 characters
- **Title**: Custom title up to 100 characters
- **Colors**: Background color (hex code)
- **Accent Color**: Border/highlight color (hex code)
- **Visibility**: Toggle stats/badges on/off

**Shop System:**
- Interactive button-based navigation
- One item per page for clarity
- Previous/Next/Close buttons
- Buy button (context-aware: disabled if owned/broke)
- Preview button (ephemeral image preview)
- **No timeout** - stays open until purchase or close
- Real-time balance validation

**Backgrounds & Rarities:**
- **Default** (Free): Clean gradient
- **Common** (1000): Sunset, Ocean
- **Uncommon** (2000): Forest, City
- **Rare** (3500): Aurora, Galaxy  
- **Epic** (5000): Nebula, Crystal
- **Legendary** (7500): Phoenix, Dragon
- **Mythic** (10000): Cosmos, Void

**Visual Profile Cards:**
- 900x300px Canvas-generated image
- Custom background or solid color
- Circular avatar with accent color border (5px)
- Username, tag, and custom title
- Personal bio with word wrapping
- Stats section: coins 💰, streak 🔥, rep ⭐, messages
- Badge display (up to 5 badges)
- Dark overlay (50% opacity) for text readability

**Daily Streak System:**
- Base reward: 500 coins
- Streak bonus: +50 coins per day
- Maximum streak bonus: 1000 coins (20+ day streak)
- Maximum daily: 1500 coins
- 48-hour grace period (24hr + 24hr buffer)
- Milestone celebrations: 7, 30, 100 days
- Tracks current and longest streak

**Transaction System:**
- All earnings/spending logged
- Last 50 transactions kept
- Each transaction includes:
  - Type (earned/spent)
  - Amount
  - Description
  - Timestamp
- Statistics: totalEarned, totalSpent

**Inventory Features:**
- Categorized by type (backgrounds, badges, items)
- Shows [EQUIPPED] status for active items
- Purchase/earned dates with Discord timestamps
- Pagination (5 items per page for backgrounds)
- Rarity display with emojis

---

## 🎵 Music System

### Complete Music Player

**What it does:**
- Play music from YouTube, Spotify, and SoundCloud
- Advanced queue management with full control
- Audio filters and effects (bass boost, 8D, nightcore, etc.)
- Interactive search with result selection
- Real-time playback information

**Multi-Source Support:**
- **YouTube** - URLs and search queries
- **Spotify** - Track and playlist URLs
- **SoundCloud** - Direct URLs
- Auto-detection of source type

**Technology:**
- `discord-player` v6.6.6 - Core music player
- `@discord-player/extractor` v4.4.5 - Official multi-source extractors
- `play-dl` v1.9.7 - Enhanced source support
- `ytdl-core` v4.11.5 - High-quality YouTube audio

---

### Playback Control (6 Commands)

**Play Music:**
```
!play <song name | URL>
!play never gonna give you up              # YouTube search
!play https://open.spotify.com/track/...   # Spotify track
!play https://open.spotify.com/playlist/...# Spotify playlist
!play https://soundcloud.com/...           # SoundCloud track
```

**Features:**
- **Auto-Join**: Bot automatically joins your voice channel on !play
- Playlist support (adds all tracks)
- Auto-detects source type (YouTube/Spotify/SoundCloud)
- Creates queue automatically
- Shows track info after adding
- No need for separate !join command

**Pause/Resume:**
```
!pause                                     # Pause playback
!resume                                    # Resume playback
```

**Skip Tracks:**
```
!skip                                      # Skip to next song
!previous                                  # Play previous song
```

**Stop:**
```
!stop                                      # Stop and disconnect
```
- Clears entire queue
- Disconnects from voice
- Auto-disconnect after 5 minutes of inactivity

---

### Queue Management (7 Commands)

**View Queue:**
```
!queue [page]                              # Paginated queue display
```
- Shows 10 tracks per page
- Current track highlighted
- Track position, title, author, duration
- Total queue duration and volume
- Requester information

**Modify Queue:**
```
!clear                                     # Remove all tracks
!remove <position>                         # Remove specific track
!move <from> <to>                          # Reorder tracks
!swap <pos1> <pos2>                        # Swap two tracks
!shuffle                                   # Randomize order
!skipto <position>                         # Jump to track
```

**Examples:**
```
!remove 5                                  # Remove 5th track
!move 10 1                                 # Move 10th to 1st position
!swap 1 5                                  # Swap tracks 1 and 5
!skipto 8                                  # Jump to 8th track
```

---

### Navigation & Seeking (3 Commands)

**Seek to Timestamp:**
```
!seek <time>
!seek 1:30                                 # Jump to 1 min 30 sec
!seek 90                                   # Jump to 90 seconds
!seek 2:15:30                              # Jump to 2h 15m 30s
```

**Skip Forward/Backward:**
```
!forward <seconds>                         # Skip forward
!backward <seconds>                        # Rewind
!forward 30                                # Skip ahead 30 seconds
!backward 15                               # Rewind 15 seconds
```

---

### Information & Search (2 Commands)

**Now Playing:**
```
!nowplaying
```
Displays:
- Track title and author
- Progress bar: `▓▓▓▓░░░░░░ 2:34 / 5:12`
- Volume percentage
- Loop mode status
- Queue size
- Requester info
- Clickable URL and thumbnail

**Interactive Search:**
```
!search <query>
```
How it works:
1. Shows top 10 search results
2. Type number (1-10) to select
3. 30 second timeout
4. Selected track added to queue

---

### Audio Filters (8+ Commands)

**Filter Manager:**
```
!filters list                              # Show all filters
!filters add <filter>                      # Add filter
!filters remove <filter>                   # Remove filter
!filters clear                             # Remove all
```

**Available Filters (19 total):**
- `8D` - 8D audio effect (headphone recommended)
- `bassboost_low` / `bassboost` / `bassboost_high` - Bass enhancement
- `echo` - Echo effect
- `flanger` - Flanger effect
- `gate` - Noise gate
- `haas` - Haas effect
- `karaoke` - Vocal reduction
- `nightcore` - Higher pitch + faster tempo
- `reverse` - Reverse audio
- `vaporwave` - Lower pitch + slower tempo
- `mcompand` - Multiband compressor
- `phaser` - Phaser effect
- `tremolo` - Tremolo effect
- `surround` - Surround sound
- `earwax` - Earwax effect
- `chorus` - Chorus effect
- `crystalizer` - Crystalizer effect

**Quick Filter Commands:**
```
!bassboost [off/low/medium/high]           # Bass enhancement levels
!8d                                        # Toggle 8D audio
!nightcore                                 # Toggle nightcore
!vaporwave                                 # Toggle vaporwave
!karaoke                                   # Toggle karaoke mode
```

**Examples:**
```
!bassboost high                            # Heavy bass boost
!8d                                        # Enable 8D audio
!filters add nightcore                     # Add nightcore
!filters clear                             # Remove all filters
```

---

### Settings & Control (2 Commands)

**Volume Control:**
```
!volume [0-200]
!volume                                    # Show current volume
!volume 100                                # Set to 100%
!volume 150                                # Boost to 150%
```
- Range: 0-200%
- Default: 80%
- Dynamic emoji: 🔇 (0%) / 🔉 (<50%) / 🔊 (≥50%)

**Loop Modes:**
```
!loop [off/track/queue/autoplay]
!loop                                      # Show current mode
!loop track                                # Repeat current song 🔂
!loop queue                                # Repeat all songs 🔁
!loop off                                  # Disable loop ▶️
```

---

### Music System Features

**Voice Channel Management:**
- Must be in voice channel to play
- Same-channel enforcement for control
- Auto-disconnect after 5 minutes empty
- Permission checks for all commands

**Queue Features:**
- Unlimited queue size
- Track metadata (requester, channel)
- History tracking for previous command
- Playlist support (adds all tracks)

**Quality & Performance:**
- High-quality audio (highestaudio filter)
- Optimized streaming with highWaterMark
- Audio-only filter (no video download)
- Error handling with user-friendly messages

**Event Announcements:**
- Track start notification
- Queue addition confirmation
- Error notifications
- Empty queue alerts

**Progress Visualization:**
- Real-time progress bar with Unicode: `▓▓▓▓░░░░░░`
- Timestamp display (current / total)
- Duration formatting (MM:SS)

---

## 📊 Data Logging

### Member Data Tracked

For each member, the bot tracks:
- **Join/Leave History**: Timestamps, invite codes used, who invited them
- **Join/Leave Count**: Total number of joins and leaves
- **Sus Level**: Calculated risk score
- **Account Age**: When the Discord account was created
- **Moderation History**: All warnings, kicks, bans, mutes
- **Invite Links Posted**: Every invite link they've shared
- **Staff Notes**: Custom notes added by moderators
- **Birthday**: Month, day, year, preferences, celebration history
- **XP & Level**: Total XP, current level, message count, daily/weekly XP
- **Event Participation**: Events joined, attendance history
- **Tickets**: Created tickets, ratings given

### Logs Generated

**Join/Leave Log:**
- Member joined (with account age, invite used, sus level)
- Member left (with join duration, total joins/leaves)

**Mod Log:**
- All moderation actions with case numbers
- Moderator who took action
- Reason provided
- Timestamps

**Alert Log:**
- Suspicious member detections
- New account alerts
- Security events

---

## 🤖 Enhanced Auto-Moderation

### 1. Spam Detection

**What it does:**
- Tracks message rate per user
- Detects rapid message spam
- Automatic action on violation

**How it works:**
- Tracks last X messages per user (default: 5)
- Within Y seconds window (default: 5s)
- Actions: warn → mute → kick

**Configuration:**
```
!config antispam on/off
!config spammessagelimit 5           # Messages
!config spamtimewindow 5             # Seconds
!config spamaction warn              # warn|mute|kick
```

**Features:**
- Per-user message tracking
- Automatic cooldown reset
- Staff exemption
- Configurable thresholds
- Escalating actions

---

### 2. Bad Word Filtering

**What it does:**
- Filters configured bad words
- Automatic message deletion
- Warns repeat offenders

**Configuration:**
```
!config badwords on/off
!addbadword <word>                   # Add to filter
!removebadword <word>                # Remove from filter
!listbadwords                        # View current list
!config badwordaction delete         # delete|warn|mute
```

**Features:**
- Case-insensitive matching
- Partial word detection
- Wildcard support
- Staff exemption
- Automatic logging

---

### 3. Role Mention Spam Prevention

**What it does:**
- Prevents rapid role @mentions
- Protects against notification spam
- Configurable cooldown per role

**Configuration:**
```
!config antirolespam on/off
!config rolespamc cooldown 60        # Seconds between mentions
```

**How it works:**
- Tracks last role mention time per user
- Cooldown between @role mentions (default: 60s)
- Deletes message if within cooldown
- Warns user on violation
- Staff can mention without restriction

**Features:**
- Per-role cooldown tracking
- Automatic cooldown reset
- Staff exemption
- Protects @everyone and @here

---

### 4. Auto-Mute System

**What it does:**
- Automatic muting for repeated violations
- Configurable duration
- Escalating mute durations

**Configuration:**
```
!config automute on/off
!config automutedefault 10m          # Default duration
!setrole muted @Muted                # Muted role
```

**Mute Escalation:**
- 1st offense: 10 minutes
- 2nd offense: 1 hour
- 3rd offense: 6 hours
- 4th+ offense: 24 hours

**Features:**
- Duration parsing (10m, 1h, 1d)
- Automatic unmute
- Mute history tracking
- Prevents permission bypass

---

## 🔨 Moderation Tools

### Basic Commands

**Warn:**
```
!warn @user [reason]
```
- Adds warning to user's record
- DMs the user
- Logs to mod-log
- Shows total warnings
- Triggers auto-mute after threshold

**Kick:**
```
!kick @user [reason]
```
- Kicks member from server
- DMs them before kicking
- Records in database
- Logs to mod-log

**Ban:**
```
!ban @user [reason]
```
- Bans user (can ban by ID even if not in server)
- Deletes their messages from last 24h
- DMs them before ban
- Records in database
- Logs to mod-log

**Purge:**
```
!purge 50              # Delete last 50 messages
!purge 50 @user        # Delete last 50 from specific user
```
- Bulk delete messages
- Can filter by user
- Works on messages <14 days old (Discord limit)
- Logs to mod-log with count

---

## 🎫 Support Ticket System

**What it does:**
- Complete support ticket system
- Private channels per ticket
- Staff claiming system
- Message transcripts
- Rating system (1-5 stars)

**User Commands:**
```
!ticket [reason]                     # Create new ticket
!close [reason]                      # Close your ticket
!rate <1-5> [comment]                # Rate support experience
```

**Staff Commands:**
```
!claim                               # Claim ticket
!unclaim                             # Release ticket
!transcript                          # Generate transcript
!priority <low|medium|high>          # Set priority
!adduser @user                       # Add user to ticket
!removeuser @user                    # Remove user
```

**Configuration:**
```
!config tickets on/off
!setchannel ticketcategory @category # Category for tickets
!setrole support @SupportTeam        # Support staff
!config maxtickets 5                 # Max per user
```

**Features:**
- Auto-incrementing ticket numbers (#0001)
- Status tracking (open/claimed/closed/archived)
- Priority levels (low/medium/high/critical)
- Full message history with attachments
- Staff performance tracking
- Rating system with feedback

---

## ✅ Verification System

**What it does:**
- Verify new members before full access
- Multiple verification methods
- Automatic role assignment
- Anti-bot protection

**Verification Types:**
- **Button** - Click verify button
- **Reaction** - React to message
- **Captcha** - Solve image captcha

**Commands:**
```
!verification setup <button|reaction|captcha>
!verification channel #verify
!verification role @Verified
!verification message <custom_message>
```

**Configuration:**
```
!config verification on/off
!config verificationtype button      # button|reaction|captcha
!setchannel verification #verify
!setrole verified @Verified
```

**Features:**
- Automatic verification message
- Timeout for unverified members
- Kick unverified after X time
- Logs verification attempts
- Anti-spam protection

---

## 👋 Welcome System

**What it does:**
- Welcome new members with custom messages
- Embed support with images
- DM welcome option
- Variable replacements

**Configuration:**
```
!config welcome on/off
!setchannel welcome #welcome
!welcomemessage <message>            # Set message
!welcomeembed on/off                 # Use embeds
!welcomedm on/off                    # Also DM user
```

**Message Variables:**
```
{user}          # @mention
{username}      # Username without @
{server}        # Server name
{membercount}   # Total members
{ordinal}       # 1st, 2nd, 3rd member
```

**Example:**
```
!welcomemessage Welcome {user} to {server}! You're our {ordinal} member! 🎉
```

**Features:**
- Custom embed colors
- Thumbnail (user avatar)
- Footer with join date
- DM fallback if channel unavailable
- Image background support

---

## 🎭 Reaction Roles

**What it does:**
- Assign roles via emoji reactions
- Multiple reaction role messages
- Toggle roles on/off
- Supports custom emojis

**Setup:**
```
!reactionrole create <message_id> <emoji> <@role>
!reactionrole remove <message_id> <emoji>
!reactionrole list                   # Show all setups
```

**Example:**
```
# First, create a message with role descriptions
# Then add reaction roles:
!reactionrole create 123456789 🎮 @Gamer
!reactionrole create 123456789 🎨 @Artist
!reactionrole create 123456789 🎵 @Music
```

**Features:**
- Unlimited roles per message
- Role toggle (add/remove on react/unreact)
- Custom emoji support
- Multi-message support
- Automatic cleanup on role delete

---

## 🎵 Music System

**What it does:**
- Play music from YouTube
- Queue management
- Now playing status
- Volume control

**Commands:**
```
!play <song|url>                     # Play song
!skip                                # Skip current song
!stop                                # Stop and clear queue
!pause                               # Pause playback
!resume                              # Resume playback
!queue                               # View queue
!nowplaying                          # Current song
!volume <1-100>                      # Set volume
!remove <position>                   # Remove from queue
!shuffle                             # Shuffle queue
!loop                                # Toggle loop
```

**Features:**
- YouTube search
- Direct URL support
- Queue system with pagination
- Now playing embeds with progress
- Auto-leave on inactivity
- Song request history

**Requirements:**
- Bot must be in voice channel
- User must be in same voice channel
- Supports YouTube links and search

---

## 🎨 Custom Commands

**What it does:**
- Create server-specific commands
- Custom responses (text/embed/reaction)
- Permission requirements
- Cooldowns and usage stats

**Management:**
```
!customcommand add <name> <response>
!customcommand remove <name>
!customcommand edit <name> <new_response>
!customcommand list                  # Show all
!customcommand info <name>           # Detailed info
```

**Advanced:**
```
!customcommand alias <command> <alias>
!customcommand cooldown <command> <seconds>
!customcommand permission <command> <permission>
!customcommand requirerole <command> @role
```

**Response Types:**
```
# Text response
!cc add hello Hello {user}!

# Embed response
!cc add rules {"title":"Rules","description":"Be nice!","color":"#5865F2"}

# Reaction response
!cc add thanks 👍
```

**Variables:**
```
{user}          # Mention user
{username}      # Username
{server}        # Server name
{channel}       # Channel mention
{args}          # Command arguments
```

**Features:**
- Multiple aliases per command
- Role/permission restrictions
- Per-command cooldowns
- Usage statistics
- Embed support with JSON
- Auto-reaction responses

---

## ⚙️ Configuration System

### Prefix Management

```
!setprefix <new_prefix>           # Change command prefix
```

Default: `!`

### Role Configuration

```
!setrole sus @RoleName            # Sus/Radar role
!setrole newaccount @RoleName     # New account role  
!setrole muted @RoleName          # Muted role
!setrole staff @RoleName          # Staff role (can add multiple)
!setrole birthday @Birthday       # Birthday role
!setrole support @Support         # Support team
!setrole verified @Verified       # Verified role
```

### Channel Configuration

```
!setchannel modlog #channel       # Moderation logs
!setchannel alert #channel        # Security alerts
!setchannel join #channel         # Join/leave logs
!setchannel birthday #channel     # Birthday announcements
!setchannel events #channel       # Event notifications
!setchannel welcome #channel      # Welcome messages
!setchannel verification #channel # Verification
!setchannel tickets @category     # Ticket category
```

### Feature Toggles

```
!config inviteverification on/off
!config membertracking on/off
!config accountage on/off
!config antispam on/off
!config badwords on/off
!config antirolespam on/off
!config automute on/off
!config levelenabled on/off
!config tickets on/off
!config verification on/off
!config welcome on/off
```

### Thresholds

```
!config susthreshold 5                # Sus detection (1-20 joins)
!config accountagethreshold 48        # New account age in hours (1-168)
!config spammessagelimit 5            # Spam detection messages
!config spamtimewindow 5              # Spam detection seconds
!config rolespamc cooldown 60         # Role mention cooldown
!config xppermessage 15               # XP per message
!config xpcooldown 60                 # XP gain cooldown
```

### Embed Styling

```
!config embedcolor #5865F2            # Hex color code
```

**View All Settings:**
```
!config                               # Shows complete configuration
```

---

## 🎨 Stylish Embeds

### Glyph System

The bot uses Unicode glyphs for beautiful, styled embeds:

- ➤ Arrows
- ✅ ❌ ⚠️ ℹ️ Status indicators
- 🛡️ 🔨 👁️ 📡 Icons
- 🥚 👶 🚨 Special markers
- • ─ │ ┌ Formatting

**Features:**
- Color-coded by message type (success=green, error=red, warning=orange, info=blue)
- Professional formatting
- Dynamic content
- Customizable colors
- Consistent branding

**Toggle Glyphs:**
Currently always enabled - can be customized in database if needed.

---

## 👥 Information Commands

**User Info:**
```
!userinfo [@user]                 # Detailed user information
```
Shows:
- Basic info (username, ID, mention)
- Account creation date
- Server join date
- Roles
- Join/leave statistics
- Sus level
- Warning count

**Server Info:**
```
!serverinfo
```
Shows:
- Server name, ID, owner
- Member counts (humans vs bots)
- Channel counts
- Roles, emojis
- Boost status
- Server features

**Check User (Staff Only):**
```
!checkuser @user
```
Shows:
- Full security analysis
- Account age
- Sus level breakdown
- Join/leave history with timestamps
- Moderation history
- Invite links posted
- Risk assessment (Low/Medium/High)

**Help:**
```
!help                            # All commands
!help <command>                  # Specific command help
```

**Ping:**
```
!ping                            # Bot latency
```

---

## 🚀 Initial Setup

### Quick Setup Command

```
!setup
```

This automatically:
1. Creates roles:
   - 🚨 Sus/Radar (orange)
   - 🥚 New Account (yellow)
   - 🔇 Muted (gray)
2. Creates log category and channels:
   - 📋 Logs (category)
   - 🔨 mod-log
   - 🚨 alert-log
   - 📥 join-log
3. Configures all settings
4. Sets up muted role permissions

---

## 🔐 Permissions System

### Command Permission Levels

**Administrator:**
- `setup`, `config`, `setprefix`, `setrole`, `setchannel`

**Moderator (ModerateMembers, KickMembers, BanMembers):**
- `warn`, `kick`, `ban`, `purge`
- Access to `checkuser`

**Everyone:**
- `help`, `ping`, `userinfo`, `serverinfo`

### Staff Detection

The bot considers you "staff" if you have:
- Administrator permission, OR
- ModerateMembers permission, OR
- KickMembers permission, OR
- BanMembers permission, OR
- A role marked as staff role (`!setrole staff @role`)

---

## 📱 Use Cases & Scenarios

### Scenario 1: Raid Protection

**Setup:**
```
!config membertracking on
!config susthreshold 3
!config accountage on
!config accountagethreshold 1
!setrole newaccount @Restricted
```

**Result:**
- Accounts <1 hour old get Restricted role
- Anyone who joins 3+ times gets flagged
- Staff alerted immediately
- Can review and ban raid accounts

### Scenario 2: Invite Link Control

**Setup:**
```
!config inviteverification on
```

**Result:**
- Invite links auto-deleted
- User warned
- Repeat offenders tracked
- Whitelist your partner server invites

### Scenario 3: Member Vetting

**Setup:**
```
!setrole staff @Moderator
!setchannel alert #verification
```

**Process:**
1. New/suspicious member joins
2. Alert posted to #verification
3. Staff uses `!checkuser @member`
4. Reviews their history
5. Decides to approve or remove

---

## 🎯 Best Practices

### Recommended Settings

**Small Server (<100 members):**
```
susthreshold: 5
accountagethreshold: 24
```

**Medium Server (100-1000 members):**
```
susthreshold: 4
accountagethreshold: 48
```

**Large Server (1000+ members):**
```
susthreshold: 3
accountagethreshold: 72
alertchannel: Dedicated mod-only channel
```

### Tips

1. **Start Lenient**: Set higher thresholds initially, adjust based on your server's needs
2. **Review Alerts**: Check suspicious member alerts daily
3. **Staff Training**: Ensure staff knows how to use `!checkuser`
4. **Regular Audits**: Review mod logs weekly
5. **Whitelist**: Whitelist partner server invites to avoid false positives
6. **Role Hierarchy**: Keep bot's role high enough to manage other roles

---

## 🔄 Database & Data

### What's Stored

**Guild Settings:**
- Prefix, feature toggles, thresholds
- Role IDs, channel IDs
- Embed styling preferences

**Member Data:**
- Join/leave history
- Account creation date
- Sus level calculations
- Moderation actions
- Invite link posts
- Staff notes

**Mod Logs:**
- All moderation actions
- Case numbers
- Timestamps
- Reasons

### Data Privacy

- Data is stored per-server
- Only your server's staff can access your data
- Member leaves server: Data preserved for historical reference
- Bot leaves server: Data remains for if you re-add it

### Manual Database Access

If you need to access the MongoDB database directly:
```javascript
// Connect to your MongoDB and access these collections:
- guilds
- members  
- modlogs
- invites
```

---

## 🆘 Support & Troubleshooting

### Common Issues

**Sus detection too sensitive:**
```
!config susthreshold 6             # Increase threshold
```

**Too many new account alerts:**
```
!config accountagethreshold 48     # Increase to 48 hours
```

**Commands not working:**
- Check bot permissions
- Verify correct prefix: `!config`
- Ensure you have required permissions

**Bot slow to respond:**
- Check `!ping` latency
- Verify MongoDB connection
- Check server resources

### Debug Mode

Check console logs for detailed information about:
- Command execution
- Event triggers
- Database queries
- Errors

---

## 🚀 Implementation Status & Roadmap

### ✅ Completed Features

**Core Security & Moderation:**
- ✅ Invite link verification
- ✅ Member history tracking with sus detection
- ✅ Account age verification
- ✅ Raid protection
- ✅ Warn/Kick/Ban/Purge commands
- ✅ Mod logging with case numbers

**Enhanced Auto-Moderation:**
- ✅ Database schema ready
- 🔄 Spam detection (in progress)
- 🔄 Bad word filtering (in progress)
- 🔄 Role mention spam prevention (in progress)
- 🔄 Auto-mute system (in progress)

**Community Engagement:**
- ✅ Birthday system (fully implemented)
  - ✅ Set/remove birthdays
  - ✅ Privacy controls (fake birthdays, hide age)
  - ✅ Celebration preferences
  - ✅ Daily cron job for checking
  - ✅ Auto role assignment/removal
  
- ✅ Event system (fully implemented)
  - ✅ Create/cancel events
  - ✅ RSVP system
  - ✅ Time-based notifications
  - ✅ Recurring events support
  - ✅ Minute-by-minute checking cron job

**Configuration:**
- ✅ Custom prefix per server
- ✅ Role configuration
- ✅ Channel configuration
- ✅ Feature toggles
- ✅ Threshold adjustments
- ✅ Embed styling

---

## 📡 Bot Monitoring & Health Checks

### Health Check Endpoint

**What it provides:**
- RESTful API endpoint for external monitoring
- Real-time bot status information
- Database connection status
- Uptime tracking
- Performance metrics

**Endpoint:** `GET /health`

**Response Format:**
```json
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
```

**Use Cases:**
- **Uptime Robot**: Monitor bot availability 24/7
- **Pingdom**: Track uptime and response times
- **StatusCake**: Create public status page
- **Custom Dashboards**: Integrate with monitoring tools
- **Render/Railway**: Required for hosting platform health checks

**Setup:**
1. Bot automatically starts Express server on configured PORT (default: 3000)
2. Add `http://your-bot-url:3000/health` to monitoring service
3. Set check interval (recommended: 5 minutes)
4. Configure alerts for downtime notifications

---

### Bot Status Channel

**What it does:**
- Dedicated Discord channel for bot status updates
- Automatic notifications on status changes
- Uptime/downtime tracking
- Created automatically by !setup command

**Features:**
- **Online Notification**: Sent when bot starts
- **Offline Detection**: Monitors bot WebSocket status every minute
- **Status Updates**: Auto-posted on status change
- **Timestamp**: Discord timestamp format for easy tracking
- **Visual Indicators**: 
  - ✅ Green embed for online
  - ❌ Red embed for offline/reconnecting

**Status Update Format:**
```
🤖 Bot Status Update

✅ Bot is now ONLINE
All systems operational.

Status: ONLINE
Timestamp: <Discord timestamp>
```

**Channel Setup:**
- Created by !setup as 🤖-bot-status
- Placed in 📋 Logs category
- Restricted to staff/admin only
- Auto-configured in Guild settings

**Manual Configuration:**
```
!setchannel botstatus #your-status-channel
```

**Monitoring Frequency:**
- Status checked every 60 seconds
- Only posts on status change (prevents spam)
- Detects: online ↔ offline transitions
- Tracks reconnection attempts

**Integration with Health Endpoint:**
- Both systems work independently
- Health endpoint → External monitoring (Uptime Robot, etc.)
- Status channel → Internal Discord team alerts
- Combined coverage for complete monitoring solution

**Benefits:**
- Immediate team notification on downtime
- Historical record of bot availability
- No external service needed for basic monitoring
- Complements external monitoring tools

---

### ✅ Completed Features

**Core Systems:**
- ✅ Advanced security & moderation (invite verification, member tracking, account age)
- ✅ Birthday system with celebrations and preferences
- ✅ Event system with notifications and reminders
- ✅ Level/XP system with visual rank-up messages
- ✅ Economy system with coins, daily rewards, and shop
- ✅ Profile customization with Canvas-based cards
- ✅ Music system (26 commands, multi-source support)
- ✅ Custom embed builder with templates
- ✅ Bot status monitoring and health checks
- ✅ One-click setup command

**Economy & Profiles:**
- ✅ Coin earning (messages, daily, timed rewards)
- ✅ Daily streak system with bonuses
- ✅ Interactive shop (no timeout)
- ✅ Inventory management
- ✅ Visual profile cards (900x300px)
- ✅ Profile customization (bio, title, colors, backgrounds)
- ✅ Transaction history
- ✅ 12 purchasable backgrounds

**Level System:**
- ✅ XP gain on messages with cooldown
- ✅ Visual level-up cards with Canvas
- ✅ Rank cards with progress bars
- ✅ Leaderboard with pagination
- ✅ Role rewards at specific levels
- ✅ Integration with economy

**Music System:**
- ✅ 26 complete commands
- ✅ Multi-source (YouTube, Spotify, SoundCloud)
- ✅ Auto-join voice channel
- ✅ Queue management
- ✅ Audio filters (15+)
- ✅ Interactive search
- ✅ Loop modes

### 📋 Planned Features

**Support & Management:**
- 📋 Ticket system improvements
  - ✅ Database model ready
  - 📋 Enhanced ticket management
  - 📋 Auto-close inactive tickets
  - 📋 Ticket statistics

**Member Verification:**
- 📋 Verification system expansion
  - ✅ Database schema ready
  - 📋 Multiple verification methods
  - 📋 Auto-kick unverified after timeout

**Welcome System:**
- 📋 Enhanced welcome messages
  - ✅ Database schema ready
  - 📋 Image generation with user avatar
  - 📋 Custom backgrounds

**Reaction Roles:**
- 📋 Reaction role system
  - ✅ Database schema ready
  - 📋 Multi-message support
  - 📋 Button-based alternative

**Custom Commands:**
- 📋 Custom command enhancements
  - ✅ Database model ready
  - 📋 Advanced response types
  - 📋 Conditional responses

**Economy Expansion:**
- 📋 Transfer coins between users
- 📋 Deposit/withdraw (wallet ↔ bank)
- 📋 Gambling commands (coinflip, slots)
- 📋 More shop categories (badges, frames)
- 📋 Daily shop rotation

**Future Enhancements:**
- 📋 Web dashboard
- 📋 Advanced analytics
- 📋 API endpoints
- 📋 Advanced analytics
- 📋 Backup/restore system
- 📋 Multi-language support
- 📋 Server statistics
- 📋 Auto-role on join
- 📋 Sticky messages
- 📋 Starboard system
- 📋 Giveaway system
- 📋 Poll system

### 🎯 Current Focus

**Priority 1: Auto-Mod Enhancements**
- Implement spam detection logic
- Add bad word filtering
- Complete role mention spam prevention
- Integrate auto-mute actions

**Priority 2: Level/XP System**
- Add XP gain to messageCreate.js
- Create rank command with Canvas
- Implement leaderboard
- Set up role rewards

**Priority 3: Support Systems**
- Ticket system implementation
- Verification system
- Welcome message integration

---

## 📊 Feature Comparison

| Feature | JURA BOT | Carl-bot | MEE6 | Dyno |
|---------|----------|----------|------|------|
| Invite Verification | ✅ | ✅ | ❌ | ✅ |
| Sus Detection | ✅ | ❌ | ❌ | ❌ |
| Account Age Check | ✅ | ❌ | ❌ | ✅ |
| Birthday System | ✅ | ❌ | ❌ | ❌ |
| Event Notifications | ✅ | ✅ | ❌ | ✅ |
| Level/XP System | 🔄 | ✅ | ✅ | ✅ |
| Auto-Moderation | 🔄 | ✅ | ✅ | ✅ |
| Ticket System | 📋 | ✅ | ❌ | ✅ |
| Music Commands | 📋 | ✅ | ✅ | ✅ |
| Custom Commands | 📋 | ✅ | ✅ | ✅ |
| Reaction Roles | 📋 | ✅ | ❌ | ✅ |
| Free & Open Source | ✅ | ❌ | ❌ | ❌ |
| Self-Hosted | ✅ | ❌ | ❌ | ❌ |
| Full Customization | ✅ | ❌ | ❌ | ❌ |

Legend: ✅ Complete | 🔄 In Progress | 📋 Planned | ❌ Not Available

---

Need more help? Check the console logs or create an issue on GitHub!
