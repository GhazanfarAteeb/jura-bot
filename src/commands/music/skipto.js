/**
 * Skip To Command
 * Skip to a specific track in the queue
 */

import Command from "../../structures/Command.js";

export default class SkipTo extends Command {
  constructor(client) {
    super(client, {
      name: "skipto",
      description: {
        content: "Skip to a specific track in the queue",
        usage: "<position>",
        examples: ["skipto 5", "skipto 2"],
      },
      aliases: ["jump"],
      category: "music",
      cooldown: 3,
      args: true,
      player: {
        voice: true,
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
      options: [
        {
          name: "position",
          description: "The position of the track to skip to",
          type: 4, // INTEGER
          required: true,
          min_value: 1,
        },
      ],
    });
  }

  async run(client, ctx, args) {
    const player = client.moonlink?.players.get(ctx.guild.id);

    if (!player) {
      return ctx.sendMessage({
        embeds: [
          {
            color: 0xff4757,
            description:
              "**Warning:** No active audio session detected, Master.",
          },
        ],
      });
    }

    if (player.queue.isEmpty) {
      return ctx.sendMessage({
        embeds: [
          {
            color: 0xffd700,
            description: "**Notice:** The queue is currently empty, Master.",
          },
        ],
      });
    }

    const position = parseInt(args[0]);

    if (isNaN(position)) {
      return ctx.sendMessage({
        embeds: [
          {
            color: 0xff4757,
            description:
              "**Error:** Please provide a valid position number, Master.",
          },
        ],
      });
    }

    if (position < 1 || position > player.queue.size) {
      return ctx.sendMessage({
        embeds: [
          {
            color: 0xff4757,
            description: `**Error:** Invalid position. Queue contains ${player.queue.size} track${player.queue.size !== 1 ? "s" : ""}, Master.`,
          },
        ],
      });
    }

    // skip(position) removes the track at that queue index (0-based) and plays it
    const targetTrack = player.queue.get(position - 1);
    await player.skip(position - 1);

    return ctx.sendMessage({
      embeds: [
        {
          color: 0x00ced1,
          description: `**Confirmed:** Skipped to **${targetTrack?.title || "track"}** at position **#${position}**, Master.`,
        },
      ],
    });
  }
}
