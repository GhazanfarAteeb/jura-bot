# 📖 Complete Command Reference

Quick reference guide for all JURA BOT commands.

---

## 🎮 Command Syntax

```
<required> - This parameter is required
[optional] - This parameter is optional
@user - Mention a user or use their ID
#channel - Mention a channel or use its ID
@role - Mention a role or use its ID
```

Default prefix: `!` (customizable with `!setprefix`)

---

## ⚙️ Configuration Commands

### !setup
**Permission:** Administrator  
**Description:** One-click server setup wizard  
**Usage:** `!setup`

**Creates Automatically:**

**Roles:**
- 🚨 Sus/Radar - For suspicious members
- 🥚 New Account - For new accounts
- 🔇 Muted - For muted members (with permissions in all channels)

**Channels:**
- 🔨-mod-log - Moderation action logs
- 🚨-alert-log - Security alerts
- 📥-join-log - Member join/leave logs
- 🤖-bot-status - Bot uptime/downtime monitoring
- 🎂-birthdays - Birthday announcements
- 📅-events - Event notifications
- 🎉-level-ups - Level-up announcements
- 👋-welcome - Welcome messages

**Enables:**
- Level/XP system
- Birthday system
- Event system
- All security features

**Time:** ~10-15 seconds to complete

**Aliases:** `initialize`

---

### !config
**Permission:** Administrator  
**Description:** View or edit server configuration  
**Usage:** 
```
!config                              # View all settings
!config susthreshold <1-20>          # Set sus detection threshold
!config accountagethreshold <1-168>  # Set account age threshold (hours)
!config inviteverification on/off   # Toggle invite verification
!config membertracking on/off        # Toggle member tracking
!config accountage on/off            # Toggle account age detection
!config embedcolor #HEXCODE          # Set embed color
```

**Examples:**
```
!config susthreshold 5               # Flag members who join 5+ times
!config accountagethreshold 48       # Flag accounts < 48 hours old
!config inviteverification on       # Enable invite link detection
!config embedcolor #5865F2          # Discord blurple color
```

**Aliases:** `configuration`, `settings`

---

### !setprefix
**Permission:** Administrator  
**Description:** Change the bot's command prefix  
**Usage:** `!setprefix <new_prefix>`

**Examples:**
```
!setprefix ?                         # Change prefix to ?
!setprefix -                         # Change prefix to -
!setprefix .                         # Change prefix to .
```

**Notes:**
- Prefix must be 5 characters or less
- Use any character or symbol
- Each server can have its own prefix

**Aliases:** `prefix`

---

### !setrole
**Permission:** Administrator  
**Description:** Configure custom roles for bot features  
**Usage:** `!setrole <type> <@role|role_id>`

**Types:**
- `sus` / `suspicious` / `radar` - Role for suspicious members
- `newaccount` / `new` / `egg` / `baby` - Role for new accounts
- `muted` / `mute` - Role for muted members
- `staff` / `mod` / `moderator` - Staff role (can add multiple)

**Examples:**
```
!setrole sus @Suspicious             # Assign sus role
!setrole newaccount @🥚 New          # Assign new account role
!setrole muted @Muted                # Assign muted role
!setrole staff @Moderator            # Add staff role
!setrole staff @Admin                # Add another staff role
```

**Aliases:** `configrole`

---

### !setchannel
**Permission:** Administrator  
**Description:** Configure log channels  
**Usage:** `!setchannel <type> <#channel|channel_id>`

**Types:**
- `modlog` / `mod` - Moderation action logs
- `alert` / `alerts` / `security` - Security alerts
- `join` / `joinlog` / `joins` - Join/leave logs

**Examples:**
```
!setchannel modlog #mod-logs         # Set mod log channel
!setchannel alert #security-alerts   # Set alert channel
!setchannel join #member-logs        # Set join/leave log channel
```

**Aliases:** `setlog`

---

## 🎵 Music Commands

### Playback Control

#### !play
**Permission:** None (must be in voice channel)  
**Description:** Play music from YouTube, Spotify, or SoundCloud  
**Usage:** `!play <song name | URL>`

**Examples:**
```
!play never gonna give you up          # YouTube search
!play https://youtube.com/watch?v=...  # YouTube URL
!play https://open.spotify.com/track/... # Spotify track
!play https://open.spotify.com/playlist/... # Spotify playlist
!play https://soundcloud.com/...       # SoundCloud
```

**Features:**
- Auto-detects source (YouTube, Spotify, SoundCloud)
- Playlist support (adds all tracks)
- Auto-connects to your voice channel
- Creates queue if none exists
- Shows track info after adding

**Aliases:** `p`

