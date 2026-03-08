/**
 * Play Command
 * Play a track or add to queue
 */

import Command from "../../structures/Command.js";
import { EmbedBuilder } from "discord.js";
import { getRandomFooter } from "../../utils/raphael.js";

/**
 * Bypass player.play()'s connected check by sending voice + track together
 * in a single REST request. NodeLink disconnects voice (code 4017) when no
 * track is loaded, so we must send both atomically.
 *
 * For already-playing players (queue additions), falls back to normal play().
 */
async function safePlay(client, player) {
  if (!player._voiceDataPromise) {
    // Player was already connected (e.g. adding to existing queue).
    // Voice is established, use normal play.
    try {
      await player.play();
      return true;
    } catch (e) {
      console.error("[Music] play() failed:", e.message);
      return false;
    }
  }

  // Wait for the intercepted voice credentials from Connection.checkAndSend
  let voiceData;
  try {
    voiceData = await Promise.race([
      player._voiceDataPromise,
      new Promise((_, rej) =>
        setTimeout(
          () => rej(new Error("Voice credentials timeout (15s)")),
          15000,
        ),
      ),
    ]);
  } catch (e) {
    console.error(`[Music] ${e.message}`);
    // Restore original method on failure
    if (player._origUpdateVoice) {
      player.connection.updatePlayerVoiceData = player._origUpdateVoice;
    }
    return false;
  }

  // Restore original updatePlayerVoiceData for future use (region changes, etc.)
  if (player._origUpdateVoice) {
    player.connection.updatePlayerVoiceData = player._origUpdateVoice;
    delete player._origUpdateVoice;
  }
  delete player._voiceDataPromise;

  if (!player.queue.length) return false;

  // Dequeue and resolve the track (mirrors what player.play() does internally)
  player.current = player.queue.shift();
  if (!player.current.track) {
    player.current = await player.current.resolve(player.riffy);
  }
  player.playing = true;
  player.position = 0;

  // Send combined voice + track in one PATCH so NodeLink connects AND plays atomically
  try {
    await player.node.rest.updatePlayer({
      guildId: player.guildId,
      data: {
        voice: voiceData,
        track: { encoded: player.current.track },
      },
    });
    player.connection.establishing = true;
    console.log("[Music] Combined voice+track REST request succeeded");
    return true;
  } catch (err) {
    console.error("[Music] Combined voice+track request failed:", err.message);
    player.queue.unshift(player.current);
    player.current = null;
    player.playing = false;
    return false;
  }
}

