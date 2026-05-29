/**
 * NowPlaying Command
 * Display the currently playing track
 */

import Command from "../../structures/Command.js";
import { EmbedBuilder } from "discord.js";
import { getRandomFooter } from "../../utils/raphael.js";

export default class NowPlaying extends Command {
  constructor(client) {
    super(client, {
      name: "nowplaying",
      description: {
        content: "Display information about the currently playing track",
        usage: "",
        examples: ["nowplaying"],
      },
      aliases: ["np", "current"],
      category: "music",
      cooldown: 3,
      args: false,
      player: {
        voice: false,
        dj: false,
        active: true,
        djPerm: null,
      },
      permissions: {
        dev: false,
        client: ["SendMessages", "ViewChannel", "EmbedLinks"],
        user: [],
      },
      slashCommand: true,
      options: [],
    });
  }

  async run(client, ctx, args) {
    const player = client.moonlink?.players.get(ctx.guild.id);

    if (!player || !player.current) {
      return ctx.sendMessage({
        embeds: [
          {
            color: 0xff4757,
            description:
              "**Notice:** No audio track is currently playing, Master.",
          },
        ],
      });
    }

    const track = player.current;

    // Format duration
    const formatDuration = (ms) => {
      if (!ms || isNaN(ms)) return "Live";
      const seconds = Math.floor((ms / 1000) % 60);
      const minutes = Math.floor((ms / (1000 * 60)) % 60);
      const hours = Math.floor(ms / (1000 * 60 * 60));

      if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
      }
      return `${minutes}:${seconds.toString().padStart(2, "0")}`;
    };

    // Create progress bar
    const createProgressBar = (current, total, length = 15) => {
      if (!total || isNaN(total)) return "▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬ [LIVE]";

      const progress = Math.round((current / total) * length);
      const empty = length - progress;

      return (
        "▬".repeat(Math.max(0, progress)) +
        "🔘" +
        "▬".repeat(Math.max(0, empty - 1))
      );
    };

    const position = player.position || 0;
    const duration = track.duration || 0;
    const progressBar = createProgressBar(position, duration);

    const embed = new EmbedBuilder()
      .setColor("#00CED1")
      .setAuthor({ name: "『 Audio Playback 』" })
      .setTitle(track.title)
      .setURL(track.uri)
      .setThumbnail(track.thumbnail || null)
      .setDescription(
        `**Notice:** Currently processing audio stream, Master.\n\n${progressBar}\n\`${formatDuration(position)} / ${formatDuration(duration)}\``,
      )
      .addFields(
        { name: "▸ Artist", value: track.author || "Unknown", inline: true },
        {
          name: "▸ Requested By",
          value: track.requester?.toString() || "Unknown",
          inline: true,
        },
        { name: "▸ Volume", value: `${player.volume}%`, inline: true },
      );

    // Add loop status if enabled
    if (player.loop && player.loop !== "none" && player.loop !== "off") {
      embed.addFields({
        name: "▸ Loop Mode",
        value: player.loop === "track" ? "◉ Track Repeat" : "◉ Queue Repeat",
        inline: true,
      });
    }

    // Add queue info
    if (player.queue.size > 0) {
      embed.addFields({
        name: "▸ Queue Status",
        value: `${player.queue.size} track${player.queue.size !== 1 ? "s" : ""} pending`,
        inline: true,
      });
    }

    embed.setFooter({ text: getRandomFooter() });
    embed.setTimestamp();

    return ctx.sendMessage({ embeds: [embed] });
  }
}