---

#### !pause
**Permission:** Must be in same voice channel  
**Description:** Pause the current song  
**Usage:** `!pause`

---

#### !resume
**Permission:** Must be in same voice channel  
**Description:** Resume the paused song  
**Usage:** `!resume`

**Aliases:** `unpause`

---

#### !skip
**Permission:** Must be in same voice channel  
**Description:** Skip the current song  
**Usage:** `!skip`

**Aliases:** `s`, `next`

---

#### !stop
**Permission:** Must be in same voice channel  
**Description:** Stop music and disconnect from voice  
**Usage:** `!stop`

**What happens:**
- Stops playback
- Clears entire queue
- Disconnects from voice channel

**Aliases:** `leave`, `disconnect`, `dc`

---

#### !previous
**Permission:** Must be in same voice channel  
**Description:** Play the previous song from history  
**Usage:** `!previous`

**Aliases:** `prev`, `back`

---

### Queue Management

#### !queue
**Permission:** Must be in same voice channel  
**Description:** Display the music queue with pagination  
**Usage:** `!queue [page]`

**Features:**
- Shows 10 tracks per page
- Displays current track prominently
- Track numbering, duration, requester
- Total queue duration
- Current volume and page info

**Examples:**
```
!queue                                 # Show page 1
!queue 2                               # Show page 2
```

**Aliases:** `q`

---

#### !clear
**Permission:** Must be in same voice channel  
**Description:** Remove all songs from the queue  
**Usage:** `!clear`

**Notes:**
- Does not stop current song
- Only clears upcoming tracks

**Aliases:** `clearqueue`, `cq`

---

#### !remove
**Permission:** Must be in same voice channel  
**Description:** Remove a specific song from queue  
**Usage:** `!remove <position>`

**Examples:**
```
!remove 3                              # Remove song at position 3
!remove 1                              # Remove next song
```

**Aliases:** `rm`, `delete`

---

#### !move
**Permission:** Must be in same voice channel  
**Description:** Move a song to different position  
**Usage:** `!move <from> <to>`

**Examples:**
```
!move 5 1                              # Move song 5 to position 1
!move 1 10                             # Move first song to 10th
```

**Aliases:** `mv`

---

#### !swap
**Permission:** Must be in same voice channel  
**Description:** Swap two songs in the queue  
**Usage:** `!swap <position1> <position2>`

**Examples:**
```
!swap 1 5                              # Swap songs at positions 1 and 5
```

---

#### !shuffle
**Permission:** Must be in same voice channel  
**Description:** Randomize the queue order  
**Usage:** `!shuffle`

**Notes:**
- Does not affect currently playing song
- Shuffles all queued tracks

---

#### !skipto
**Permission:** Must be in same voice channel  
**Description:** Skip to a specific song in queue  
**Usage:** `!skipto <position>`

**Examples:**
```
!skipto 5                              # Jump to song at position 5
```

**Notes:**
- Removes all songs before target position
- Starts playing the target song immediately

**Aliases:** `jumpto`, `goto`

---

### Navigation & Seeking

#### !seek
**Permission:** Must be in same voice channel  
**Description:** Jump to a specific time in current song  
**Usage:** `!seek <time>`

**Examples:**
```
!seek 1:30                             # Jump to 1 minute 30 seconds
!seek 90                               # Jump to 90 seconds
!seek 2:15:30                          # Jump to 2 hours 15 min 30 sec
```

**Supported formats:**
- Seconds: `90`
- MM:SS: `1:30`
- HH:MM:SS: `2:15:30`

**Aliases:** `goto`, `jump`

---

#### !forward
**Permission:** Must be in same voice channel  
**Description:** Skip forward in current song  
**Usage:** `!forward <seconds>`

**Examples:**
```
!forward 30                            # Skip forward 30 seconds
!forward 10                            # Skip forward 10 seconds
```

**Aliases:** `ff`, `fwd`

---

#### !backward
**Permission:** Must be in same voice channel  
**Description:** Rewind the current song  
**Usage:** `!backward <seconds>`

**Examples:**
```
!backward 15                           # Rewind 15 seconds
!backward 30                           # Rewind 30 seconds
```

**Aliases:** `rewind`, `rw`, `back`

---

### Information & Search

#### !nowplaying
**Permission:** Must be in same voice channel  
**Description:** Show current track with progress bar  
**Usage:** `!nowplaying`

**Shows:**
- Track title and author
- Progress bar visualization (▓░░░)
- Current timestamp / total duration
- Volume percentage
- Loop mode status
- Queue size
- Requester info
- Clickable URL and thumbnail

