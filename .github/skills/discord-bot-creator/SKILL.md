---
name: discord-bot-creator
description: "Use when creating new Discord bot commands, features, systems, or modules for Raphael. Covers the full workflow for building commands from scratch: economy commands, music commands, moderation, config, and utility. Includes patterns for class-based and plain-object commands, embed conventions, guild config access, currency logic, and Riffy music integration. Also use when scaffolding new models, event handlers, or utility helpers."
argument-hint: "Describe what feature/command to build (e.g. 'a new economy gambling command', 'a moderation warn system', 'a music queue shuffle command')"
---

# Discord Bot Creator — Raphael

## What This Skill Produces

A complete, production-ready command file (or system) following every convention in this codebase. Output is modular, fully async/await, has proper error handling, uses EmbedBuilder for all responses, and never contains emoji in bot message text.

## When to Use

- Creating a new command in any category (economy, music, moderation, community, config, fun, info, utility)
- Adding a new Mongoose model
- Adding a new event handler
- Scaffolding a new utility helper
- Refactoring an existing command to follow current conventions

---

## Step-by-Step Procedure

### Step 1 — Identify the Command Category & Format

| Category                                                   | Command Format                                    | Base Class                  |
| ---------------------------------------------------------- | ------------------------------------------------- | --------------------------- |
| music                                                      | Class-based (`extends Command`)                   | `src/structures/Command.js` |
| economy, moderation, config, community, fun, info, utility | Plain-object (`export default { name, execute }`) | none                        |

Determine: Does the command interact with voice/audio? → music format. Otherwise → plain-object.

### Step 2 — Gather Requirements

Before writing any code, confirm:

- Command name and aliases
- Required arguments (name, type, required/optional)
- Permissions needed (user + bot)
- Cooldown duration
- Which models/data it reads or mutates
- Whether it sends a single embed or has paginated output

### Step 3 — Load Reference Instructions

Load and follow these instruction files before writing:

- [discord-js-patterns](./../instructions/discord-js-patterns.instructions.md) — always
- [economy-system](./../instructions/economy-system.instructions.md) — for economy commands
- [music-nodelink](./../instructions/music-nodelink.instructions.md) — for music commands
- [no-emoji-messages](./../instructions/no-emoji-messages.instructions.md) — always

### Step 4 — Write the Command File

#### Plain-Object Template

```js
import { EmbedBuilder, PermissionFlagsBits } from "discord.js";
import { getRandomFooter } from "../../utils/raphael.js";
// Import models, utils as needed

export default {
  name: "commandname",
  aliases: [],
  description: "Brief description",
  usage: "commandname <required> [optional]",
  cooldown: 5,
  userPermissions: [],
  botPermissions: [
    PermissionFlagsBits.SendMessages,
    PermissionFlagsBits.EmbedLinks,
  ],
  category: "category",

  async execute(client, message, args) {
    try {
      // 1. Validate inputs (early returns)
      // 2. Fetch data
      // 3. Business logic
      // 4. Build embed
      // 5. Reply
    } catch (error) {
      console.error("[CommandName] Error:", error);
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(client.color.red)
            .setDescription("An error occurred while executing this command.")
            .setFooter({ text: getRandomFooter() }),
        ],
      });
    }
  },
};
```

#### Class-Based Template (Music)

```js
import { EmbedBuilder } from "discord.js";
import { getRandomFooter } from "../../utils/raphael.js";
import Command from "../../structures/Command.js";

export default class ExampleCommand extends Command {
  constructor(client) {
    super(client, {
      name: "commandname",
      description: {
        content: "Brief description",
        usage: "commandname <args>",
        examples: ["commandname example"],
      },
      aliases: [],
      cooldown: 5,
      player: { voice: true, active: true, dj: false },
      permissions: {
        dev: false,
        client: ["SendMessages", "EmbedLinks", "Connect", "Speak"],
        user: [],
      },
      slashCommand: false,
      category: "music",
    });
  }

  async run(client, message, args) {
    try {
      // Voice channel validation is handled by Command base class
      // Business logic here
    } catch (error) {
      console.error("[ExampleCommand] Error:", error);
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(client.color.red)
            .setDescription("An error occurred.")
            .setFooter({ text: getRandomFooter() }),
        ],
      });
    }
  }
}
```

