# 🎮 Quick Reference - New Commands v2.1.0

## 💰 Economy Commands (New)

### Adventure
```
!adventure    - Go on adventure for random coins (50-500)
Aliases: !adv, !quest
Cooldown: 1 hour
```

### Reputation
```
!rep @user    - Give +1 reputation to a user
Aliases: !reputation, !giverep
Cooldown: 24 hours per user
Cannot rep yourself or bots
```

### Gambling Games

#### Coinflip
```
!coinflip <amount> <heads|tails>
Aliases: !cf, !flip
Min: 10 | Max: 10,000
Win: 50% chance | Payout: 2x
Example: !coinflip 100 heads
```

#### Slots
```
!slots <amount>
Aliases: !slot, !slotmachine
Min: 10 | Max: 5,000
Payouts:
  Triple 7s:      10x
  Triple Diamonds: 7x
  Triple Match:    5x
  Double Match:    2x
Example: !slots 500
```

#### Dice
```
!dice <amount> <1-6>
Aliases: !rolldice, !diceroll
Min: 10 | Max: 1,000
Win: Guess correct number
Payout: 5x
Example: !dice 100 5
```

#### Roulette
```
!roulette <amount> <color|number>
Aliases: !roul, !wheel
Min: 10 | Max: 5,000
Color bets (red/black/green): 2x payout
Number bets (0-36): 35x payout
Examples:
  !roulette 100 red
  !roulette 50 17
```

### Leaderboards
```
!top coins    - View coins leaderboard
!top rep      - View reputation leaderboard
!top level    - View XP/level leaderboard
Aliases: !leaderboards, !rankings
Shows top 10 with pagination
Displays your rank in footer
```

### Admin Tools
```
!addcoins @user <amount>
Aliases: !awardcoins, !givecoins
Admin only
Max: 1,000,000 per transaction
Sends DM notification to recipient
Example: !addcoins @User 5000
```

### Coin Customization
```
!setcoin emoji <emoji>    - Change coin emoji
!setcoin name <name>      - Change coin name
!setcoin                  - Show current settings
Admin only
Examples:
  !setcoin emoji 🪙
  !setcoin name credits
```

---

## 🎨 Enhanced Profile Commands

### Profile vs Level
```
!profile [@user]  - Full profile WITH description
!level [@user]    - Quick rank card WITHOUT description
Both show: avatar, username, bio, title, stats, badges
Only !profile shows: description section
```

### Profile Customization
```
!setprofile description <text>       - Set description (max 500 chars)
!setprofile blurcolor <rgba>         - Set description blur color
!setprofile bio <text>               - Set bio (max 200 chars)
!setprofile title <text>             - Set title (max 100 chars)
!setprofile color <hex>              - Set background color
!setprofile accent <hex>             - Set accent color
!setprofile stats on/off             - Toggle stats display
!setprofile badges on/off            - Toggle badges display

Examples:
  !setprofile description I love gaming and music!
  !setprofile blurcolor rgba(255,0,0,0.7)
  !setprofile bio Just here to vibe
  !setprofile title ⚔️ Warrior
```

---

## 📊 Statistics Command

### Usage
```
!stats [@user]    - View detailed statistics
Aliases: !statistics, !serverstats, !userstats
Cooldown: 10 seconds
```

### Features
- **Dropdown Menu**: Select time range (1d, 7d, 14d, all-time)
- **Button Views**:
  - 💬 Messages - Message count and daily averages
  - 🎤 Voice Activity - Voice time and daily averages
  - 📍 Top Channels - Most active channels
  - 🔄 Refresh - Update statistics

### What's Tracked
- Message count per day (30-day history)
- Voice session duration (30-day history)
- Top 10 channels per user
- Server rankings
- Last activity timestamps

---

## ℹ️ Updated Help Command

### Usage
```
!help           - Interactive help menu
!help <command> - Detailed command info
Aliases: !h, !commands
```

### Features
- **7 Categories**: Config, Moderation, Economy, Music, Community, Info, Utility
- **Dropdown Menu**: Select category to browse
- **Command Details**: Usage, aliases, permissions, cooldowns
- **Refresh Button**: Update without re-running
- **5-Minute Timeout**: Buttons disable after inactivity

### Categories
```
⚙️  Configuration  (6 commands)
🛡️  Moderation     (5 commands)
💰 Economy        (18 commands)
🎵 Music          (26 commands)
🎉 Community      (8 commands)
ℹ️  Information    (5 commands)
🔧 Utility        (7 commands)
```

---

## 🎯 Quick Examples

### Earn Coins
```
!daily              # Daily reward (500-1500 coins)
!adventure          # Random coins (50-500)
!coinflip 100 heads # Gamble 100 coins
!slots 500          # Play slot machine
```

### Give Reputation
```
!rep @Friend        # Give reputation to Friend
```

### View Stats
```
!stats              # Your statistics
!stats @User        # User's statistics
!top coins          # Coins leaderboard
!top rep            # Reputation leaderboard
```

### Customize Profile
```
!setprofile description I'm awesome!
!setprofile blurcolor rgba(0,0,0,0.8)
!profile            # View full profile
!level              # Quick rank card
```

### Admin
```
!addcoins @User 1000    # Award 1000 coins
!setcoin emoji 💎       # Change coin emoji
!setcoin name gems      # Rename coins
```

---

## 📋 Command Cooldowns

| Command | Cooldown | Per User/Channel |
|---------|----------|------------------|
| !adventure | 1 hour | Per user |
| !rep | 24 hours | Per target user |
| !coinflip | 5 seconds | Per user |
| !slots | 5 seconds | Per user |
| !dice | 5 seconds | Per user |
| !roulette | 5 seconds | Per user |
| !stats | 10 seconds | Per user |
| !top | 10 seconds | Per user |
| !help | 5 seconds | Per user |
| !setprofile | 5 seconds | Per user |

---

## 🎲 Gambling Statistics

Track your gambling performance:
- **Wins**: Total games won
- **Losses**: Total games lost
- **Total Gambled**: Total amount wagered

View in:
- `!profile` - Shows W/L record
- All gambling game embeds - Footer displays stats

---

## 💡 Pro Tips

1. **Daily Routine**: `!daily` → `!adventure` → Gamble profits
2. **Rep Trading**: Build reputation by helping others
3. **Profile Customization**: Use RGBA for transparent blur effects
4. **Stats Tracking**: Check `!stats` to see your most active channels
5. **Leaderboard Climbing**: Focus on messages for XP, gambling for coins
6. **Smart Gambling**: Start small, build up gradually
7. **Cooldown Management**: Use `!adventure` on cooldown, fill gaps with gambling

---

## 🆘 Need Help?

```
!help                    # Interactive menu
!help <command>          # Specific command help
docs/commands.html       # Full HTML reference page
COMMANDS.md              # Comprehensive markdown guide
UPDATE_SUMMARY.md        # What's new in v2.1.0
```

---

**Version**: v2.1.0  
**Total Commands**: 73  
**New in This Version**: 12 commands  
**Last Updated**: December 11, 2025