**Aliases:** `np`, `current`, `playing`

---

#### !search
**Permission:** Must be in voice channel  
**Description:** Search for songs and select one to play  
**Usage:** `!search <query>`

**How it works:**
1. Bot searches and shows top 10 results
2. Type a number (1-10) to select
3. 30 second timeout to choose
4. Selected track is added to queue

**Examples:**
```
!search lofi hip hop                   # Search query
!search imagine dragons               # Artist name
```

**Aliases:** `find`

---

### Audio Filters

#### !filters
**Permission:** Must be in same voice channel  
**Description:** Manage audio filters  
**Usage:** `!filters [list/add/remove/clear] [filter_name]`

**Available Filters:**
- `8D` - 8D audio effect
- `bassboost_low`, `bassboost`, `bassboost_high` - Bass enhancement
- `echo` - Echo effect
- `flanger` - Flanger effect
- `gate` - Noise gate
- `haas` - Haas effect
- `karaoke` - Vocal reduction
- `nightcore` - Higher pitch + faster
- `reverse` - Reverse audio
- `vaporwave` - Lower pitch + slower
- `mcompand` - Multiband compressor
- `phaser` - Phaser effect
- `tremolo` - Tremolo effect
- `surround` - Surround sound
- `earwax` - Earwax effect
- `chorus` - Chorus effect
- `crystalizer` - Crystalizer effect

**Examples:**
```
!filters list                          # Show all filters
!filters add bassboost                # Add bass boost
!filters remove nightcore             # Remove nightcore
!filters clear                         # Remove all filters
```

**Aliases:** `filter`, `fx`

---

#### !bassboost
**Permission:** Must be in same voice channel  
**Description:** Apply bass boost filter  
**Usage:** `!bassboost [off/low/medium/high]`

**Levels:**
- `off` - Disable bass boost
- `low` (1) - Light bass enhancement
- `medium` (2) - Moderate bass (default)
- `high` (3) - Heavy bass

**Examples:**
```
!bassboost                             # Apply medium bass boost
!bassboost high                        # Apply high bass boost
!bassboost off                         # Disable bass boost
```

**Aliases:** `bass`

---

#### !8d
**Permission:** Must be in same voice channel  
**Description:** Toggle 8D audio effect  
**Usage:** `!8d`

**Notes:**
- Best experienced with headphones
- Creates spatial audio effect
- Toggle on/off with same command

---

#### !nightcore
**Permission:** Must be in same voice channel  
**Description:** Toggle nightcore effect (higher pitch + faster)  
**Usage:** `!nightcore`

**Notes:**
- Increases pitch and tempo
- Toggle on/off with same command

---

#### !vaporwave
**Permission:** Must be in same voice channel  
**Description:** Toggle vaporwave effect (lower pitch + slower)  
**Usage:** `!vaporwave`

**Notes:**
- Decreases pitch and tempo
- Opposite of nightcore
- Toggle on/off with same command

**Aliases:** `vapor`

---

#### !karaoke
**Permission:** Must be in same voice channel  
**Description:** Toggle karaoke effect (reduces vocals)  
**Usage:** `!karaoke`

**Notes:**
- Attempts to reduce vocal track
- Effectiveness varies by song
- Toggle on/off with same command

---

### Settings

#### !volume
**Permission:** Must be in same voice channel  
**Description:** Control music volume  
**Usage:** `!volume [0-200]`

**Examples:**
```
!volume                                # Show current volume
!volume 100                            # Set to 100% (default)
!volume 50                             # Set to 50%
!volume 150                            # Set to 150% (boost)
```

**Notes:**
- Range: 0-200%
- Default: 80%
- Shows emoji indicator (🔇/🔉/🔊)

**Aliases:** `vol`, `v`

---

#### !loop
**Permission:** Must be in same voice channel  
**Description:** Set loop/repeat mode  
**Usage:** `!loop [off/track/queue]`

**Modes:**
- `off` (0) - No looping (▶️)
- `track` (1) - Loop current track (🔂)
- `queue` (2) - Loop entire queue (🔁)
- `autoplay` (3) - Autoplay similar songs (🔀)

**Examples:**
```
!loop                                  # Show current mode
!loop track                            # Loop current song
!loop queue                            # Loop all songs
!loop off                              # Disable loop
```

**Aliases:** `repeat`, `l`

---

## 🔨 Moderation Commands

### !warn
**Permission:** Moderate Members  
**Description:** Issue a warning to a member  
**Usage:** `!warn <@user|user_id> [reason]`

**Examples:**
```
!warn @user                          # Warn without reason
!warn @user Spamming in chat         # Warn with reason
!warn 123456789012345678 Toxic       # Warn by ID
```

