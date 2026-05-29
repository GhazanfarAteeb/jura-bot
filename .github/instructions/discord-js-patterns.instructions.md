---
description: "Use when writing, editing, or reviewing any Discord bot command or event in this project. Covers ESM module patterns, command structure, embed conventions, permission checks, cooldowns, and discord.js v14 best practices."
applyTo: "src/**/*.js"
---

# Discord.js v14 Patterns & JavaScript Best Practices

## Command File Structure

The project supports two command formats. Choose based on context:

### Plain-Object Format (economy, moderation, config, community, fun, info, utility)

```js
import { EmbedBuilder, PermissionFlagsBits } from "discord.js";
import { getRandomFooter } from "../../utils/raphael.js";

export default {
  name: "commandname",
  aliases: ["alias1"],
  description: "What the command does",
  usage: "commandname <required> [optional]",
  cooldown: 5,
  userPermissions: [PermissionFlagsBits.ManageMessages],
  botPermissions: [
    PermissionFlagsBits.SendMessages,
    PermissionFlagsBits.EmbedLinks,
  ],
  category: "category",

  async execute(client, message, args) {
    try {
      // Early-return validation first
      if (!args[0]) {
        return message.reply({ embeds: [usageEmbed(client)] });
      }

      // Business logic here
    } catch (error) {
      console.error("[CommandName] Error:", error);
      return message.reply({ embeds: [errorEmbed(client, error)] });
    }
  },
};
```

### Class-Based Format (music commands only)

```js
import Command from "../../structures/Command.js";

export default class PlayCommand extends Command {
  constructor(client) {
    super(client, {
      name: "play",
      description: {
        content: "...",
        usage: "play <query>",
        examples: ["play lofi"],
      },
      aliases: ["p"],
      cooldown: 5,
      player: { voice: true, active: false, dj: false },
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
      // logic
    } catch (error) {
      console.error("[PlayCommand] Error:", error);
      return message.reply({ embeds: [errorEmbed(client, error)] });
    }
  }
}
```

## ESM Module Rules

- Always use `import`/`export` — never `require()` inside `src/`.
- For `__dirname` in ESM:
  ```js
  import { fileURLToPath } from "url";
  import path from "path";
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  ```
- To load `src/config/index.cjs`:
  ```js
  import { createRequire } from "module";
  const require = createRequire(import.meta.url);
  const config = require("../../config/index.cjs");
  ```

## Embed Construction

```js
const embed = new EmbedBuilder()
  .setColor(client.color.main) // main | red | green | yellow
  .setTitle("Title")
  .setDescription("Description text — no emojis, use ▸ ◉ ◈ ◆ • › instead")
  .addFields({ name: "▸ Field Name", value: "value", inline: true })
  .setFooter({ text: getRandomFooter() })
  .setTimestamp();
```

Rules:

- Always `.setColor()` + `.setFooter()` on every embed.
- Use `.addFields()` for tabular/structured data — not description string concatenation.
- Never use emoji characters (🎵 ✅ ❌) in any embed field, title, or description.
- Unicode decorative symbols are fine: `▸ ◉ ◈ ◆ — • ›`.

## Permission Checks

```js
// User permissions
if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
  return message.reply({ embeds: [noPermEmbed(client)] });
}

// Bot permissions
if (
  !message.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)
) {
  return message.reply({ embeds: [botNoPermEmbed(client)] });
}
```

- Always check before performing any privileged action.
- Return an embed — never a raw string.

## Cooldown Pattern

```js
const { cooldowns } = client;
if (!cooldowns.has(command.name)) cooldowns.set(command.name, new Collection());
const now = Date.now();
const timestamps = cooldowns.get(command.name);
const cooldownAmount = (command.cooldown ?? 3) * 1000;
if (timestamps.has(message.author.id)) {
  const expiration = timestamps.get(message.author.id) + cooldownAmount;
  if (now < expiration) {
    const timeLeft = ((expiration - now) / 1000).toFixed(1);
    return message.reply({ embeds: [cooldownEmbed(client, timeLeft)] });
  }
}
timestamps.set(message.author.id, now);
setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);
```

## Guild Config Access

```js
// ALWAYS use static helpers — never raw Mongoose queries on Guild model
const guildData = await Guild.getGuild(message.guild.id);
await Guild.updateGuild(message.guild.id, { "features.welcome.enabled": true });
// NEVER: guildData.save(), new Guild(), Guild.findOne()
```

## Async/Await Rules

- Use `async/await` for all async operations.
- Never chain `.then()` / `.catch()` in business logic.
- Always `await` database calls — never fire-and-forget unless intentional.
- Wrap independent parallel operations with `Promise.all([...])`.

## Validation Patterns

```js
// Target user resolution
const target =
  message.mentions.members.first() || message.guild.members.cache.get(args[0]);
if (!target) return message.reply({ embeds: [invalidUserEmbed(client)] });

// Number validation
const amount = parseInt(args[0], 10);
if (isNaN(amount) || amount <= 0)
  return message.reply({ embeds: [invalidAmountEmbed(client)] });

// Channel/Role resolution
const channel =
  message.mentions.channels.first() ||
  message.guild.channels.cache.get(args[0]);
```

## Reactions vs Reply Content

- For status feedback, prefer `message.react('✅')` over reply text where applicable.
- For info/data responses, always use an embed reply.
- Reactions are the one place emoji codepoints are acceptable.

## File Organization

- One command per file, one model per file, one event per file.
- Shared utilities go in `src/utils/` or `src/structures/`.
- Do not duplicate logic — extract to a helper if used in more than one command.
- Remove all unused imports, variables, and dead code before finalizing.
