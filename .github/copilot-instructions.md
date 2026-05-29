# Raphael Discord Bot — Copilot Instructions

You are an expert Discord bot developer working on **Raphael**, a feature-rich community bot built with discord.js v14. You have deep expertise in JavaScript, Discord API patterns, economy/currency systems, and Lavalink-based music systems using the `riffy` client.

## Core Identity

- Bot name: **Raphael** — persona from _That Time I Got Reincarnated as a Slime_
- Formal, analytical tone; addresses users as "Master"
- Footers use `getRandomFooter()` from `src/utils/raphael.js`
- GLYPH constants (`▸`, `◉`, `◈`, `◆`) are used for field prefixes

## Module System

- All source files under `src/` use **ESM** (`import`/`export`). Never use `require()` in `.js` files.
- The one exception is `src/config/index.cjs` which is CJS — load it via `createRequire` when needed.
- Use `fileURLToPath(import.meta.url)` + `path.dirname()` to get `__dirname` in ESM.

## Code Quality Standards

- **async/await everywhere** — never use `.then()` / `.catch()` chains for business logic.
- **One concern per file** — one command per file, one model per file, one event per file.
- **Modular** — extract reusable logic into `src/utils/` or `src/structures/`. Never duplicate logic across commands.
- **No magic numbers** — use named constants or config values.
- **Early returns** — validate at the top of every function, return early on failure.
- **No dead code** — remove unused variables, imports, and commented-out blocks.
- **Consistent naming** — camelCase for variables/functions, PascalCase for classes/models.

## Response / Message Rules

- **Do NOT use emoji characters in bot message content or embed text** (e.g., no 🎵 ✅ ❌ 🎉 in `.setDescription()`, `.addFields()`, reply strings, or any `content:` property).
- Using Unicode decorative symbols is fine: `▸`, `◉`, `◈`, `◆`, `—`, `•`, `›`.
- Discord message **reactions** (`message.react()`) are allowed and encouraged for feedback.
- All user-facing text must use `EmbedBuilder`. Plain string replies are only acceptable for quick ephemeral errors.

## Error Handling

Every command `execute()` function must wrap its body in `try/catch`:

```js
try {
  // logic
} catch (error) {
  console.error(`[CommandName] Error:`, error);
  return message.reply({ embeds: [errorEmbed(error)] });
}
```

- DM send failures should be silently caught (wrap in inner try/catch).
- Never let an uncaught promise escape a command handler.

## Guild Config

- Always use `Guild.getGuild(guildId)` — never query the Guild model directly.
- Always use `Guild.updateGuild(guildId, data)` — never call `.save()` on guild documents.
- Cache is Redis-first (30 min TTL) → in-memory fallback. Do not bypass it.

## Embeds

```js
const embed = new EmbedBuilder()
  .setColor(client.color.main) // or .red / .green / .yellow
  .setTitle("...")
  .setDescription("...")
  .setFooter({ text: getRandomFooter() });
```

- Always set `.setColor()` and `.setFooter()`.
- Use `.addFields()` for structured data, not description concatenation.

## Permissions

- Check `message.member.permissions.has(PermissionFlagsBits.X)` before admin actions.
- Check `client.guilds.cache.get(id)?.members.me.permissions.has(...)` for bot permission checks.
- Return a descriptive embed — never a raw permission error string.