export default class Play extends Command {
  constructor(client) {
    super(client, {
      name: "play",
      description: {
        content: "Play a song or add it to the queue",
        usage: "<song name or URL>",
        examples: [
          "play Never Gonna Give You Up",
          "play https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        ],
      },
      aliases: ["p"],
      category: "music",
      cooldown: 3,
      args: true,
      player: {
        voice: true,
        dj: false,
        active: false,
        djPerm: null,
      },
      permissions: {
        dev: false,
        client: [
          "SendMessages",
          "ViewChannel",
          "EmbedLinks",
          "Connect",
          "Speak",
        ],
        user: [],
      },
      slashCommand: true,
      options: [
        {
          name: "query",
          description: "The song name or URL to play",
          type: 3, // STRING
          required: true,
        },
      ],
    });
  }

  async run(client, ctx, args) {
    const query = args.join(" ");

    if (!query) {
      return ctx.sendMessage({
        embeds: [
          {
            color: 0xff4757,
            title: "『 Audio System 』",
            description:
              "**Warning:** No audio source specified, Master.\n\nPlease provide a track name or URL.",
          },
        ],
      });
    }

    // Check if Riffy is initialized
    if (!client.riffy) {
      return ctx.sendMessage({
        embeds: [
          {
            color: 0xff4757,
            title: "『 System Alert 』",
            description:
              "**Warning:** Audio subsystem is currently unavailable, Master.\n\nPlease attempt again later.",
          },
        ],
      });
    }

    const member = ctx.member;
    const voiceChannel = member.voice.channel;

    // Create or get player
    let player = client.riffy.players.get(ctx.guild.id);
    console.log(
      `[Music] Player lookup for guild ${ctx.guild.id}:`,
      player ? "Found existing player" : "No player found, creating new one",
    );
    console.log(
      `[Music] Voice channel for member ${member.user.tag}:`,
      voiceChannel ? voiceChannel.name : "Not in a voice channel",
    );
    if (!player) {
      player = client.riffy.createConnection({
        guildId: ctx.guild.id,
        voiceChannel: voiceChannel.id,
        textChannel: ctx.channel.id,
        deaf: true,
        mute: false,
      });

      // Intercept Connection.updatePlayerVoiceData to prevent NodeLink from
      // receiving voice-only data (which causes a 4017 disconnect because no
      // track is loaded yet). We'll capture the voice data and send it bundled
      // with the track in safePlay().
      const origUpdate = player.connection.updatePlayerVoiceData.bind(
        player.connection,
      );
      player._origUpdateVoice = origUpdate;
      let resolveVoice;
      player._voiceDataPromise = new Promise((r) => {
        resolveVoice = r;
      });
      player.connection.updatePlayerVoiceData = async function (voiceData) {
        // Signal that credentials are ready, but don't send to NodeLink yet
        resolveVoice(voiceData);
        // Mark establishing so checkAndSend's finally block resolves the deferred
        this.establishing = true;
        return {};
      };
    }

    // Resolve the query
    const resolve = await client.riffy.resolve({ query, requester: member });
    const { loadType, tracks, playlistInfo } = resolve;

    if (loadType === "error") {
      return ctx.sendMessage({
        embeds: [
          {
            color: 0xff4757,
            title: "『 Audio System 』",
            description:
              "**Warning:** An anomaly occurred during track resolution, Master.",
          },
        ],
      });
    }

    if (loadType === "empty" || !tracks.length) {
      return ctx.sendMessage({
        embeds: [
          {
            color: 0xff4757,
            title: "『 Audio System 』",
            description:
              "**Notice:** No matching audio sources detected for your query, Master.",
          },
        ],
      });
    }

    if (loadType === "playlist") {
      for (const track of tracks) {
        track.info.requester = member;
        player.queue.add(track);
      }

      const embed = new EmbedBuilder()
        .setColor("#00CED1")
        .setTitle("『 Playlist Loaded 』")
        .setDescription(
          `**Confirmed.** Added **${tracks.length}** tracks from **${playlistInfo.name}** to the queue, Master.`,
        )
        .setFooter({ text: getRandomFooter() })
        .setTimestamp();

      await ctx.sendMessage({ embeds: [embed] });

      if (!player.playing && !player.paused) {
        const success = await safePlay(client, player);
        if (!success) {
          return ctx.sendMessage({
            embeds: [
              {
                color: 0xff4757,
                title: "『 Audio System 』",
                description:
                  "**Warning:** Failed to establish voice connection, Master. Please try again.",
              },
            ],
          });
        }
      }
    } else if (loadType === "search" || loadType === "track") {
      const track = tracks[0];
      track.info.requester = member;
      player.queue.add(track);

      // Format duration
      const formatDuration = (ms) => {
        const seconds = Math.floor((ms / 1000) % 60);
        const minutes = Math.floor((ms / (1000 * 60)) % 60);
        const hours = Math.floor(ms / (1000 * 60 * 60));

        if (hours > 0) {
          return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
        }
        return `${minutes}:${seconds.toString().padStart(2, "0")}`;
      };

      const embed = new EmbedBuilder()
        .setColor("#00CED1")
        .setTitle("『 Track Queued 』")
        .setDescription(
          `**Notice:** Audio source acquired and queued, Master.\n\n▸ [${track.info.title}](${track.info.uri})`,
        )
        .addFields(
          {
            name: "▸ Duration",
            value: formatDuration(track.info.length),
            inline: true,
          },
          {
            name: "▸ Artist",
            value: track.info.author || "Unknown",
            inline: true,
          },
          {
            name: "▸ Queue Position",
            value: `#${player.queue.length}`,
            inline: true,
          },
        )
        .setThumbnail(track.info.thumbnail || track.info.artworkUrl || null)
        .setFooter({ text: getRandomFooter() })
        .setTimestamp();

      await ctx.sendMessage({ embeds: [embed] });

      if (!player.playing && !player.paused) {
        const success = await safePlay(client, player);
        if (!success) {
          return ctx.sendMessage({
            embeds: [
              {
                color: 0xff4757,
                title: "『 Audio System 』",
                description:
                  "**Warning:** Failed to establish voice connection, Master. Please try again.",
              },
            ],
          });
        }
      }
    }
  }
}
