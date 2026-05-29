---
description: "Use when writing any bot response, embed, reply, or user-facing message. Enforces the strict no-emoji rule for all bot text content. Discord reactions are still allowed. Covers what symbols are permitted, forbidden patterns, and acceptable alternatives."
applyTo: "src/**/*.js"
---

# No Emoji in Bot Messages

## The Rule

**Never use emoji characters in any bot-sent text.** This includes:

- Embed `.setTitle()`, `.setDescription()`, `.addFields()` values
- `.setFooter({ text: '...' })`
- `.setAuthor({ name: '...' })`
- Any `content:` string in `message.reply()`, `message.channel.send()`, or interaction replies
- Button labels (`.setLabel()`)
- Select menu placeholders or option labels

## Forbidden Patterns

```js
// WRONG — emoji in embed description
embed.setDescription("✅ Successfully banned the user!");
embed.setDescription("🎵 Now playing: " + track.title);
embed.addFields({ name: "❌ Error", value: "Something went wrong." });
embed.setTitle("🎉 Welcome!");

// WRONG — emoji in reply content
message.reply("✅ Done!");
message.reply({ content: "❌ You cannot do that." });
```

## Allowed Alternatives

Use Unicode decorative symbols and punctuation instead:

| Purpose           | Use this                 | Not this          |
| ----------------- | ------------------------ | ----------------- |
| Success indicator | `◈ Success` or text only | `✅`              |
| Error/failure     | `◆ Error` or `—`         | `❌` `🚫`         |
| Info / bullet     | `▸` `•` `›`              | `ℹ️` `📌`         |
| Music / audio     | text only or `◉`         | `🎵` `🎶`         |
| Warning           | `◆ Warning`              | `⚠️`              |
| Section headers   | `▸ Section Name`         | `📋 Section Name` |
| Celebration       | descriptive text         | `🎉` `🎊`         |
| Numbers/ranking   | `#1` `—`                 | `1️⃣`              |

## Reactions Are Allowed

Reactions are the correct feedback mechanism for quick status signals:

```js
// CORRECT — reaction for feedback
await message.react("✅");
await message.react("❌");

// CORRECT — reaction to confirm action
await message.react("👍");
```

Reactions (`message.react()`) are the only place emoji codepoints should appear in command code.

## Acceptable Symbols Reference

These Unicode characters are safe and consistent with Raphael's aesthetic:

```
▸   — right-pointing triangle (field/list prefix)
◉   — bullseye (status, active)
◈   — diamond with dot (highlight)
◆   — solid diamond (section, warning)
—   — em dash (separator)
•   — bullet point
›   — single right angle quote (breadcrumb, sub-items)
│   — vertical bar (table borders, progress)
░ ▒ ▓ █  — block characters (progress bars)
```

## Raphael Persona Tone

Formal text naturally avoids emoji. Raphael is analytical and composed — emoji clash with the persona. When in doubt, use plain, precise language over any decorative character.

```js
// CORRECT — formal, no emoji
embed.setDescription(
  "The member has been removed from this server. All records have been updated.",
);

// WRONG — casual emoji usage
embed.setDescription("👢 Member has been kicked! Bye bye!");
```