**What happens:**
- Warning added to member's record
- User receives DM with warning
- Logged to mod-log channel
- Case number assigned
- Shows total warning count

**Aliases:** `warning`

---

### !kick
**Permission:** Kick Members  
**Description:** Kick a member from the server  
**Usage:** `!kick <@user|user_id> [reason]`

**Examples:**
```
!kick @user                          # Kick without reason
!kick @user Repeatedly breaking rules # Kick with reason
```

**What happens:**
- Member is kicked from server
- DM sent before kicking (if possible)
- Logged to mod-log channel
- Saved to member's history
- Case number assigned

**Notes:**
- Member can rejoin with a new invite
- Use ban for permanent removal

**Aliases:** `boot`

---

### !ban
**Permission:** Ban Members  
**Description:** Ban a member from the server  
**Usage:** `!ban <@user|user_id> [reason]`

**Examples:**
```
!ban @user                           # Ban without reason
!ban @user Raiding the server        # Ban with reason
!ban 123456789012345678 Alt account  # Ban by ID (even if not in server)
```

**What happens:**
- User is banned
- Last 24 hours of messages deleted
- DM sent before ban (if possible)
- Logged to mod-log channel
- Saved to member's history
- Case number assigned

**Notes:**
- Can ban users not in the server using their ID
- Banned users cannot rejoin
- Use Discord's ban list to unban

**Aliases:** `hammer`

---

### !purge
**Permission:** Manage Messages  
**Description:** Bulk delete messages  
**Usage:** `!purge <amount> [@user]`

**Examples:**
```
!purge 50                            # Delete last 50 messages
!purge 100 @user                     # Delete last 100 from specific user
```

**Notes:**
- Maximum 100 messages per command
- Only deletes messages < 14 days old (Discord limitation)
- Confirmation message auto-deletes after 5 seconds
- If targeting user, scans more messages to find theirs

**Aliases:** `clear`, `clean`, `delete`

---

## 📊 Information Commands

### !help
**Permission:** Everyone  
**Description:** Display help information  
**Usage:** 
```
!help                                # Show all commands
!help <command>                      # Show specific command help
```

**Examples:**
```
!help                                # List all commands by category
!help warn                           # Detailed info about warn command
!help config                         # Detailed info about config command
```

**Aliases:** `h`, `commands`

---

### !userinfo
**Permission:** Everyone  
**Description:** Get detailed information about a user  
**Usage:** `!userinfo [@user|user_id]`

**Examples:**
```
!userinfo                            # Your own info
!userinfo @user                      # Another user's info
!userinfo 123456789012345678         # User info by ID
```

**Shows:**
- Username, ID, mention
- Account creation date
- Server join date
- Roles
- Join/leave statistics
- Sus level
- Warning count
- New account status

**Aliases:** `user`, `whois`, `ui`

---

### !serverinfo
**Permission:** Everyone  
**Description:** Get information about the server  
**Usage:** `!serverinfo`

**Shows:**
- Server name, ID, owner
- Creation date
- Member counts (humans vs bots)
- Channel counts (text, voice)
- Role count
- Emoji count
- Server features
- Boost status (if boosted)
- Server icon and banner

**Aliases:** `server`, `guild`, `guildinfo`

---

### !checkuser
**Permission:** Staff Only  
**Description:** Detailed security analysis of a user  
**Usage:** `!checkuser <@user|user_id>`

**Examples:**
```
!checkuser @user                     # Full security scan
!checkuser 123456789012345678        # Scan by ID
```

**Shows:**
- Account age and creation date
- New account status
- Sus level with breakdown
- Join/leave counts
- Recent join history with timestamps
- Invite codes used
- Moderation history (warns, kicks, bans)
- Invite links posted
- Risk assessment (Low/Medium/High)

**Who can use:**
- Users with Administrator permission
- Users with Moderate Members permission
- Users with Kick/Ban permissions
- Users with staff role (set via `!setrole staff`)

**Aliases:** `check`, `scan`, `inspect`

---

### !ping
**Permission:** Everyone  
**Description:** Check bot latency and response time  
**Usage:** `!ping`

**Shows:**
- Roundtrip latency (command to response)
- WebSocket latency (bot to Discord)
- Connection status (Excellent/Good/Fair/Poor)

**Aliases:** `latency`, `pong`

---

## 🎯 Command Categories

### By Permission Level

**Everyone:**
- help, userinfo, serverinfo, ping

**Moderator (Manage Messages, Moderate Members):**
- warn, purge, checkuser

**Moderator (Kick Members):**
- kick

**Moderator (Ban Members):**
- ban

