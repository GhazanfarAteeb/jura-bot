---
description: "Use when writing or modifying music commands, the Riffy music client, Lavalink/NodeLink integration, queue management, now-playing cards, or music event handlers. Covers riffy v1 patterns, NodeLink quirks, voice state validation, player lifecycle, and search platform conventions."
applyTo:
  [
    "src/commands/music/**/*.js",
    "src/music/**/*.js",
    "src/events/music/**/*.js",
  ]
---

# Music System — Riffy + NodeLink Patterns

## Architecture Overview

- **Client library:** `riffy` v1 (Lavalink v4 protocol)
- **Node server:** NodeLink (Lavalink-compatible, self-hosted)
- **Attachment point:** `client.riffy` — initialized by `RiffyManager` after `clientReady`
- **All music commands** use the `Command` class (class-based format, not plain-object)

## Player Retrieval Pattern

```js
// In command run()
const player = client.riffy.players.get(message.guild.id);

// Check if a player already exists
if (!player) {
  // create one or return error embed
}
```

## Creating a Player

```js
const player = client.riffy.createPlayer({
  guildId: message.guild.id,
  voiceChannel: message.member.voice.channel.id,
  textChannel: message.channel.id,
  deaf: true,
  mute: false,
});
```

Always validate the member is in a voice channel first:

```js
const voiceChannel = message.member.voice?.channel;
if (!voiceChannel) {
  return message.reply({ embeds: [notInVoiceEmbed(client)] });
}

// Check bot's voice state — if already in a different channel, reject
const botVoice = message.guild.members.me.voice?.channel;
if (botVoice && botVoice.id !== voiceChannel.id) {
  return message.reply({ embeds: [differentChannelEmbed(client)] });
}
```

## Search & Play

Default search platform is `'ytmsearch'` (YouTube Music). Always use this unless the user explicitly passes a URL or requests a different source.

```js
const query = args.join(" ");
if (!query) return message.reply({ embeds: [noQueryEmbed(client)] });

const result = await client.riffy.resolve({
  query,
  source: query.startsWith("http") ? undefined : "ytmsearch",
  requester: message.author,
});

if (!result || result.loadType === "error" || result.loadType === "empty") {
  return message.reply({ embeds: [noResultsEmbed(client, query)] });
}

if (result.loadType === "playlist") {
  for (const track of result.tracks) player.queue.add(track);
} else {
  player.queue.add(result.tracks[0]);
}

if (!player.playing && !player.paused) player.play();
```

## NodeLink Bug Workaround (Code 4017)

NodeLink occasionally drops the voice session between `voiceStateUpdate` and the actual play request. When this happens, the REST PATCH must combine the voice credentials with the track in a single atomic request. This is handled in `src/music/RiffyManager.js` via `safePlay()`.

**Do not call `player.play()` directly in music commands** when creating a fresh player. Instead, call `player.play()` after the player has successfully connected — the `playerCreate` event in `RiffyManager` wraps this automatically.

## Queue Operations

```js
// Skip current track
player.stop();

// Skip N tracks
player.queue.splice(0, n);
player.stop();

// Pause / Resume
player.pause(true); // pause
player.pause(false); // resume

// Seek (milliseconds)
if (!player.current?.info?.isSeekable) {
  return message.reply({ embeds: [notSeekableEmbed(client)] });
}
player.seek(positionMs);

// Volume (0–200, default 100)
player.setVolume(volume);

// Loop modes
player.setLoop("none" | "track" | "queue");

// Clear queue
player.queue.clear();

// Destroy player
player.destroy();
```

## Now-Playing / Track Info

```js
const track = player.current;
if (!track) return message.reply({ embeds: [nothingPlayingEmbed(client)] });

const { title, author, uri, duration, thumbnail } = track.info;
const position = player.position; // current position in ms

// Progress bar via Utils
import Utils from "../../structures/Utils.js";
const bar = Utils.progressBar(position, duration, 20);
const posStr = Utils.formatTime(position);
const durStr = Utils.formatTime(duration);
```

## Volume & Filter Safety

```js
const vol = parseInt(args[0], 10);
if (isNaN(vol) || vol < 0 || vol > 200) {
  return message.reply({ embeds: [invalidVolumeEmbed(client)] });
}
```

Filters are applied via `player.filters`. Always call `player.filters.setEqualizer([])` to reset before applying new presets.

## DJ Role Check

When a command has `player.dj: true`, verify against the guild's configured DJ role:

```js
const guildData = await Guild.getGuild(message.guild.id);
const djRoleId = guildData.roles?.djRole;
const hasDj = !djRoleId || message.member.roles.cache.has(djRoleId);
if (!hasDj) {
  return message.reply({ embeds: [noDjRoleEmbed(client)] });
}
```

## Music Events (RiffyManager)

Riffy events are proxied to client events. Listen to client events in `src/events/music/`:

| Riffy event     | Client event emitted |
| --------------- | -------------------- |
| `trackStart`    | `musicTrackStart`    |
| `trackEnd`      | `musicTrackEnd`      |
| `queueEnd`      | `musicQueueEnd`      |
| `playerCreate`  | `musicPlayerCreate`  |
| `playerDestroy` | `musicPlayerDestroy` |

Event handlers in `src/events/music/` must follow the `Event` base class pattern:

```js
import Event from "../../structures/Event.js";

export default class TrackStartEvent extends Event {
  constructor() {
    super("musicTrackStart", false);
  }

  async run(client, player, track) {
    // send now-playing embed to player.textChannel
  }
}
```

## Error Handling in Music Commands

Music-specific errors to handle gracefully:

- `VOICE_CONNECTION_TIMEOUT` — destroy player, send timeout embed
- NodeLink `4017` error — handled by `safePlay()` in RiffyManager; surface friendly embed
- `track.info.isStream` — live streams have `duration: 0`; handle in display logic

```js
try {
  // music logic
} catch (error) {
  if (player) player.destroy();
  console.error("[MusicCommand] Error:", error);
  return message.reply({ embeds: [musicErrorEmbed(client, error)] });
}
```
