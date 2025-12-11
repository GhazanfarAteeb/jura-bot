# Slash Commands Setup

The bot now supports both traditional prefix commands (`R!command`) and modern slash commands (`/command`)!

## Quick Start

### 1. Deploy Slash Commands

Run this once to register slash commands with Discord:

```powershell
npm run deploy-commands
```

This will register all commands that have slash command support.

### 2. Using Slash Commands

Type `/` in Discord and you'll see all available bot commands:
- `/play query:payphone maroon 5` - Play a song
- `/profile user:@someone` - View someone's profile
- `/help` - Show help menu

## Adding Slash Command Support to Commands

To add slash command support to any command:

### 1. Import the utilities

```javascript
import { createSlashCommand, executeSlashWrapper } from '../../utils/slashCommands.js';
```

### 2. Add `data` property

```javascript
export default {
    name: 'mycommand',
    description: 'My command description',
    // ... other properties
    
    // Add slash command data
    data: createSlashCommand('mycommand', 'My command description', [
        { type: 'string', name: 'arg1', description: 'First argument', required: true },
        { type: 'user', name: 'user', description: 'Target user', required: false }
    ]),
```

### 3. Add `executeSlash` function

```javascript
    executeSlash: async (interaction) => {
        return await executeSlashWrapper(interaction, exports.default.execute);
    },
```

### 4. Deploy the command

```powershell
npm run deploy-commands
```

## Option Types

Supported option types for slash commands:
- `string` - Text input
- `user` - User mention
- `integer` - Number
- `boolean` - True/False

## Examples

### Play Command

Works with both:
- `R!play payphone maroon 5`
- `/play query:payphone maroon 5`

The play command now supports multi-word queries including artist names!

### Profile Command

Works with both:
- `R!profile @user`
- `/profile user:@someone`

## Currently Supported Slash Commands

✅ `/play` - Play music
✅ `/profile` - View profile card

More commands can be easily added using the same pattern!

## Benefits of Slash Commands

1. **Auto-completion** - Discord shows available commands as you type
2. **Parameter hints** - Shows what each parameter does
3. **Validation** - Discord validates input before sending
4. **Modern UI** - Better user experience
5. **Discovery** - Users can see all commands by typing `/`

## Deployment to Production

When deploying to Render or any server:

1. Add to your deployment process:
```powershell
npm install
npm run deploy-commands
npm start
```

2. Or run it manually once after deployment

## Troubleshooting

**Commands not showing up?**
- Make sure you ran `npm run deploy-commands`
- Wait a few minutes for Discord to update
- Check bot has `applications.commands` scope

**Slash command errors?**
- Check console for error messages
- Ensure `CLIENT_ID` is set in `.env`
- Verify bot token has proper permissions

## Notes

- Slash commands are registered globally (work in all servers)
- Changes to slash commands require re-deployment
- Both prefix and slash commands work simultaneously
- Case-insensitive prefix support: `r!`, `R!`, `r! `, `R! ` all work