**Administrator:**
- setup, config, setprefix, setrole, setchannel

---

## 🎉 Community Commands

### !setbirthday
**Permission:** None (Everyone)  
**Description:** Set your birthday for automatic celebrations  
**Usage:** `!setbirthday <month> <day> [year] [--fake] [--private]`

**Examples:**
```
!setbirthday 12 25                   # December 25th
!setbirthday 12 25 2000              # Include birth year
!setbirthday 12 25 --fake            # Fake birthday (privacy)
!setbirthday 12 25 --private         # Don't show age
!setbirthday 12 25 2000 --private    # Year but no age display
```

**Flags:**
- `--fake` - Mark as fake birthday (for privacy, tracked but noted)
- `--private` - Hide age in announcements

**Aliases:** `birthday`, `setbday`

---

### !birthdays
**Permission:** None (Everyone)  
**Description:** View upcoming birthdays  
**Usage:** `!birthdays [days]`

**Examples:**
```
!birthdays                           # Next 30 days (default)
!birthdays 7                         # Next week
!birthdays 90                        # Next 3 months
```

**Shows:**
- Upcoming birthdays sorted by date
- Days until each birthday
- Age (if user enabled and provided year)
- Celebration status

**Aliases:** `listbirthdays`, `upcomingbirthdays`, `bdays`

---

### !birthdaypreference
**Permission:** None (Everyone)  
**Description:** Set how you want to be celebrated  
**Usage:** `!birthdaypreference <public|dm|role|none>`

**Options:**
- **public** - Announced in birthday channel (default)
- **dm** - Only receive private DM
- **role** - Only get birthday role, no announcement
- **none** - No celebration (tracked only)

**Examples:**
```
!birthdaypreference public           # Public announcement
!birthdaypreference dm               # Private only
!birthdaypreference none             # Don't celebrate
```

**Aliases:** `bdpref`, `birthdaypref`

---

### !removebirthday
**Permission:** None (Everyone)  
**Description:** Remove your birthday from the system  
**Usage:** `!removebirthday`

**Aliases:** `deletebirthday`, `clearbirthday`

---

### !createevent
**Permission:** Manage Server  
**Description:** Schedule a server event with notifications  
**Usage:** `!createevent <time> | <title> | [description]`

**Examples:**
```
!createevent 2h | Movie Night | Join us in VC!
!createevent 1d12h | Tournament | Registration opens now
!createevent 30m | Quick Meeting
!createevent 7d | Weekly Raid Night | Bring your best gear
```

**Time Format:**
- `30m` = 30 minutes
- `2h` = 2 hours  
- `1d` = 1 day
- `1d12h` = 1 day and 12 hours
- `2w` = 2 weeks

**Aliases:** `addevent`, `newevent`, `scheduleevent`

---

### !events
**Permission:** None (Everyone)  
**Description:** View all upcoming events  
**Usage:** `!events`

**Shows:**
- Event title and description
- Time (with Discord timestamp)
- Location (if set)
- Participant count
- Event ID for joining

**Aliases:** `listevents`, `upcomingevents`, `eventlist`

---

### !joinevent
**Permission:** None (Everyone)  
**Description:** RSVP to an event  
**Usage:** `!joinevent <event_id>`

**Examples:**
```
!joinevent 507f1f77bcf86cd799439011
```

**Benefits:**
- Get notified before event starts
- Show you're participating
- Helps organizers with headcount

**Aliases:** `eventjoin`, `rsvp`

---

### !cancelevent
**Permission:** Manage Server  
**Description:** Cancel a scheduled event  
**Usage:** `!cancelevent <event_id>`

**What happens:**
- Event is deleted
- All participants are notified
- Event removed from listings

**Aliases:** `deleteevent`, `removeevent`

---

### !rank
**Permission:** None (Everyone)  
**Description:** View your or someone's rank and XP  
**Usage:** `!rank [@user]`

**Examples:**
```
!rank                                # Your rank
!rank @user                          # Someone else's rank
```

**Shows:**
- Current level
- Current XP / XP needed for next level
- Server rank position
- Progress bar
- Total messages sent
- Daily/weekly XP stats

**Aliases:** `level`, `xp`

---

### !leaderboard
**Permission:** None (Everyone)  
**Description:** View server XP leaderboard  
**Usage:** `!leaderboard [page]`

**Examples:**
```
!leaderboard                         # Page 1
!leaderboard 2                       # Page 2
```

**Shows:**
- Top 10 members per page
- Rank, username, level, XP
- Your position highlighted

**Aliases:** `lb`, `top`, `levels`

---

## 💰 Economy Commands