### Step 5 — Embed Quality Checklist

Every embed must pass all of the following:

- [ ] `.setColor()` is set (use `client.color.main`, `.red`, `.green`, or `.yellow`)
- [ ] `.setFooter({ text: getRandomFooter() })` is present
- [ ] No emoji in title, description, field names, field values, or footer
- [ ] Structured data uses `.addFields()`, not description concatenation
- [ ] Field prefixes use GLYPH constants: `▸`, `◉`, `◈`, `◆`

### Step 6 — Validation Checklist

Before finalizing any command:

- [ ] All async operations are awaited
- [ ] No `.then()` / `.catch()` chains
- [ ] `try/catch` wraps the entire `execute()` or `run()` body
- [ ] Input validation at the top with early returns
- [ ] Permissions checked before privileged actions
- [ ] No `require()` in ESM files
- [ ] No unused imports or variables
- [ ] Guild config accessed via `Guild.getGuild()` / `Guild.updateGuild()` only
- [ ] Economy accessed via `Economy.getEconomy()` only
- [ ] No magic numbers — use named constants

### Step 7 — File Placement

| Category    | Path                                |
| ----------- | ----------------------------------- |
| economy     | `src/commands/economy/<name>.js`    |
| music       | `src/commands/music/<name>.js`      |
| moderation  | `src/commands/moderation/<name>.js` |
| config      | `src/commands/config/<name>.js`     |
| community   | `src/commands/community/<name>.js`  |
| fun         | `src/commands/fun/<name>.js`        |
| info        | `src/commands/info/<name>.js`       |
| utility     | `src/commands/utility/<name>.js`    |
| admin       | `src/commands/admin/<name>.js`      |
| new model   | `src/models/<ModelName>.js`         |
| new event   | `src/events/client/<eventName>.js`  |
| new utility | `src/utils/<helperName>.js`         |

---

## Common Patterns Quick Reference

### Paginated Output

```js
import Utils from "../../structures/Utils.js";
import Context from "../../structures/Context.js";

const ctx = new Context(message);
await Utils.paginate(ctx, embedArray);
```

### Target Member Resolution

```js
const target =
  message.mentions.members.first() || message.guild.members.cache.get(args[0]);
if (!target) return message.reply({ embeds: [invalidTargetEmbed(client)] });
```

### Guild Config Read/Write

```js
import Guild from "../../models/Guild.js";

const guildData = await Guild.getGuild(message.guild.id);
await Guild.updateGuild(message.guild.id, { "settings.someValue": newValue });
```

### Economy Coins

```js
import Economy from "../../models/Economy.js";

const eco = await Economy.getEconomy(message.author.id, message.guild.id);
await eco.addCoins(amount, "Reason logged in transaction");
await eco.removeCoins(amount, "Reason logged in transaction");
```

### Music Player Access

```js
const player = client.riffy.players.get(message.guild.id);
if (!player || !player.playing) {
  return message.reply({ embeds: [nothingPlayingEmbed(client)] });
}
```

---

## What NOT To Do

- Do not put emoji in any bot message text — use reactions for status feedback.
- Do not call `.save()` on Guild model — use `Guild.updateGuild()`.
- Do not use `.then()` chains — use `async/await`.
- Do not duplicate logic that already exists in `src/utils/` or `src/structures/`.
- Do not hardcode node/server credentials — use environment variables.
- Do not call `player.play()` directly on a fresh NodeLink player — let RiffyManager handle it.
- Do not use `require()` anywhere in `src/` except via `createRequire` for the one CJS config file.
