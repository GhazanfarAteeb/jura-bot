/**
 * Play Command
 * Play a track or add to queue
 */

import Command from "../../structures/Command.js";
import { EmbedBuilder } from "discord.js";
import { getRandomFooter } from "../../utils/raphael.js";

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

    // Check if moonlink is initialized
    if (!client.moonlink) {
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

    // Create or retrieve player
    let player = client.moonlink.players.get(ctx.guild.id);
    if (!player) {
      player = client.moonlink.players.create({
        guildId: ctx.guild.id,
        voiceChannelId: voiceChannel.id,
        textChannelId: ctx.channel.id,
        selfDeaf: true,
      });
    }

    // Connect if not already connected
    if (!player.connected) {
      await player.connect();
    }

    // Search / resolve the query
    const result = await client.moonlink.search({ query, requester: member });

    if (result.isError) {
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

    if (result.isEmpty) {
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

    // Format duration helper
    const formatDuration = (ms) => {
      const seconds = Math.floor((ms / 1000) % 60);
      const minutes = Math.floor((ms / (1000 * 60)) % 60);
      const hours = Math.floor(ms / (1000 * 60 * 60));

      if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
      }
      return `${minutes}:${seconds.toString().padStart(2, "0")}`;
    };

    if (result.isPlaylist) {
      player.queue.add(result.tracks);

      const embed = new EmbedBuilder()
        .setColor("#00CED1")
        .setTitle("『 Playlist Loaded 』")
        .setDescription(
          `**Confirmed.** Added **${result.tracks.length}** tracks from **${result.playlistInfo.name}** to the queue, Master.`,
        )
        .setFooter({ text: getRandomFooter() })
        .setTimestamp();

      await ctx.sendMessage({ embeds: [embed] });
    } else {
      const track = result.tracks[0];
      player.queue.add(track);

      const embed = new EmbedBuilder()
        .setColor("#00CED1")
        .setTitle("『 Track Queued 』")
        .setDescription(
          `**Notice:** Audio source acquired and queued, Master.\n\n▸ [${track.title}](${track.uri})`,
        )
        .addFields(
          {
            name: "▸ Duration",
            value: formatDuration(track.duration),
            inline: true,
          },
          {
            name: "▸ Artist",
            value: track.author || "Unknown",
            inline: true,
          },
          {
            name: "▸ Queue Position",
            value: `#${player.queue.size}`,
            inline: true,
          },
        )
        .setThumbnail(track.thumbnail || null)
        .setFooter({ text: getRandomFooter() })
        .setTimestamp();

      await ctx.sendMessage({ embeds: [embed] });
    }

    if (!player.playing && !player.paused) {
      await player.play();
    }
  }
}