### !daily
**Permission:** None (Everyone)  
**Description:** Claim your daily coin reward with streak bonuses  
**Usage:** `!daily`
**Cooldown:** 24 hours

**Rewards:**
- Base reward: 500 coins
- Streak bonus: +50 coins per day (max 1000)
- Total possible: 1500 coins/day

**Streak System:**
- Claim daily to build streak
- 48-hour grace period (24hr + 24hr buffer)
- Milestone celebrations at 7, 30, 100 days

**Examples:**
```
!daily                               # Claim daily reward
```

**Shows:**
- Coins earned
- Current streak
- Longest streak
- Next claim time if on cooldown

**Aliases:** `dailyreward`

---

### !balance
**Permission:** None (Everyone)  
**Description:** View your or another user's coin balance  
**Usage:** `!balance [@user]`

**Examples:**
```
!balance                             # Your balance
!balance @user                       # Someone's balance
```

**Shows:**
- 💰 Wallet coins
- 🏦 Bank coins
- Total coins
- Total earned (all-time)
- Total spent (all-time)

**Aliases:** `bal`, `coins`, `money`, `wallet`

---

### !profile
**Permission:** None (Everyone)  
**Description:** View visual profile card with stats and customization  
**Usage:** `!profile [@user]`
**Cooldown:** 5 seconds

**Examples:**
```
!profile                             # Your profile
!profile @user                       # Someone's profile
```

**Card Features:**
- Custom background (purchased from shop)
- Circular avatar with colored border
- Username, tag, and custom title
- Personal bio (up to 200 characters)
- Stats: coins, streak, rep, messages
- Up to 5 badges displayed
- 900x300px Canvas-generated image

**Aliases:** `prof`, `card`, `me`

---

### !shop
**Permission:** None (Everyone)  
**Description:** Browse and purchase shop items  
**Usage:** `!shop [category]`

**Features:**
- Interactive button navigation
- One item per page for clear viewing
- Previous/Next/Close buttons
- Buy button (disabled if owned/broke)
- Preview button (ephemeral image)
- **No timeout** - stays open until you buy or close

**Categories:**
- backgrounds - Profile backgrounds (12 available)

**Rarities:**
- Common: 1000 coins
- Uncommon: 2000 coins
- Rare: 3500 coins
- Epic: 5000 coins
- Legendary: 7500 coins
- Mythic: 10000 coins

**Examples:**
```
!shop                                # Browse all items
!shop backgrounds                    # Filter by category
```

**Aliases:** `store`, `buy`

---

### !inventory
**Permission:** None (Everyone)  
**Description:** View your purchased items  
**Usage:** `!inventory [category]`

**Examples:**
```
!inventory                           # View all items
!inventory backgrounds               # View backgrounds only
```

**Shows:**
- Item name and rarity
- Purchase/earned date
- [EQUIPPED] status for active items
- Pagination (5 items per page)

**Aliases:** `inv`, `bag`, `items`

---

### !setbackground
**Permission:** None (Everyone)  
**Description:** Apply a purchased background to your profile  
**Usage:** `!setbackground <background_id>`

**Examples:**
```
!setbackground sunset                # Apply sunset background
!setbackground default               # Reset to default
```

**Notes:**
- Must own the background first
- Shows preview before confirmation
- Updates profile card immediately

**Aliases:** `setbg`, `background`, `bg`

---

### !setprofile
**Permission:** None (Everyone)  
**Description:** Customize your profile card  
**Usage:** `!setprofile <setting> <value>`

