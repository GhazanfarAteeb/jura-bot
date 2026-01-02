/**
 * Skip To Command
 * Skip to a specific track in the queue
 */

import Command from '../../structures/Command.js';

export default class SkipTo extends Command {
  constructor(client) {
    super(client, {
      name: 'skipto',
      description: {
        content: 'Skip to a specific track in the queue',
        usage: '<position>',
        examples: ['skipto 5', 'skipto 2']
      },
      aliases: ['jump'],
      category: 'music',
      cooldown: 3,
      args: true,
      player: {
        voice: true,
        dj: false,
        active: true,
        djPerm: null
      },
      permissions: {
        dev: false,
        client: ['SendMessages', 'ViewChannel', 'EmbedLinks'],
        user: []
      },
      slashCommand: true,
      options: [
        {
          name: 'position',
          description: 'The position of the track to skip to',
          type: 4, // INTEGER
          required: true,
          min_value: 1
        }
      ]
    });
  }

  async run(client, ctx, args) {
    const player = client.riffy?.players.get(ctx.guild.id);

    if (!player) {
      return ctx.sendMessage({
        embeds: [{
          color: 0xff4757,
          description: '**Warning:** No active audio session detected, Master.'
        }]
      });
    }

    if (player.queue.length === 0) {
      return ctx.sendMessage({
        embeds: [{
          color: 0xffd700,
          description: '**Notice:** The queue is currently empty, Master.'
        }]
      });
    }

    const position = parseInt(args[0]);

    if (isNaN(position)) {
      return ctx.sendMessage({
        embeds: [{
          color: 0xff4757,
          description: '**Error:** Please provide a valid position number, Master.'
        }]
      });
    }

    if (position < 1 || position > player.queue.length) {
      return ctx.sendMessage({
        embeds: [{
          color: 0xff4757,
          description: `**Error:** Invalid position. Queue contains ${player.queue.length} track${player.queue.length !== 1 ? 's' : ''}, Master.`
        }]
      });
    }

    // Remove tracks before the target position
    const skipped = player.queue.splice(0, position - 1);
    const targetTrack = player.queue[0];

    // Stop current track to trigger next track
    player.stop();

    return ctx.sendMessage({
      embeds: [{
        color: 0x00ced1,
        description: `**Confirmed:** Bypassed **${skipped.length}** track${skipped.length !== 1 ? 's' : ''}. Now playing **${targetTrack.info.title}**, Master.`
      }]
    });
  }
}
