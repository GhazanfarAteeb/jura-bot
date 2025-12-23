# Music Bot Integration Guide

This bot now uses a properly working music module integrated from the `working-common-js-music-bot` directory.

## What Changed

### Removed
- Old music commands (they were empty anyway)
- Discord Player and related dependencies
- @discordjs/voice dependencies
- Old Riffy initialization code

### Added
- Working music bot integration module
- Riffy music system (properly configured)
- Music commands from working-common-js-music-bot
- Lavalink node configuration

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

This will install:
- `riffy` (latest) - Music player library
- `musicard` (latest) - Music card generation
- `ascii-table` - For formatted output
- `colors` - Terminal colors
- `moment` - Date/time handling

### 2. Configure Lavalink Server

You need a Lavalink server running. The bot is currently configured to use:
- Host: `ec2-3-109-121-14.ap-south-1.compute.amazonaws.com`
- Port: `2333`
- Password: `youshallnotpass`

To change this, update the `LAVALINK_NODES` in your `.env` file:

```env
LAVALINK_NODES=[{"host":"your-lavalink-host","port":2333,"password":"your-password","secure":false}]
```

For multiple nodes (redundancy):
```env
LAVALINK_NODES=[{"host":"node1.example.com","port":2333,"password":"pass1","secure":false},{"host":"node2.example.com","port":2333,"password":"pass2","secure":false}]
```

### 3. Environment Variables

Make sure your `.env` file includes:
```env
DISCORD_TOKEN=your_bot_token
MONGODB_URI=your_mongodb_uri
LAVALINK_NODES=[{"host":"lavalink-host","port":2333,"password":"password","secure":false}]
```

### 4. Run the Bot

```bash
npm start
```

## Music Commands Available

The following music commands are now available from the working music bot:

### Prefix Commands (developers folder)
- `reload-command` - Reload a prefix command
- `reload-slash` - Reload a slash command
- `server-stats` - View server statistics
- `shard` - Shard information
- `ping` - Check bot latency

### Slash Commands (music folder)
- `/play <song>` - Play a song
- `/pause` - Pause the current song
- `/resume` - Resume playback
- `/skip` - Skip to next song
- `/queue` - View the queue
- `/disconnect` - Disconnect from voice

## How It Works

1. **MusicBot Module** (`src/music/musicBot.js`):
   - Bridges the main ESM bot with the CommonJS music bot
   - Initializes Riffy with Lavalink nodes
   - Loads music commands and events
   - Handles CommonJS/ESM compatibility

2. **Command Loading**:
   - Music commands are loaded from `working-common-js-music-bot/structures/commands`
   - Slash commands are loaded from `working-common-js-music-bot/structures/slashcommands`
   - Both are integrated into the main bot's command collections

3. **Event Handling**:
   - Riffy events (node events, track events) are loaded
   - Button interactions for music controls are handled
   - All events use the main client instance

## Troubleshooting

### Music commands not working
1. Check if Lavalink server is running and accessible
2. Verify `LAVALINK_NODES` in `.env` is correct
3. Check bot logs for initialization errors

### "Riffy initialization failed"
- The Lavalink server might be down
- Check network connectivity to the Lavalink host
- Verify password and port are correct

### Commands not loading
- Make sure `working-common-js-music-bot` folder exists
- Check that all music command files are in place
- Review console logs during startup

## File Structure

```
src/
  music/
    musicBot.js          # Music integration module
  index.js               # Main bot file (imports MusicBot)
  
working-common-js-music-bot/
  structures/
    commands/            # Prefix commands
    slashcommands/       # Slash commands
    events/              # Music events
    riffy/              # Riffy event handlers
```

## Notes

- The main bot uses ESM (import/export)
- The music bot uses CommonJS (require/module.exports)
- The MusicBot module bridges these two systems
- All music functionality runs through the main client instance
- Commands are accessible through both the main bot's command handler and the music bot's handler