**Settings:**
- **bio** - Personal bio (max 200 chars)
- **title** - Custom title (max 100 chars)
- **color** - Background color (hex: #RRGGBB)
- **accent** - Border/highlight color (hex: #RRGGBB)
- **stats** - Toggle stats visibility (on/off)
- **badges** - Toggle badges visibility (on/off)

**Examples:**
```
!setprofile bio Hello! I love coding          # Set bio
!setprofile title Discord Wizard              # Set title
!setprofile color #667eea                     # Purple background
!setprofile accent #f093fb                    # Pink accent
!setprofile stats off                         # Hide stats
!setprofile badges on                         # Show badges
!setprofile bio clear                         # Clear bio
```

**Aliases:** `customize`, `profileset`

---

### !hourly
**Permission:** None (Everyone)  
**Description:** Claim hourly reward  
**Usage:** `!hourly`
**Cooldown:** 60 minutes
**Reward:** 100 coins

**Examples:**
```
!hourly                              # Claim reward
```

**Aliases:** Part of `!claim` system

---

### !work
**Permission:** None (Everyone)  
**Description:** Work for coins  
**Usage:** `!work`
**Cooldown:** 30 minutes
**Reward:** 150 coins

**Examples:**
```
!work                                # Work for coins
```

**Aliases:** Part of `!claim` system

---

### !bonus
**Permission:** None (Everyone)  
**Description:** Claim bonus reward  
**Usage:** `!bonus`
**Cooldown:** 120 minutes (2 hours)
**Reward:** 300 coins

**Examples:**
```
!bonus                               # Claim bonus
```

**Aliases:** Part of `!claim` system

---

### !claim
**Permission:** None (Everyone)  
**Description:** Claim timed rewards  
**Usage:** `!claim <hourly|work|bonus>`

**Examples:**
```
!claim                               # List all rewards
!claim hourly                        # Claim hourly (100 coins)
!claim work                          # Claim work (150 coins)
!claim bonus                         # Claim bonus (300 coins)
```

**Rewards:**
- Hourly: 100 coins every 60 minutes
- Work: 150 coins every 30 minutes
- Bonus: 300 coins every 120 minutes

**Notes:**
- Can use !hourly, !work, !bonus directly
- Tracks claim count per reward type
- Shows remaining cooldown time

---

## 🎫 Support Commands

### !ticket
**Permission:** None (Everyone)  
**Description:** Create a support ticket  
**Usage:** `!ticket [reason]`

**Examples:**
```
!ticket                              # Create blank ticket
!ticket Need help with roles         # Create with reason
```

**What happens:**
- Private channel created
- Support team notified
- Ticket number assigned
- Initial message logged

**Aliases:** `createticket`, `newticket`, `support`

---

### !close
**Permission:** Support Staff or Ticket Creator  
**Description:** Close a support ticket  
**Usage:** `!close [reason]`

**Examples:**
```
!close                               # Close current ticket
!close Issue resolved                # Close with reason
```

**What happens:**
- Ticket marked as closed
- Channel archived or deleted
- Transcript saved
- Creator notified

**Aliases:** `closeticket`

---

### !claim
**Permission:** Support Staff  
**Description:** Claim a ticket to work on it  
**Usage:** `!claim`

**What happens:**
- Ticket assigned to you
- Status changed to "claimed"
- Channel renamed to show claimer
- Logged in transcript

**Aliases:** `claimticket`

---

### !transcript
**Permission:** Support Staff  
**Description:** Generate ticket transcript  
**Usage:** `!transcript`

**Generates:**
- Full message history
- Attachments list
- Timestamps
- Participant list
- Ticket metadata

**Format:** Text file sent in channel

---

## 💬 Custom Embed Commands

### !embed
**Permission:** Administrator  
**Description:** Create a custom embed with interactive builder  
**Usage:** `!embed`

**Interactive Builder:**
- Set title, description, color
- Add fields (up to 25)
- Set footer text and icon
- Set author name and icon
- Add thumbnail and image
- Set timestamp
- Use variables: {user}, {server}, {members}, {date}, {time}

**Examples:**
```
!embed                               # Start interactive builder
```

**Features:**
- Button-based interface
- Preview before sending
- Save as template
- User avatar support ({user.avatar})

**Aliases:** `createembed`, `embedbuilder`

---

### !embedset
**Permission:** Administrator  
**Description:** Save current embed as a template  
**Usage:** `!embedset <template_name>`

**Examples:**
```
!embedset welcome                    # Save welcome template
!embedset rules                      # Save rules template
```

**Notes:**
- Templates saved per server
- Use saved templates in welcome/event messages
- Support for all variables

**Aliases:** `saveembed`, `templateembed`

---

### !embedhelp
**Permission:** None (Everyone)  
**Description:** View embed builder help and variables  
**Usage:** `!embedhelp`

**Shows:**
- Available variables
- Color codes
- Builder instructions
- Example templates

**Aliases:** `embedguide`, `embedvars`

---

## 🎵 Music Commands

### !play
**Permission:** None (Everyone)  
**Description:** Play music from YouTube  
**Usage:** `!play <song name|url>`

**Examples:**
```
!play never gonna give you up        # Search YouTube
!play https://youtube.com/watch?v=... # Direct URL
```

**Requirements:**
- You must be in a voice channel
- Bot will join your channel

**Aliases:** `p`

---

### !skip
**Permission:** None (Everyone)  
**Description:** Skip the current song  
**Usage:** `!skip`

**Aliases:** `s`, `next`

---

### !stop
**Permission:** None (Everyone)  
**Description:** Stop music and clear queue  
**Usage:** `!stop`

**What happens:**
- Music stops
- Queue clears
- Bot leaves voice channel

**Aliases:** `leave`, `dc`, `disconnect`

---

### !queue
**Permission:** None (Everyone)  
**Description:** View music queue  
**Usage:** `!queue [page]`

**Shows:**
- Current song (now playing)
- Upcoming songs
- Duration
- Who requested

**Aliases:** `q`, `playlist`

---

### !nowplaying
**Permission:** None (Everyone)  
**Description:** View currently playing song  
**Usage:** `!nowplaying`

**Shows:**
- Song title
- Progress bar
- Duration
- Requester
- Thumbnail

**Aliases:** `np`, `current`

---

### !volume
**Permission:** Manage Channels  
**Description:** Set music volume  
**Usage:** `!volume <1-100>`

**Examples:**
```
!volume 50                           # Set to 50%
!volume 100                          # Maximum
```

**Aliases:** `vol`, `v`

---

## 🎨 Custom Commands

### !customcommand add
**Permission:** Manage Server  
**Description:** Create a custom command  
**Usage:** `!customcommand add <name> <response>`

**Examples:**
```
!customcommand add hello Hello {user}!
!customcommand add rules Check #rules for server rules!
```

**Aliases:** `cc add`, `cmd add`

---

### !customcommand remove
**Permission:** Manage Server  
**Description:** Delete a custom command  
**Usage:** `!customcommand remove <name>`

**Aliases:** `cc remove`, `cc delete`, `cmd remove`

---

### !customcommand list
**Permission:** None (Everyone)  
**Description:** List all custom commands  
**Usage:** `!customcommand list`

**Aliases:** `cc list`, `cmd list`

---

## 📋 Common Use Cases

### Initial Server Setup
```
1. !setup                            # Run setup wizard
2. !setrole staff @Moderator         # Add staff roles
3. !config                           # Review settings
4. !setchannel birthday #birthdays   # Set birthday channel
5. !setchannel welcome #welcome      # Set welcome channel
```

### Community Engagement
```
!createevent 7d | Weekly Game Night | Join us for fun!
!customcommand add socials Follow us: Twitter @example
!reactionrole create <msg_id> 🎮 @Gamer
```

### Adjusting Security
```
!config susthreshold 5               # Less sensitive
!config accountagethreshold 48       # Flag 48h old accounts
!config inviteverification on       # Enable invite blocking
!config antispam on                  # Enable spam detection
!config badwords on                  # Enable word filter
```

### Moderation Workflow
```
1. !checkuser @suspicious_member     # Investigate
2. !warn @user Reason                # Warn if minor
3. !kick @user Reason                # Kick if moderate
4. !ban @user Reason                 # Ban if severe
```

### Managing Roles
```
!setrole sus @🚨 Suspicious          # Custom sus role
!setrole newaccount @🥚 New          # Custom new role
!setrole staff @Mod                  # Add staff access
```

### Cleaning Chat
```
!purge 50                            # Clear 50 messages
!purge 100 @spammer                  # Clear from spammer
```

---

## 🚨 Emergency Commands

**Under Attack?**
```
!config membertracking on            # Enable tracking
!config susthreshold 2               # Very sensitive
!config accountage on                # Flag new accounts
!config accountagethreshold 1        # < 1 hour = new
```

**Raid Cleanup:**
```
!ban @raider1 Raid
!ban @raider2 Raid
!purge 100                           # Clean messages
```

---

## 💡 Pro Tips

1. **Use `!config` regularly** to review and adjust settings
2. **Check `!checkuser`** before taking action on suspicious members
3. **Use `!help <command>`** to learn command details
4. **Test with high thresholds first**, then lower if needed
5. **Monitor your alert channel** for security notifications
6. **Keep prefix simple** - single character works best
7. **Add multiple staff roles** for different permission levels
8. **Review mod-logs** regularly to track team actions

---

## ⚠️ Important Notes

- **Case Sensitive:** Usernames and roles are case-sensitive
- **Mentions vs IDs:** Both work, but IDs are more reliable
- **Cooldowns:** Some commands have cooldowns to prevent spam
- **Permissions:** Bot must have higher role than target user
- **Hierarchy:** You cannot moderate users with equal/higher roles
- **Rate Limits:** Discord limits how fast bots can take actions
- **Message Deletion:** Can only delete messages < 14 days old
- **DMs:** Some actions try to DM users (may fail if DMs disabled)

---

## 🔗 Quick Links

- **Setup Guide:** See INSTALLATION.md
- **Features Guide:** See FEATURES.md
- **Project Structure:** See PROJECT_STRUCTURE.md
- **Quick Start:** See QUICKSTART.md

---

**Need help?** Run `!help` in your server or check the documentation files!
